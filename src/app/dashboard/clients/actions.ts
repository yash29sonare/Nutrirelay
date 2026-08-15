"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db"
import { addTrainerWhatsAppClient, sendTrainerWhatsAppClientOnboarding } from "@/lib/operations/trainer-whatsapp-clients"

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

  const result = await addTrainerWhatsAppClient({
    authUserId: user.id,
    clientName,
    whatsappNumber,
    goal,
    dietNotes: dietNotes || null,
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/clients")

  return result
}

export async function sendClientOnboardingAction(clientId: string): Promise<AddWhatsAppClientActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return { ok: false, message: "Sign in before sending onboarding." }
  }

  if (!clientId) {
    return { ok: false, message: "Client is required." }
  }

  const result = await sendTrainerWhatsAppClientOnboarding(user.id, clientId)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/clients")

  return result
}
