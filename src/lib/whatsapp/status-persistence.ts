import { getWhatsAppServiceDb, normalizeWhatsAppPhone, normalizeWhatsAppPhoneNumberId, resolveInboundWhatsAppTenant } from "@/lib/whatsapp/service-db";
import type { MetaWebhookPayload } from "@/lib/whatsapp/meta-types";

function parseMetaTimestamp(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const asNumber = Number(raw);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return null;

  return new Date(asNumber * 1000).toISOString();
}

export async function persistWhatsAppStatuses(payload: unknown): Promise<{
  count: number;
  latestStatus: string | null;
}> {
  const parsed = payload as MetaWebhookPayload;
  const value = parsed.entry?.[0]?.changes?.[0]?.value;
  const statuses = value?.statuses;
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return { count: 0, latestStatus: null };
  }

  const db = getWhatsAppServiceDb();
  const receiverPhoneNumberId = normalizeWhatsAppPhoneNumberId(value?.metadata?.phone_number_id);
  const ownershipCache = new Map<string, Awaited<ReturnType<typeof resolveInboundWhatsAppTenant>>>();
  const rows: Record<string, unknown>[] = [];
  let latestStatus: string | null = null;

  for (const status of statuses) {
    const rawRecipient = (status?.recipient_id as string | undefined) ?? null;
    const clientPhone = normalizeWhatsAppPhone(rawRecipient);
    const cacheKey = `${receiverPhoneNumberId ?? "__missing_receiver__"}:${clientPhone ?? "__missing_sender__"}`;

    let ownership = ownershipCache.get(cacheKey);
    if (!ownership) {
      ownership = await resolveInboundWhatsAppTenant({
        receiverPhoneNumberId,
        senderPhone: clientPhone,
      });
      ownershipCache.set(cacheKey, ownership);
    }

    latestStatus = (status?.status as string | undefined) ?? latestStatus;

    rows.push({
      trainer_id: ownership.trainerId,
      wam_id: (status?.id as string | undefined) ?? "",
      client_phone: ownership.clientPhone,
      recipient_id: rawRecipient,
      status: (status?.status as string | undefined) ?? "unknown",
      meta_status_timestamp: parseMetaTimestamp(status?.timestamp as string | undefined),
      conversation_id: (status?.conversation?.id as string | undefined) ?? null,
      conversation_origin_type: (status?.conversation?.origin?.type as string | undefined) ?? null,
      conversation_expiration_timestamp: parseMetaTimestamp(
        status?.conversation?.expiration_timestamp as string | undefined,
      ),
      pricing_category: (status?.pricing?.category as string | undefined) ?? null,
      pricing_model: (status?.pricing?.pricing_model as string | undefined) ?? null,
      pricing_billable: typeof status?.pricing?.billable === "boolean" ? status.pricing.billable : null,
      error_payload: status?.errors ?? null,
      payload: status,
    });
  }

  const validRows = rows.filter((row) => typeof row.wam_id === "string" && row.wam_id.length > 0);
  if (validRows.length === 0) {
    return { count: 0, latestStatus };
  }

  const { error } = await db
    .from("whatsapp_message_statuses")
    .upsert(validRows, {
      onConflict: "wam_id,status,meta_status_timestamp,recipient_id",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error("[status-persistence] insert failed:", error.message);
  }

  for (const row of validRows) {
    if (typeof row.trainer_id !== "string" || row.trainer_id.length === 0) {
      continue;
    }

    const query = db
      .from("communication_logs")
      .update({ delivery_status: row.status as string })
      .eq("wam_id", row.wam_id as string)
      .eq("direction", "OUTBOUND")
      .eq("trainer_id", row.trainer_id);

    const { error: updateError } = await query;

    if (updateError) {
      console.error("[status-persistence] communication log update failed:", updateError.message);
    }
  }

  return { count: validRows.length, latestStatus };
}
