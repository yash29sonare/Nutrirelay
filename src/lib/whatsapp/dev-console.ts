import { getWhatsAppServiceDb, normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db";
import { getClientAutomationState } from "@/lib/whatsapp/automation-state";
import type { MetaWebhookPayload } from "@/lib/whatsapp/meta-types";

export interface WhatsAppDevClientOption {
  clientId: string;
  label: string;
  phoneNumber: string | null;
}

export interface WhatsAppClientOperationalSummary {
  clientId: string;
  label: string;
  phoneNumber: string | null;
  automationState: string;
  latestInbound: string | null;
  latestMedia: string | null;
  latestVoiceNote: string | null;
  latestStructuredResponse: string | null;
  latestDietLog: string | null;
  latestFailure: string | null;
}

export interface WhatsAppConnectionReadiness {
  hasVerifyToken: boolean;
  hasAppSecret: boolean;
  hasSupabaseUrl: boolean;
  hasServiceRoleKey: boolean;
  credentialRow: {
    phone_number_id: string;
    waba_id: string | null;
    business_account_id: string | null;
    phone_number: string | null;
    status: string;
    updated_at: string;
  } | null;
}

export interface WhatsAppEventSummary {
  receivedAt: string;
  wamId: string | null;
  clientPhone: string | null;
  eventType: string;
  summary: string;
}

export interface WhatsAppOutboundSummary {
  sentAt: string;
  wamId: string | null;
  deliveryStatus: string | null;
  messageType: string;
  clientId: string;
  summary: string;
}

export interface WhatsAppStatusSummary {
  receivedAt: string;
  wamId: string;
  status: string;
  recipientId: string | null;
}

export interface WhatsAppDevConsoleData {
  readiness: WhatsAppConnectionReadiness;
  clients: WhatsAppDevClientOption[];
  clientSummaries: WhatsAppClientOperationalSummary[];
  lastInbound: WhatsAppEventSummary | null;
  lastOutbound: WhatsAppOutboundSummary | null;
  lastWebhookEvent: WhatsAppEventSummary | null;
  lastStatus: WhatsAppStatusSummary | null;
}

interface CredentialRow {
  phone_number_id: string;
  waba_id: string | null;
  business_account_id: string | null;
  phone_number: string | null;
  status: string;
  updated_at: string;
}

interface WebhookEventRow {
  received_at: string;
  wam_id: string | null;
  client_phone: string | null;
  event_type: string;
  payload: MetaWebhookPayload;
}

interface OutboundRow {
  message_timestamp: string;
  wam_id: string | null;
  delivery_status: string | null;
  message_type: string;
  client_id: string;
  metadata: Record<string, unknown> | null;
}

interface StatusRow {
  received_at: string;
  wam_id: string;
  status: string;
  recipient_id: string | null;
}

interface CommunicationSummaryRow {
  message_timestamp: string;
  message_type: string;
  metadata: Record<string, unknown> | null;
}

interface FoodLogSummaryRow {
  logged_at: string;
  notes: string | null;
  image_path: string | null;
}

interface VoiceNoteSummaryRow {
  created_at: string;
  processing_status: string;
  transcript: string | null;
}

function summarizeInboundPayload(payload: MetaWebhookPayload): string {
  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return "No message payload";

  if (message.type === "text") {
    return message.text?.body ?? "Text message";
  }

  if (message.type === "interactive") {
    return message.interactive?.button_reply?.title
      ?? message.interactive?.button_reply?.id
      ?? "Interactive reply";
  }

  if (message.type === "image") {
    return message.image?.caption ?? "Image message";
  }

  if (message.type === "audio") {
    return "Audio message";
  }

  return `${message.type ?? "unknown"} message`;
}

function summarizeWebhookPayload(payload: MetaWebhookPayload): string {
  const value = payload.entry?.[0]?.changes?.[0]?.value;
  const messageCount = Array.isArray(value?.messages) ? value.messages.length : 0;
  const statusCount = Array.isArray(value?.statuses) ? value.statuses.length : 0;

  if (messageCount > 0 && statusCount > 0) {
    return `${messageCount} message(s), ${statusCount} status update(s)`;
  }

  if (messageCount > 0) {
    return `${messageCount} message payload(s)`;
  }

  if (statusCount > 0) {
    return `${statusCount} status update(s)`;
  }

  return "Webhook payload received";
}

function summarizeCommunicationRow(row: CommunicationSummaryRow | null): string | null {
  if (!row) return null;

  const preview = typeof row.metadata?.["original_text"] === "string"
    ? row.metadata.original_text
    : typeof row.metadata?.["message_preview"] === "string"
      ? row.metadata.message_preview
      : typeof row.metadata?.["transcript"] === "string"
        ? row.metadata.transcript
        : null;

  const structuredResponse = row.metadata?.["structured_response"] as
    | { reply_label?: string | null; reply_id?: string | null }
    | null
    | undefined;

  if (structuredResponse?.reply_label) {
    return `${row.message_type} · ${structuredResponse.reply_label}`;
  }

  return preview ? `${row.message_type} · ${preview}` : row.message_type;
}

function summarizeFoodLogRow(row: FoodLogSummaryRow | null): string | null {
  if (!row) return null;
  const note = row.notes?.split("|")[0]?.trim() ?? "Meal log";
  return row.image_path ? `${note} · photo attached` : note;
}

function summarizeVoiceNoteRow(row: VoiceNoteSummaryRow | null): string | null {
  if (!row) return null;
  if (row.processing_status === "failed") {
    return "Failed transcription";
  }
  return row.transcript?.trim() ? `Transcript: ${row.transcript.trim()}` : "Voice note received";
}

export async function getWhatsAppDevConsoleData(authUserId: string): Promise<WhatsAppDevConsoleData> {
  const db = getWhatsAppServiceDb();

  const { data: trainerClients } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", authUserId)
    .eq("is_active", true);

  const clientIds = (trainerClients ?? []).map((row) => row.client_id);
  const { data: profiles } = clientIds.length === 0
    ? { data: [] as Array<{ id: string; full_name: string | null; phone_number: string | null }> }
    : await db
      .from("profiles")
      .select("id, full_name, phone_number")
      .in("id", clientIds);

  const clients = (profiles ?? [])
    .map((profile) => ({
      clientId: profile.id,
      label: profile.full_name?.trim() || `Client ${profile.id.slice(0, 8)}`,
      phoneNumber: normalizeWhatsAppPhone(profile.phone_number),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const clientSummaries: WhatsAppClientOperationalSummary[] = [];
  for (const client of clients) {
    const [{ data: inboundRow }, { data: mediaRow }, { data: structuredRow }, { data: foodRow }, { data: voiceRow }, { data: failureRow }] = await Promise.all([
      db
        .from("communication_logs")
        .select("message_timestamp, message_type, metadata")
        .eq("trainer_id", authUserId)
        .eq("client_id", client.clientId)
        .eq("direction", "INBOUND")
        .order("message_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("communication_logs")
        .select("message_timestamp, message_type, metadata")
        .eq("trainer_id", authUserId)
        .eq("client_id", client.clientId)
        .eq("direction", "INBOUND")
        .eq("message_type", "IMAGE")
        .order("message_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("communication_logs")
        .select("message_timestamp, message_type, metadata")
        .eq("trainer_id", authUserId)
        .eq("client_id", client.clientId)
        .eq("direction", "INBOUND")
        .eq("message_type", "POLL")
        .order("message_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("food_logs")
        .select("logged_at, notes, image_path")
        .eq("trainer_id", authUserId)
        .eq("client_id", client.clientId)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("voice_notes")
        .select("created_at, processing_status, transcript")
        .eq("client_id", client.clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("whatsapp_webhook_events")
        .select("processing_status")
        .eq("trainer_id", authUserId)
        .eq("client_phone", client.phoneNumber)
        .in("processing_status", ["failed_handled", "queue_error", "malformed_json", "signature_failed"])
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    clientSummaries.push({
      clientId: client.clientId,
      label: client.label,
      phoneNumber: client.phoneNumber,
      automationState: await getClientAutomationState(client.clientId),
      latestInbound: summarizeCommunicationRow((inboundRow as CommunicationSummaryRow | null) ?? null),
      latestMedia: summarizeCommunicationRow((mediaRow as CommunicationSummaryRow | null) ?? null),
      latestVoiceNote: summarizeVoiceNoteRow((voiceRow as VoiceNoteSummaryRow | null) ?? null),
      latestStructuredResponse: summarizeCommunicationRow((structuredRow as CommunicationSummaryRow | null) ?? null),
      latestDietLog: summarizeFoodLogRow((foodRow as FoodLogSummaryRow | null) ?? null),
      latestFailure: failureRow?.processing_status ?? null,
    });
  }

  const { data: credentialRow } = await db
    .from("trainer_waba_credentials")
    .select("phone_number_id, waba_id, business_account_id, phone_number, status, updated_at")
    .eq("trainer_id", authUserId)
    .limit(1)
    .maybeSingle();

  const { data: inboundEventRow } = await db
    .from("whatsapp_webhook_events")
    .select("received_at, wam_id, client_phone, event_type, payload")
    .eq("trainer_id", authUserId)
    .eq("event_category", "message")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: webhookEventRow } = await db
    .from("whatsapp_webhook_events")
    .select("received_at, wam_id, client_phone, event_type, payload")
    .eq("trainer_id", authUserId)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: outboundRow } = await db
    .from("communication_logs")
    .select("message_timestamp, wam_id, delivery_status, message_type, client_id, metadata")
    .eq("trainer_id", authUserId)
    .eq("direction", "OUTBOUND")
    .order("message_timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: statusRow } = await db
    .from("whatsapp_message_statuses")
    .select("received_at, wam_id, status, recipient_id")
    .eq("trainer_id", authUserId)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    readiness: {
      hasVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      hasAppSecret: Boolean(process.env.WHATSAPP_APP_SECRET),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      credentialRow: (credentialRow as CredentialRow | null) ?? null,
    },
    clients,
    clientSummaries,
    lastInbound: inboundEventRow
      ? {
        receivedAt: (inboundEventRow as WebhookEventRow).received_at,
        wamId: (inboundEventRow as WebhookEventRow).wam_id ?? null,
        clientPhone: (inboundEventRow as WebhookEventRow).client_phone ?? null,
        eventType: (inboundEventRow as WebhookEventRow).event_type ?? "unknown",
        summary: summarizeInboundPayload((inboundEventRow as WebhookEventRow).payload),
      }
      : null,
    lastOutbound: outboundRow
      ? {
        sentAt: (outboundRow as OutboundRow).message_timestamp,
        wamId: (outboundRow as OutboundRow).wam_id ?? null,
        deliveryStatus: (outboundRow as OutboundRow).delivery_status ?? null,
        messageType: (outboundRow as OutboundRow).message_type ?? "unknown",
        clientId: (outboundRow as OutboundRow).client_id,
        summary: JSON.stringify((outboundRow as OutboundRow).metadata ?? {}),
      }
      : null,
    lastWebhookEvent: webhookEventRow
      ? {
        receivedAt: (webhookEventRow as WebhookEventRow).received_at,
        wamId: (webhookEventRow as WebhookEventRow).wam_id ?? null,
        clientPhone: (webhookEventRow as WebhookEventRow).client_phone ?? null,
        eventType: (webhookEventRow as WebhookEventRow).event_type ?? "unknown",
        summary: summarizeWebhookPayload((webhookEventRow as WebhookEventRow).payload),
      }
      : null,
    lastStatus: statusRow
      ? {
        receivedAt: (statusRow as StatusRow).received_at,
        wamId: (statusRow as StatusRow).wam_id,
        status: (statusRow as StatusRow).status,
        recipientId: (statusRow as StatusRow).recipient_id ?? null,
      }
      : null,
  };
}
