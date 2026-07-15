import { createClient } from "@supabase/supabase-js";

interface TrainerWabaTenantRow {
  id: string;
  trainer_id: string;
  phone_number_id: string | null;
  waba_id: string | null;
  business_account_id: string | null;
  phone_number: string | null;
  status: string;
}

export interface InboundWhatsAppTenantResolution {
  credential: TrainerWabaTenantRow | null;
  trainerId: string | null;
  clientId: string | null;
  clientPhone: string | null;
  reason: "resolved" | "missing_receiver" | "unknown_receiver" | "disconnected_credential" | "missing_sender" | "unknown_sender";
}

export function getWhatsAppServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function normalizeWhatsAppPhoneNumberId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  return digits.startsWith("0") ? digits.slice(1) : digits;
}

export async function resolveInboundWhatsAppTenant(input: {
  receiverPhoneNumberId: string | null | undefined;
  senderPhone: string | null | undefined;
}): Promise<InboundWhatsAppTenantResolution> {
  const receiverPhoneNumberId = normalizeWhatsAppPhoneNumberId(input.receiverPhoneNumberId);
  const clientPhone = normalizeWhatsAppPhone(input.senderPhone);

  if (!receiverPhoneNumberId) {
    return { credential: null, trainerId: null, clientId: null, clientPhone, reason: "missing_receiver" };
  }

  const db = getWhatsAppServiceDb();
  const { data: credential } = await db
    .from("trainer_waba_credentials")
    .select("id, trainer_id, phone_number_id, waba_id, business_account_id, phone_number, status")
    .eq("phone_number_id", receiverPhoneNumberId)
    .limit(1)
    .maybeSingle();

  const credentialRow = (credential as TrainerWabaTenantRow | null) ?? null;
  if (!credentialRow) {
    return { credential: null, trainerId: null, clientId: null, clientPhone, reason: "unknown_receiver" };
  }

  if (credentialRow.status !== "connected") {
    return {
      credential: credentialRow,
      trainerId: credentialRow.trainer_id,
      clientId: null,
      clientPhone,
      reason: "disconnected_credential",
    };
  }

  if (!clientPhone) {
    return {
      credential: credentialRow,
      trainerId: credentialRow.trainer_id,
      clientId: null,
      clientPhone,
      reason: "missing_sender",
    };
  }

  const { data: profileRows } = await db
    .from("profiles")
    .select("id")
    .eq("phone_number", clientPhone);

  const candidateClientIds = ((profileRows as Array<{ id: string }> | null) ?? [])
    .map((profile) => profile.id)
    .filter((id) => id.length > 0);

  if (candidateClientIds.length === 0) {
    return {
      credential: credentialRow,
      trainerId: credentialRow.trainer_id,
      clientId: null,
      clientPhone,
      reason: "unknown_sender",
    };
  }

  const { data: match } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", credentialRow.trainer_id)
    .eq("is_active", true)
    .in("client_id", candidateClientIds)
    .limit(1)
    .maybeSingle();

  const clientId = (match as { client_id: string } | null)?.client_id ?? null;
  return {
    credential: credentialRow,
    trainerId: credentialRow.trainer_id,
    clientId,
    clientPhone,
    reason: clientId ? "resolved" : "unknown_sender",
  };
}
