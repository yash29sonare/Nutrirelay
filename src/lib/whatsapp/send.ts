import { createClient } from "@supabase/supabase-js";
import { getTrainerWaba } from "@/lib/waba/getTrainerWaba";

// ── Custom errors ──────────────────────────────────────────────────────────────

export class WindowClosedError extends Error {
  constructor(phone: string) {
    super(
      `WhatsApp 24h session window is closed for ${phone}. Use sendTemplateMessage instead.`
    );
    this.name = "WindowClosedError";
  }
}

export class WhatsAppDeliveryError extends Error {
  constructor(status: number, detail: string) {
    super(`Meta Graph API error ${status}: ${detail}`);
    this.name = "WhatsAppDeliveryError";
  }
}

// ── Service-role client (server-only) ─────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Phone normalization ────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("0") ? digits.slice(1) : digits;
}

// ── 24h window helpers ────────────────────────────────────────────────────────

async function getLastInboundAt(normalizedPhone: string): Promise<string | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("incoming_webhook_logs")
    .select("received_at")
    .eq("client_phone", normalizedPhone)
    .order("received_at", { ascending: false })
    .limit(1)
    .single();

  return (data as { received_at: string } | null)?.received_at ?? null;
}

function isWindowOpen(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}

// ── Template registry ──────────────────────────────────────────────────────────

export type TemplateId =
  | "meal_confirmation"
  | "missing_details_clarification"
  | "trainer_alert"
  | "renewal_reminder_soft"
  | "renewal_reminder_urgent";

type TemplateParamMap = {
  meal_confirmation: [clientName: string, mealName: string, calories: string];
  missing_details_clarification: [clientName: string];
  trainer_alert: [clientName: string, alertDetail: string];
  renewal_reminder_soft: [clientName: string, expiryDate: string];
  renewal_reminder_urgent: [clientName: string];
};

interface TemplateComponent {
  type: "body" | "header";
  parameters: Array<{ type: "text"; text: string }>;
}

interface TemplatePayload {
  name: string;
  language: { code: string };
  components: TemplateComponent[];
}

function buildTemplatePayload<T extends TemplateId>(
  templateId: T,
  params: TemplateParamMap[T]
): TemplatePayload {
  const bodyParams = (params as unknown[]).map((p) => ({
    type: "text" as const,
    text: String(p),
  }));

  return {
    name: templateId,
    language: { code: "en" },
    components: [{ type: "body", parameters: bodyParams }],
  };
}

// ── Meta Graph API transport ───────────────────────────────────────────────────

interface MetaTextMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text";
  text: { body: string; preview_url: boolean };
}

interface MetaTemplateMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "template";
  template: TemplatePayload;
}

interface MetaDocumentMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "document";
  document: { link: string; filename: string; caption?: string };
}

async function callMetaApi(
  trainerId: string,
  payload: MetaTextMessage | MetaTemplateMessage | MetaDocumentMessage
): Promise<void> {
  const { phoneNumberId, accessToken } = await getTrainerWaba(trainerId);

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      detail = JSON.stringify(errBody);
    } catch {
      // ignore parse failure — use status code only
    }
    console.error("[send] Meta Graph API delivery failure:", detail);
    throw new WhatsAppDeliveryError(res.status, detail);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function sendFreeMessage(
  trainerId: string,
  clientPhone: string,
  text: string
): Promise<void> {
  const normalized = normalizePhone(clientPhone);
  const lastAt = await getLastInboundAt(normalized);

  if (!isWindowOpen(lastAt)) {
    throw new WindowClosedError(normalized);
  }

  await callMetaApi(trainerId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalized,
    type: "text",
    text: { body: text, preview_url: false },
  });
}

export async function sendTemplateMessage<T extends TemplateId>(
  trainerId: string,
  clientPhone: string,
  templateId: T,
  params: TemplateParamMap[T]
): Promise<void> {
  const normalized = normalizePhone(clientPhone);
  const template = buildTemplatePayload(templateId, params);

  await callMetaApi(trainerId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalized,
    type: "template",
    template,
  });
}

export async function sendDocumentMessage(
  trainerId: string,
  clientPhone: string,
  documentLink: string,
  filename: string,
  caption?: string
): Promise<void> {
  const normalized = normalizePhone(clientPhone);

  await callMetaApi(trainerId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalized,
    type: "document",
    document: { link: documentLink, filename, caption },
  });
}

export async function sendMessage(
  trainerId: string,
  clientPhone: string,
  text: string,
  fallbackTemplateId: TemplateId,
  fallbackParams: TemplateParamMap[TemplateId]
): Promise<void> {
  const normalized = normalizePhone(clientPhone);
  const lastAt = await getLastInboundAt(normalized);

  if (isWindowOpen(lastAt)) {
    await callMetaApi(trainerId, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalized,
      type: "text",
      text: { body: text, preview_url: false },
    });
  } else {
    await sendTemplateMessage(
      trainerId,
      normalized,
      fallbackTemplateId,
      fallbackParams as TemplateParamMap[typeof fallbackTemplateId]
    );
  }
}
