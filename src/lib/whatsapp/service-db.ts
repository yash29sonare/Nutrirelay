import { createClient } from "@supabase/supabase-js";

export function getWhatsAppServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  return digits.startsWith("0") ? digits.slice(1) : digits;
}

export async function resolveTrainerAndClientByPhone(rawPhone: string | null | undefined): Promise<{
  clientId: string | null;
  trainerId: string | null;
  clientPhone: string | null;
}> {
  const clientPhone = normalizeWhatsAppPhone(rawPhone);
  if (!clientPhone) {
    return { clientId: null, trainerId: null, clientPhone: null };
  }

  const db = getWhatsAppServiceDb();
  const { data: profileRow } = await db
    .from("profiles")
    .select("id")
    .eq("phone_number", clientPhone)
    .limit(1)
    .single();

  const clientId = (profileRow as { id: string } | null)?.id ?? null;
  if (!clientId) {
    return { clientId: null, trainerId: null, clientPhone };
  }

  const { data: trainerClientRow } = await db
    .from("trainer_clients")
    .select("trainer_id")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .limit(1)
    .single();

  return {
    clientId,
    trainerId: (trainerClientRow as { trainer_id: string } | null)?.trainer_id ?? null,
    clientPhone,
  };
}
