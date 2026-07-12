"use server";

import { createClient } from "@/utils/supabase/server"
import { ensureTrainerRow, saveOnboardingData, completeOnboarding } from "@/lib/operations/trainer"
import { revalidatePath } from "next/cache"

export async function completeOnboardingAction(formData: {
  fullName: string
  displayName: string
  businessName: string
  timezone: string
  country: string
}): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.id) {
      return { error: "Not authenticated" }
    }

    // Ensure the trainers row exists before saving data.
    // This bypasses the database trigger chain (auth → profile → trainer)
    // which can fail silently depending on migration state.
    await ensureTrainerRow(user.id, formData.displayName)

    await saveOnboardingData(user.id, formData)
    await completeOnboarding(user.id)

    revalidatePath("/dashboard")
    revalidatePath("/onboarding")

    return {}
  } catch (err) {
    console.error("[onboarding] completeOnboardingAction error:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return { error: message }
  }
}
