import { countsTowardMacros } from "@/lib/meals/reviewRules"
import { createServiceDb } from "@/lib/ownership"
import type { MealReviewState } from "@/types/meal"

const MS_PER_DAY = 24 * 60 * 60 * 1000

interface NutritionActivityRow {
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  review_state: string | null
}

export interface TrainerNutritionActivity {
  meals7Days: number
  calories7Days: number
  protein7Days: number
  carbs7Days: number
  fat7Days: number
  pendingReviews: number
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

export async function getTrainerNutritionActivity(
  trainerId: string,
  now = new Date(),
): Promise<TrainerNutritionActivity> {
  const db = createServiceDb()
  const { data: links, error: linksError } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("is_active", true)

  if (linksError) throw new Error("Unable to load trainer nutrition activity")
  const clientIds = [...new Set((links ?? []).map((link) => link.client_id))]
  if (clientIds.length === 0) {
    return {
      meals7Days: 0,
      calories7Days: 0,
      protein7Days: 0,
      carbs7Days: 0,
      fat7Days: 0,
      pendingReviews: 0,
    }
  }

  const start = new Date(now.getTime() - 7 * MS_PER_DAY).toISOString()
  const logsRes = await db
    .from("food_logs")
    .select("calories, protein_g, carbs_g, fat_g, review_state")
    .eq("trainer_id", trainerId)
    .in("client_id", clientIds)
    .gte("logged_at", start)

  if (logsRes.error) {
    throw new Error("Unable to load trainer nutrition activity")
  }

  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  }
  const reportable = ((logsRes.data ?? []) as unknown as NutritionActivityRow[])
    .filter((log) => countsTowardMacros(log.review_state as MealReviewState | null))

  for (const log of reportable) {
    totals.calories += Number(log.calories ?? 0)
    totals.protein += Number(log.protein_g ?? 0)
    totals.carbs += Number(log.carbs_g ?? 0)
    totals.fat += Number(log.fat_g ?? 0)
  }

  return {
    meals7Days: reportable.length,
    calories7Days: Math.round(totals.calories),
    protein7Days: round(totals.protein),
    carbs7Days: round(totals.carbs),
    fat7Days: round(totals.fat),
    pendingReviews: ((logsRes.data ?? []) as unknown as NutritionActivityRow[])
      .filter((log) => log.review_state === "needs_review").length,
  }
}
