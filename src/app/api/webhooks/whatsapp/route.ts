import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { handleVerificationChallenge } from "@/shared/utils/whatsapp";
import { verifySignature } from "@/lib/whatsapp/verify-signature";
import { getMastra } from "@/mastra/index";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const globalForAdmin = globalThis as unknown as {
  supabaseAdmin: SupabaseClient | undefined;
};

function getAdminClient(): SupabaseClient {
  if (!globalForAdmin.supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("[webhooks/whatsapp] Supabase env vars not set");
    globalForAdmin.supabaseAdmin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return globalForAdmin.supabaseAdmin;
}

// ── GET — Meta webhook verification handshake ─────────────────────────────────
export async function GET(request: NextRequest): Promise<NextResponse> {
  const challenge = handleVerificationChallenge(request.nextUrl.searchParams);
  if (!challenge) return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// ── POST — High-speed producer: verify → log → trigger ────────────────────────
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Read raw body once — stream is single-use
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 2. HMAC-SHA256 signature guard
  const signatureHeader = request.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signatureHeader)) {
    console.error("[webhooks/whatsapp] signature failure —", signatureHeader ?? "[missing]");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 3. Parse JSON — ack malformed payloads to stop Meta retry storm
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 4. Extract message fields via safe optional chaining
  const value = (payload as any)?.entry?.[0]?.changes?.[0]?.value ?? null;
  const firstMessage = value?.messages?.[0] ?? null;
  const firstStatus = value?.statuses?.[0] ?? null;

  // Status-only packet (delivery/read receipt) — ack immediately, no processing
  if (firstStatus && !firstMessage) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // No actionable message — ack and exit
  if (!firstMessage) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const wamid: string = String(firstMessage.id ?? "");
  const msgType: string = String(firstMessage.type ?? "text");
  const msgFrom: string = String(firstMessage.from ?? "");
  const msgTextBody: string = String(firstMessage.text?.body ?? "");
  const msgMediaId: string | undefined =
    firstMessage.audio?.id ?? firstMessage.image?.id ?? undefined;

  if (!wamid || !msgFrom) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 5. Idempotent log insert + async Trigger.dev dispatch — fire and forget DB work
  //    but AWAIT the tasks.trigger() call so the event reaches the gateway before
  //    the serverless thread freezes.
  try {
    const db = getAdminClient();

    // Resolve client from phone suffix (Meta sends E.164 without +)
    const last10 = msgFrom.replace(/\D/g, "").slice(-10);
    const { data: profileRow } = await db
      .from("profiles")
      .select("id")
      .ilike("phone_number", `%${last10}`)
      .limit(1)
      .single();

    const clientId: string | null = (profileRow as { id: string } | null)?.id ?? null;

    // Idempotent log — UNIQUE(wam_id) collision silently ignored
    await db.from("incoming_webhook_logs").upsert(
      { wam_id: wamid, client_id: clientId, message_type: msgType, status: "queued" },
      { onConflict: "wam_id", ignoreDuplicates: true }
    );

    // Dispatch to Trigger.dev media consumer for audio, or directly to
    // inboundMessageRouterWorkflow for all other message types.
    if (msgType === "audio" && msgMediaId) {
      const { tasks } = await import("@trigger.dev/sdk");
      await tasks.trigger(
        "media-consumer",
        { wamid, mediaId: msgMediaId, mimeType: "audio/ogg", clientId: clientId ?? "", senderId: msgFrom },
        { idempotencyKey: wamid }
      );
    } else {
      // Map Meta message type to the workflow's enum
      const messageType: "text" | "audio" | "interactive" =
        msgType === "interactive" ? "interactive" : "text";

      const mastra = await getMastra();
      const workflow = (mastra as any).getWorkflow("inboundMessageRouterWorkflow");
      const run = await workflow.createRun();
      await run.start({
        inputData: {
          queueMessageId: wamid,
          payload: {
            messageType,
            messageBody: msgTextBody,
            senderId:    msgFrom,
            ...(msgMediaId !== undefined && { mediaId: msgMediaId }),
          },
        },
      });
    }
  } catch (err) {
    // Never let internal errors surface a 5xx to Meta — log and ack
    console.error("[webhooks/whatsapp] dispatch error for wamid", wamid, (err as Error).message);
  }

  // 6. Instant 200 — Meta's 3-second window is respected
  return NextResponse.json(
    { queued: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    }
  );
}
