"use server"

import { revalidatePath } from "next/cache"
import { requireTrainer } from "@/lib/api-auth"
import { updateMealReview } from "@/lib/meals/mealOperations"

export async function approveMeal(
  mealId: string,
): Promise<{ error?: string }> {
  let trainerId: string
  try {
    trainerId = await requireTrainer()
  } catch {
    return { error: "Unauthorized." }
  }

  try {
    await updateMealReview(mealId, trainerId, { status: "verified" })
    revalidatePath("/dashboard/clients/[id]", "page")
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to approve meal." }
  }
}

export async function rejectMeal(
  mealId: string,
  notes?: string,
): Promise<{ error?: string }> {
  let trainerId: string
  try {
    trainerId = await requireTrainer()
  } catch {
    return { error: "Unauthorized." }
  }

  try {
    await updateMealReview(mealId, trainerId, {
      status: "unverified",
      notes: notes ?? undefined,
    })
    revalidatePath("/dashboard/clients/[id]", "page")
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to reject meal." }
  }
}
