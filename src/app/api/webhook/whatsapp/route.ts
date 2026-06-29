import { createClient } from "@supabase/supabase-js";
import { handleVerificationChallenge, parseInboundMessage } from "@/shared/utils/whatsapp";
import { verifySignature } from "@/lib/whatsapp/verify-signature";

// Bypass Next.js static optimisation — this route must always run dynamically
export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── GET — Meta webhook verification handshake ─────────────────────────────────
export async function GET(req: Request): Promise<Response> {
  if (!process.env.WHATSAPP_VERIFY_TOKEN) {
    console.error("[ALERT] WHATSAPP_VERIFY_TOKEN is not set");
    return new Response("Server misconfiguration", { status: 500 });
  }

  const url = new URL(req.url);
  const challenge = handleVerificationChallenge(url.searchParams);

  if (!challenge) {
    return new Response("Forbidden", { status: 403 });
  }

  // Meta requires the raw challenge string — not JSON-wrapped
  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// ── POST — Inbound message producer ───────────────────────────────────────────
export async function POST(req: Request): Promise<Response> {
  // Read body once — stream can only be consumed a single time in Next.js
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("[ALERT] failed to read request body:", (err as Error).message);
    return new Response("OK", { status: 200 });
  }

  try {
    // ── 1. HMAC signature verification ─────────────────────────────────────
    console.log("[TRACE] webhook received");
    if (process.env.NODE_ENV !== "production") {
      console.log("[TRACE] webhook signature skipped");
    } else {
      const signature = req.headers.get("x-hub-signature-256");
      if (!verifySignature(rawBody, signature)) {
        console.error(
          "[ALERT] signature failure — header:",
          signature ?? "[missing]"
        );
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // ── 2. Parse JSON payload ───────────────────────────────────────────────
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      // Malformed JSON — ack to Meta to stop retries
      console.warn("[ALERT] malformed JSON payload, acking to stop retries");
      return new Response("OK", { status: 200 });
    }

    // ── 3. Status update filter — skip delivery receipts ───────────────────
    const firstValue = (body as any)?.entry?.[0]?.changes?.[0]?.value;
    const hasStatuses = Array.isArray(firstValue?.statuses) && firstValue.statuses.length > 0;
    const hasMessages = Array.isArray(firstValue?.messages) && firstValue.messages.length > 0;

    if (hasStatuses && !hasMessages) {
      // Delivery confirmation packet — no message to process
      return new Response("OK", { status: 200 });
    }

    // ── 4. Parse typed message ──────────────────────────────────────────────
    const parsed = parseInboundMessage(body);

    console.log("[TRACE]", JSON.stringify(body, null, 2));

    if (process.env.NODE_ENV !== "production") {
      console.log("[TRACE] parsed result:", parsed);

      if (!parsed) {
        console.log("[TRACE] DROP: parseInboundMessage returned null (message ignored)");
      }
    }

    if (!parsed) {
      // Unrecognised message type — ack to prevent retry storm
      if (process.env.NODE_ENV !== "production") {
        console.log("[TRACE] EARLY EXIT: message ignored before queueing");
      }
      return new Response("OK", { status: 200 });
    }

    // ── 5. Build queue envelope ─────────────────────────────────────────────
    const envelope = {
      wam_id: parsed.whatsapp_message_id,
      client_phone: parsed.from,
      message_timestamp: parsed.timestamp,
      message_type: parsed.type,
      message_text:
        parsed.type === "text"
          ? parsed.text
          : parsed.type === "interactive"
            ? parsed.button_reply_title
            : null,
      media_id:
        parsed.type === "audio" || parsed.type === "image"
          ? parsed.media_id
          : null,
      button_reply_id:
        parsed.type === "interactive" ? parsed.button_reply_id : null,
      raw_entry: (body as any)?.entry?.[0] ?? null,
      enqueued_at: new Date().toISOString(),
    };

    // ── 6. Enqueue via pgmq_public.send ────────────────────────────────────
    const supabase = getServiceClient();
    const { error: queueError } = await supabase.rpc("pgmq_send", {
      queue_name: "whatsapp_incoming_queue",
      message: envelope,
    });

    if (queueError) {
      console.error("[ALERT] wam_id:", envelope.wam_id, "reason: pgmq_send_failed", queueError.message);
      return new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain" } });
    }

    console.log("[EVENT] outcome=ingestion wam_id:", envelope.wam_id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    // Catch-all — never let an unhandled exception return a 5xx to Meta
    console.error("[ALERT] unhandled error:", (err as Error).message);
    return new Response(JSON.stringify({ ok: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }
}
