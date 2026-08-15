"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getPlanClientLimit } from "@/lib/entitlements"
import { getWhatsAppServiceDb, normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db"

export interface AddWhatsAppClientActionState {
  ok: boolean
  message: string
}

const DEFAULT_ERROR_STATE: AddWhatsAppClientActionState = {
  ok: false,
  message: "",
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

export async function addWhatsAppClientAction(
  previousState: AddWhatsAppClientActionState = DEFAULT_ERROR_STATE,
  formData: FormData,
): Promise<AddWhatsAppClientActionState> {
  void previousState

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return { ok: false, message: "Sign in before adding a client." }
  }

  const clientName = readText(formData, "clientName")
  const whatsappNumber = readText(formData, "whatsappNumber")
  const goal = readText(formData, "goal")
  const dietNotes = readText(formData, "dietNotes")
  const normalizedPhone = normalizeWhatsAppPhone(whatsappNumber)

  if (clientName.length < 2) {
    return { ok: false, message: "Client name must be at least 2 characters." }
  }

  if (clientName.length > 120) {
    return { ok: false, message: "Client name is too long." }
  }

  if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 15) {
    return { ok: false, message: "Enter a valid WhatsApp phone number with country code." }
  }

  if (!goal) {
    return { ok: false, message: "Add a short onboarding goal for this client." }
  }

  const db = getWhatsAppServiceDb()
  const { data: profile } = await db
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role !== "trainer") {
    return { ok: false, message: "Only trainer accounts can add WhatsApp clients." }
  }

  if (profile?.status !== "active") {
    return { ok: false, message: "Your trainer account is not active." }
  }

  const { data: trainer } = await db
    .from("trainers")
    .select("auth_user_id, account_status, onboarding_status, subscription_plan, max_clients")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (!trainer) {
    return { ok: false, message: "Trainer profile not found." }
  }

  if (trainer.account_status !== "active") {
    return { ok: false, message: "Your trainer account is restricted. Contact NutriRelay support." }
  }

  if (trainer.onboarding_status !== "active") {
    return { ok: false, message: "Complete trainer onboarding before adding clients." }
  }

  const { data: credential } = await db
    .from("trainer_waba_credentials")
    .select("id, status, phone_number_id, waba_id")
    .eq("trainer_id", user.id)
    .eq("status", "connected")
    .not("phone_number_id", "is", null)
    .not("waba_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!credential) {
    return { ok: false, message: "Connect your WhatsApp sender before adding clients." }
  }

  const { count: activeClientCount, error: countError } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id", { count: "exact", head: true })
    .eq("trainer_id", user.id)
    .eq("status", "active")

  if (countError) {
    return { ok: false, message: "Could not verify your client capacity." }
  }

  const planLimit = getPlanClientLimit(trainer.subscription_plan)
  const explicitLimit = Number(trainer.max_clients)
  const clientLimit = explicitLimit > 0 ? explicitLimit : planLimit

  if (clientLimit !== null && (activeClientCount ?? 0) >= clientLimit) {
    return { ok: false, message: "You have reached your plan's active client limit." }
  }

  const { data: duplicate } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id")
    .eq("trainer_id", user.id)
    .eq("normalized_whatsapp_number", normalizedPhone)
    .neq("status", "archived")
    .limit(1)
    .maybeSingle()

  if (duplicate) {
    return { ok: false, message: "A client with this WhatsApp number already exists." }
  }

  const { error: insertError } = await db
    .from("trainer_whatsapp_clients")
    .insert({
      trainer_id: user.id,
      client_name: clientName,
      whatsapp_number: whatsappNumber,
      normalized_whatsapp_number: normalizedPhone,
      goal,
      diet_notes: dietNotes || null,
      automation_enabled: true,
      status: "active",
      onboarding_message_status: "not_sent",
    })

  if (insertError) {
    return { ok: false, message: insertError.message }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/clients")

  return { ok: true, message: "Client added. You can now send the onboarding template." }
}
