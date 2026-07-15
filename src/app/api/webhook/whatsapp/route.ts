import { createClient } from "@supabase/supabase-js";
import "@/mastra/index";
import { handleVerificationChallenge, parseInboundMessage } from "@/shared/utils/whatsapp";
import { verifySignature } from "@/lib/whatsapp/verify-signature";
import { createWebhookEventRecord, updateWebhookEventRecord } from "@/lib/whatsapp/webhook-events";
import { persistWhatsAppStatuses } from "@/lib/whatsapp/status-persistence";
import type { MetaWebhookPayload } from "@/lib/whatsapp/meta-types";

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

  let webhookEvent: Awaited<ReturnType<typeof createWebhookEventRecord>> | null = null;
  try {
    // ── 1. HMAC signature verification ─────────────────────────────────────
    // Reject unauthenticated production traffic before parsing or persisting it.
    console.log("[TRACE] webhook received");
    if (process.env.NODE_ENV !== "production") {
      console.log("[TRACE] webhook signature skipped");
    } else {
      if (!process.env.WHATSAPP_APP_SECRET) {
        console.error("[ALERT] WHATSAPP_APP_SECRET is not set");
        return new Response("Server misconfiguration", { status: 500 });
      }

      const signature = req.headers.get("x-hub-signature-256");
      if (!verifySignature(rawBody, signature)) {
        console.error("[ALERT] webhook signature validation failed");
        return new Response("Unauthorized", { status: 401 });
      }
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = {
        parse_error: "malformed_json",
        raw_body: rawBody,
      };
    }

    webhookEvent = await createWebhookEventRecord(body);

    await updateWebhookEventRecord(webhookEvent.id, {
      signatureValidation: process.env.NODE_ENV === "production" ? "passed" : "skipped",
    });

    // ── 2. Malformed JSON handling ──────────────────────────────────────────
    if ((body as { parse_error?: string })?.parse_error === "malformed_json") {
      await updateWebhookEventRecord(webhookEvent.id, {
        processingStatus: "malformed_json",
        processingMetadata: {
          raw_body_present: true,
        },
      });
      console.warn("[ALERT] malformed JSON payload, acking to stop retries");
      return new Response("OK", { status: 200 });
    }

    // ── 3. Status update filter — skip delivery receipts ───────────────────
    const firstValue = (body as MetaWebhookPayload).entry?.[0]?.changes?.[0]?.value;
    const hasStatuses = Array.isArray(firstValue?.statuses) && firstValue.statuses.length > 0;
    const hasMessages = Array.isArray(firstValue?.messages) && firstValue.messages.length > 0;
    const statusResult = hasStatuses
      ? await persistWhatsAppStatuses(body)
      : { count: 0, latestStatus: null };

    if (hasStatuses && !hasMessages) {
      // Delivery confirmation packet — no message to process
      await updateWebhookEventRecord(webhookEvent.id, {
        processingStatus: "status_recorded",
        processingMetadata: {
          status_count: statusResult.count,
          latest_status: statusResult.latestStatus,
          message_count: 0,
        },
      });
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
      await updateWebhookEventRecord(webhookEvent.id, {
        processingStatus: "ignored",
        processingMetadata: {
          status_count: statusResult.count,
          latest_status: statusResult.latestStatus,
          message_count: hasMessages ? 1 : 0,
        },
      });
      return new Response("OK", { status: 200 });
    }

    // ── 5. Build queue envelope ─────────────────────────────────────────────
    const envelope = {
      wam_id: parsed.whatsapp_message_id,
      receiver_phone_number_id: firstValue?.metadata?.phone_number_id ?? null,
      client_phone: parsed.from,
      message_timestamp: parsed.timestamp,
      message_type: parsed.type,
      message_text:
        parsed.type === "text"
          ? parsed.text
          : parsed.type === "image"
            ? parsed.caption ?? null
          : parsed.type === "interactive"
            ? parsed.button_reply_title
            : null,
      media_id:
        parsed.type === "audio" || parsed.type === "image"
          ? parsed.media_id
          : null,
      button_reply_id:
        parsed.type === "interactive" ? parsed.button_reply_id : null,
      reply_kind:
        parsed.type === "interactive" ? parsed.reply_kind : null,
      context_wam_id:
        firstValue?.messages?.[0]?.context?.id ?? null,
      raw_entry: (body as MetaWebhookPayload).entry?.[0] ?? null,
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
      await updateWebhookEventRecord(webhookEvent.id, {
        processingStatus: "queue_error",
        processingMetadata: {
          status_count: statusResult.count,
          latest_status: statusResult.latestStatus,
          queue_name: "whatsapp_incoming_queue",
          queue_error: queueError.message,
        },
      });
      return new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain" } });
    }

    console.log("[EVENT] outcome=ingestion wam_id:", envelope.wam_id);
    await updateWebhookEventRecord(webhookEvent.id, {
      processingStatus: "queued",
      processingMetadata: {
        status_count: statusResult.count,
        latest_status: statusResult.latestStatus,
        queue_name: "whatsapp_incoming_queue",
        wam_id: envelope.wam_id,
        receiver_phone_number_id: envelope.receiver_phone_number_id,
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    // Catch-all — never let an unhandled exception return a 5xx to Meta
    console.error("[ALERT] unhandled error:", (err as Error).message);
    if (webhookEvent) {
      await updateWebhookEventRecord(webhookEvent.id, {
        processingStatus: "accepted",
        processingMetadata: {
          error: (err as Error).message,
        },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }
}
