import { getTrainerWaba } from "@/lib/waba/getTrainerWaba";
import { logCommunication } from "@/lib/communication-logger";
import { getWhatsAppServiceDb, normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db";

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

// ── 24h window helpers ────────────────────────────────────────────────────────

async function getLastInboundAt(normalizedPhone: string): Promise<string | null> {
  const supabase = getWhatsAppServiceDb();
  const [{ data: processedInbound }, { data: webhookInbound }] = await Promise.all([
    supabase
      .from("incoming_webhook_logs")
      .select("received_at")
      .eq("client_phone", normalizedPhone)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("whatsapp_webhook_events")
      .select("received_at")
      .eq("client_phone", normalizedPhone)
      .eq("event_category", "message")
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const timestamps = [
    (processedInbound as { received_at: string } | null)?.received_at ?? null,
    (webhookInbound as { received_at: string } | null)?.received_at ?? null,
  ].filter((value): value is string => Boolean(value));

  if (timestamps.length === 0) {
    return null;
  }

  return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function isWindowOpen(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  return Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000;
}

// ── Template registry ──────────────────────────────────────────────────────────

export type TemplateId =
  | "hello_world"
  | "meal_confirmation"
  | "missing_details_clarification"
  | "trainer_alert"
  | "renewal_reminder_soft"
  | "renewal_reminder_urgent";

export type TemplateParamMap = {
  hello_world: [];
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
  components?: TemplateComponent[];
}

function buildTemplatePayload<T extends TemplateId>(
  templateId: T,
  params: TemplateParamMap[T]
): TemplatePayload {
  if (templateId === "hello_world") {
    return {
      name: "hello_world",
      language: { code: "en_US" },
    };
  }

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

interface MetaInteractiveListMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "list";
    body: { text: string };
    action: {
      button: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

interface MetaSendResponse {
  messages?: Array<{ id?: string }>;
}

async function callMetaApi(
  trainerId: string,
  payload: MetaTextMessage | MetaTemplateMessage | MetaDocumentMessage | MetaInteractiveListMessage
): Promise<{ wamId: string | null }> {
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

  const json = (await res.json()) as MetaSendResponse;
  return { wamId: json.messages?.[0]?.id ?? null };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveClientIdFromPhone(phone: string): Promise<string | null> {
  const supabase = getWhatsAppServiceDb();
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone_number", normalized)
    .limit(1)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

async function logOutboundCommunicationByPhone(input: {
  trainerId: string;
  clientPhone: string;
  wamId: string | null;
  messageType: "TEXT" | "VOICE" | "IMAGE" | "POLL" | "TEMPLATE";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const clientId = await resolveClientIdFromPhone(input.clientPhone);
  if (!clientId) return;

  await logCommunication({
    trainer_id: input.trainerId,
    client_id: clientId,
    direction: "OUTBOUND",
    message_type: input.messageType,
    wam_id: input.wamId,
    delivery_status: "sent",
    metadata: input.metadata ?? {},
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function sendFreeMessage(
  trainerId: string,
  clientPhone: string,
  text: string
): Promise<{ wamId: string | null }> {
  const normalized = normalizeWhatsAppPhone(clientPhone);
  if (!normalized) {
    throw new Error("Client phone number is required");
  }
  const lastAt = await getLastInboundAt(normalized);

  if (!isWindowOpen(lastAt)) {
    throw new WindowClosedError(normalized);
  }

  const result = await callMetaApi(trainerId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalized,
    type: "text",
    text: { body: text, preview_url: false },
  });

  await logOutboundCommunicationByPhone({
    trainerId,
    clientPhone: normalized,
    wamId: result.wamId,
    messageType: "TEXT",
    metadata: { message_preview: text.slice(0, 280) },
  });

  return result;
}

export async function sendTemplateMessage<T extends TemplateId>(
  trainerId: string,
  clientPhone: string,
  templateId: T,
  params: TemplateParamMap[T]
): Promise<{ wamId: string | null }> {
  const normalized = normalizeWhatsAppPhone(clientPhone);
  if (!normalized) {
    throw new Error("Client phone number is required");
  }
  const template = buildTemplatePayload(templateId, params);

  const result = await callMetaApi(trainerId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalized,
    type: "template",
    template,
  });

  await logOutboundCommunicationByPhone({
    trainerId,
    clientPhone: normalized,
    wamId: result.wamId,
    messageType: "TEMPLATE",
    metadata: { template_id: templateId },
  });

  return result;
}

export async function sendDocumentMessage(
  trainerId: string,
  clientPhone: string,
  documentLink: string,
  filename: string,
  caption?: string
): Promise<{ wamId: string | null }> {
  const normalized = normalizeWhatsAppPhone(clientPhone);
  if (!normalized) {
    throw new Error("Client phone number is required");
  }

  const result = await callMetaApi(trainerId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalized,
    type: "document",
    document: { link: documentLink, filename, caption },
  });

  await logOutboundCommunicationByPhone({
    trainerId,
    clientPhone: normalized,
    wamId: result.wamId,
    messageType: "TEXT",
    metadata: { document_filename: filename, has_caption: !!caption },
  });

  return result;
}

export interface InteractiveListOption {
  id: string;
  title: string;
  description?: string;
}

export async function sendInteractiveListMessage(input: {
  trainerId: string;
  clientPhone: string;
  prompt: string;
  buttonText: string;
  sectionTitle: string;
  options: InteractiveListOption[];
}): Promise<{ wamId: string | null }> {
  const normalized = normalizeWhatsAppPhone(input.clientPhone);
  if (!normalized) {
    throw new Error("Client phone number is required");
  }

  const lastAt = await getLastInboundAt(normalized);
  if (!isWindowOpen(lastAt)) {
    throw new WindowClosedError(normalized);
  }

  if (input.options.length === 0 || input.options.length > 10) {
    throw new Error("Interactive list requires between 1 and 10 options");
  }

  const result = await callMetaApi(input.trainerId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalized,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: input.prompt },
      action: {
        button: input.buttonText,
        sections: [
          {
            title: input.sectionTitle,
            rows: input.options.map((option) => ({
              id: option.id,
              title: option.title,
              description: option.description,
            })),
          },
        ],
      },
    },
  });

  await logOutboundCommunicationByPhone({
    trainerId: input.trainerId,
    clientPhone: normalized,
    wamId: result.wamId,
    messageType: "POLL",
    metadata: {
      interactive_kind: "list",
      prompt: input.prompt,
      options: input.options,
    },
  });

  return result;
}

export async function sendMessage(
  trainerId: string,
  clientPhone: string,
  text: string,
  fallbackTemplateId: TemplateId,
  fallbackParams: TemplateParamMap[TemplateId]
): Promise<void> {
  const normalized = normalizeWhatsAppPhone(clientPhone);
  if (!normalized) {
    throw new Error("Client phone number is required");
  }
  const lastAt = await getLastInboundAt(normalized);

  if (isWindowOpen(lastAt)) {
    await sendFreeMessage(trainerId, normalized, text);
  } else {
    await sendTemplateMessage(
      trainerId,
      normalized,
      fallbackTemplateId,
      fallbackParams as TemplateParamMap[typeof fallbackTemplateId]
    );
  }
}
