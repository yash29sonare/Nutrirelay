"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { updateTrainerWhatsAppClient } from "@/lib/operations/trainer-whatsapp-clients"

export interface WhatsAppClientDetailsActionState {
  ok: boolean
  message: string
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function readReminderTimes(formData: FormData): string[] {
  return readText(formData, "mealReminderTimes")
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8)
}

export async function updateWhatsAppClientDetailsAction(
  clientId: string,
  previousState: WhatsAppClientDetailsActionState,
  formData: FormData,
): Promise<WhatsAppClientDetailsActionState> {
  void previousState

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return { ok: false, message: "Sign in before editing client details." }
  }

  const clientName = readText(formData, "clientName")
  const whatsappNumber = readText(formData, "whatsappNumber")
  const workoutTime = readText(formData, "workoutTime")
  const status = readText(formData, "status")
  const result = await updateTrainerWhatsAppClient({
    authUserId: user.id,
    clientId,
    clientName,
    whatsappNumber: whatsappNumber || null,
    goal: readText(formData, "goal") || null,
    dietNotes: readText(formData, "dietNotes") || null,
    mealReminderTimes: readReminderTimes(formData),
    workoutTime: workoutTime || null,
    automationEnabled: formData.get("automationEnabled") === "on",
    status: status === "inactive" ? "inactive" : "active",
  })

  if (result.ok) {
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/clients")
    revalidatePath(`/dashboard/clients/${clientId}`)
  }

  return result
}
