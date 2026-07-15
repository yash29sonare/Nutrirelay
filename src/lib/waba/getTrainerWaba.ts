/**
 * getTrainerWaba — Per-trainer WABA credential resolver.
 *
 * WHY GLOBAL WHATSAPP CREDENTIALS ARE FORBIDDEN:
 * Fortress Fitness is a multi-tenant SaaS. Each trainer is a separate tenant
 * who owns their own WhatsApp Business Account (WABA). Using a single global
 * WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID environment variable would
 * mean every trainer's AI messages are sent from the same WhatsApp number,
 * making multi-tenant operation architecturally impossible. A client belonging
 * to Trainer B would receive messages from Trainer A's number — a fundamental
 * data isolation and trust violation.
 *
 * WHY OWNERSHIP PROPAGATION IS REQUIRED:
 * The tenant boundary is: trainer → WABA → client → AI → automation → dashboard.
 * Every outbound WhatsApp message, every inbound webhook attribution, and every
 * automated job must be traceable back to a specific trainer's WABA connection.
 * Without this chain, a second trainer signing up corrupts every automated flow
 * for the first trainer (wrong number sends, cross-trainer message attribution,
 * duplicate ghosting alerts, etc.).
 *
 * WHY EVERY OUTBOUND SENDER WILL DEPEND ON THIS:
 * This file is the single source of truth for WABA credential resolution. Other
 * WhatsApp senders should receive credentials returned by this function instead
 * of reading global WhatsApp credentials from environment variables.
 */

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/shared/types/supabase"

export interface TrainerWabaCredentials {
  phoneNumberId:     string
  accessToken:       string
  wabaId:            string | null
  businessAccountId: string | null
  phoneNumber:       string | null
  status:            string
}

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("[getTrainerWaba] Supabase env vars not set")
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Fetches the WABA credentials for a given trainer.
 *
 * @param trainerId - The trainer's auth.uid() / profiles.id
 * @returns Normalized WABA credential object
 * @throws If no WABA record exists or the connection is not in 'connected' status
 */
export async function getTrainerWaba(
  trainerId: string,
): Promise<TrainerWabaCredentials> {
  if (!trainerId) {
    throw new Error("[getTrainerWaba] trainerId is required")
  }

  const db = getDb()

  const { data, error } = await db
    .from("trainer_waba_credentials")
    .select(
      "phone_number_id, access_token, waba_id, business_account_id, phone_number, status",
    )
    .eq("trainer_id", trainerId)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(
      `[getTrainerWaba] DB error for trainer ${trainerId}: ${error.message}`,
    )
  }

  if (!data) {
    throw new Error(
      `[getTrainerWaba] No connected WABA record found for trainer ${trainerId}. ` +
      `The trainer must complete WABA connection before the bot can send messages.`,
    )
  }

  if (!data.phone_number_id || !data.access_token) {
    throw new Error(
      `[getTrainerWaba] WABA record for trainer ${trainerId} is incomplete — ` +
      `phone_number_id or access_token is missing. Re-run the connection flow.`,
    )
  }

  return {
    phoneNumberId:     data.phone_number_id,
    accessToken:       data.access_token,
    wabaId:            data.waba_id,
    businessAccountId: data.business_account_id,
    phoneNumber:       data.phone_number,
    status:            data.status,
  }
}
