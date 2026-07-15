import { getWhatsAppServiceDb, normalizeWhatsAppPhone, normalizeWhatsAppPhoneNumberId, resolveInboundWhatsAppTenant } from "@/lib/whatsapp/service-db";
import type { MetaWebhookPayload } from "@/lib/whatsapp/meta-types";

type SignatureValidation = "skipped" | "passed" | "failed";
type ProcessingStatus =
  | "received"
  | "signature_failed"
  | "malformed_json"
  | "status_recorded"
  | "queued"
  | "ignored"
  | "queue_error"
  | "accepted"
  | "processed"
  | "skipped"
  | "failed_handled";

interface WebhookFacts {
  metaEventId: string | null;
  wamId: string | null;
  clientPhone: string | null;
  receiverPhoneNumberId: string | null;
  eventCategory: "message" | "status" | "unknown";
  eventType: string;
  messageCount: number;
  statusCount: number;
}

function getWebhookFacts(payload: unknown): WebhookFacts {
  const parsed = payload as MetaWebhookPayload;
  const entry = parsed.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];
  const status = value?.statuses?.[0];
  const receiverPhoneNumberId = normalizeWhatsAppPhoneNumberId(value?.metadata?.phone_number_id);

  const messageCount = Array.isArray(value?.messages) ? value.messages.length : 0;
  const statusCount = Array.isArray(value?.statuses) ? value.statuses.length : 0;

  const wamId =
    (message?.id as string | undefined)
    ?? (status?.id as string | undefined)
    ?? null;

  const clientPhone = normalizeWhatsAppPhone(
    (message?.from as string | undefined)
    ?? (status?.recipient_id as string | undefined)
    ?? null,
  );

  if (message) {
    return {
      metaEventId: (message?.id as string | undefined) ?? (entry?.id as string | undefined) ?? null,
      wamId,
      clientPhone,
      receiverPhoneNumberId,
      eventCategory: "message",
      eventType: (message?.type as string | undefined) ?? "unknown",
      messageCount,
      statusCount,
    };
  }

  if (status) {
    const statusName = (status?.status as string | undefined) ?? "unknown";
    return {
      metaEventId: (status?.id as string | undefined) ?? (entry?.id as string | undefined) ?? null,
      wamId,
      clientPhone,
      receiverPhoneNumberId,
      eventCategory: "status",
      eventType: `status:${statusName}`,
      messageCount,
      statusCount,
    };
  }

  return {
    metaEventId: (entry?.id as string | undefined) ?? null,
    wamId,
    clientPhone,
    receiverPhoneNumberId,
    eventCategory: "unknown",
    eventType: "unknown",
    messageCount,
    statusCount,
  };
}

export async function createWebhookEventRecord(payload: unknown): Promise<{
  id: string | null;
  facts: WebhookFacts;
}> {
  const facts = getWebhookFacts(payload);
  const ownership = await resolveInboundWhatsAppTenant({
    receiverPhoneNumberId: facts.receiverPhoneNumberId,
    senderPhone: facts.clientPhone,
  });
  const db = getWhatsAppServiceDb();

  const { data, error } = await db
    .from("whatsapp_webhook_events")
    .insert({
      trainer_id: ownership.trainerId,
      meta_event_id: facts.metaEventId,
      wam_id: facts.wamId,
      client_phone: ownership.clientPhone,
      event_category: facts.eventCategory,
      event_type: facts.eventType,
      signature_validation: "skipped" satisfies SignatureValidation,
      processing_status: "received" satisfies ProcessingStatus,
      processing_metadata: {
        message_count: facts.messageCount,
        status_count: facts.statusCount,
        receiver_phone_number_id: facts.receiverPhoneNumberId,
        tenant_resolution: ownership.reason,
      },
      payload,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[webhook-events] create failed:", error.message);
    return { id: null, facts };
  }

  return {
    id: (data as { id: string } | null)?.id ?? null,
    facts,
  };
}

export async function updateWebhookEventRecord(
  eventId: string | null,
  update: {
    signatureValidation?: SignatureValidation;
    processingStatus?: ProcessingStatus;
    processingMetadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!eventId) return;

  const payload: Record<string, unknown> = {};
  if (update.signatureValidation) payload.signature_validation = update.signatureValidation;
  if (update.processingStatus) payload.processing_status = update.processingStatus;
  if (update.processingMetadata) payload.processing_metadata = update.processingMetadata;

  if (Object.keys(payload).length === 0) return;

  const db = getWhatsAppServiceDb();
  const { error } = await db
    .from("whatsapp_webhook_events")
    .update(payload)
    .eq("id", eventId);

  if (error) {
    console.error("[webhook-events] update failed:", error.message);
  }
}

export async function updateWebhookEventRecordsByWamId(
  wamId: string | null,
  update: {
    processingStatus?: ProcessingStatus;
    processingMetadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!wamId) return;

  const payload: Record<string, unknown> = {};
  if (update.processingStatus) payload.processing_status = update.processingStatus;
  if (update.processingMetadata) payload.processing_metadata = update.processingMetadata;
  if (Object.keys(payload).length === 0) return;

  const db = getWhatsAppServiceDb();
  const { error } = await db
    .from("whatsapp_webhook_events")
    .update(payload)
    .eq("wam_id", wamId)
    .eq("processing_status", "queued");

  if (error) {
    console.error("[webhook-events] wam_id update failed:", error.message);
  }
}
