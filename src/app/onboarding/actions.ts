"use server";

import { createClient } from "@/utils/supabase/server"
import { checkTrainerReady, saveOnboardingData, completeOnboarding } from "@/lib/operations/trainer"
import { revalidatePath } from "next/cache"

async function waitForTrainerRow(authUserId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const ready = await checkTrainerReady(authUserId)
    if (ready.exists) return true
    if (attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 600))
    }
  }
  return false
}

export async function completeOnboardingAction(formData: {
  businessName: string
  timezone: string
  country: string
  coachingStyle: string
  experienceLevel: string
  specialties: string[]
  languages: string[]
  defaultAvailability: string
  expectedClientCount: string
  coachingGoals: string
}): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.id) {
      return { error: "Not authenticated" }
    }

    const ready = await waitForTrainerRow(user.id)
    if (!ready) {
      return { error: "Account initialization in progress. Please try again in a moment." }
    }

    await saveOnboardingData(user.id, formData)
    await completeOnboarding(user.id)

    revalidatePath("/dashboard")

    return {}
  } catch (err) {
    console.error("[onboarding] completeOnboardingAction error:", err)
    return { error: "Failed to complete onboarding. Please try again." }
  }
}
