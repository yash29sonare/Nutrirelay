// ═══════════════════════════════════════════════════════════════════════════════
// DEPRECATED — DO NOT USE
//
// This webhook endpoint is permanently disabled. All WhatsApp inbound messages
// MUST go through /api/webhook/whatsapp (PGMQ queue).
//
// Pipeline: webhook → pgmq_send → queueConsumer → whatsappPipeline
//
// Both GET and POST return HTTP 410 Gone. Anyone hitting this URL has
// configured the wrong webhook URL in Meta Cloud API dashboard.
// ═══════════════════════════════════════════════════════════════════════════════

export const dynamic = "force-dynamic";

const DEPRECATED_MESSAGE =
  "This webhook endpoint is deprecated. " +
  "All WhatsApp inbound messages must use /api/webhook/whatsapp.";

const ACTIVE_ENDPOINT = "/api/webhook/whatsapp";

function build410Response(): Response {
  return new Response(
    JSON.stringify({
      error: "DEPRECATED",
      message: DEPRECATED_MESSAGE,
      active_endpoint: ACTIVE_ENDPOINT,
    }),
    {
      status: 410,
      headers: {
        "Content-Type": "application/json",
        Deprecation: "true",
        "X-Deprecated-Reason": "Use /api/webhook/whatsapp instead",
      },
    }
  );
}

export async function GET(): Promise<Response> {
  console.warn(
    "[CRITICAL VIOLATION] Deprecated webhook called: GET /api/webhooks/whatsapp. " +
    "All WhatsApp messages must use /api/webhook/whatsapp."
  );
  return build410Response();
}

export async function POST(): Promise<Response> {
  console.warn(
    "[CRITICAL VIOLATION] Deprecated webhook called: POST /api/webhooks/whatsapp. " +
    "All WhatsApp messages must use /api/webhook/whatsapp. Message rejected."
  );
  return build410Response();
}
