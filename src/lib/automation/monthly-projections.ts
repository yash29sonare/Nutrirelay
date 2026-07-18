import { createClient } from "@supabase/supabase-js"
import { calculateCompliance } from "../compliance-engine"
import { countsTowardMacros } from "@/lib/meals/reviewRules"
import type { MealReviewState } from "@/types/meal"

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MONTH_DAYS = 30

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface MonthlyProjectionSummary {
  evaluated: number
  generated: number
  errors: number
}

export interface MonthlyProjectionFoodLog {
  calories: number | null
  logged_at: string
  review_state?: string | null
}

export function summarizeMonthlyProjectionFoodLogs(meals: MonthlyProjectionFoodLog[]): {
  reportableMeals: number
  totalCalories: number
  avgDailyCalories: number
} {
  const reportableMeals = meals.filter((meal) => countsTowardMacros(meal.review_state as MealReviewState | null | undefined))
  const totalCalories = reportableMeals.reduce((sum, meal) => sum + Number(meal.calories ?? 0), 0)

  return {
    reportableMeals: reportableMeals.length,
    totalCalories,
    avgDailyCalories: reportableMeals.length > 0 ? Math.round(totalCalories / MONTH_DAYS) : 0,
  }
}

export async function generateMonthlyProjections(): Promise<MonthlyProjectionSummary> {
  const db = getDb()
  const summary: MonthlyProjectionSummary = { evaluated: 0, generated: 0, errors: 0 }

  const { data: links } = await db
    .from("trainer_clients")
    .select("client_id, trainer_id")
    .eq("is_active", true)

  if (!links || links.length === 0) return summary

  const now = new Date()
  const reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

  for (const link of links as Array<{ client_id: string; trainer_id: string }>) {
    const { client_id: clientId, trainer_id: trainerId } = link
    summary.evaluated++

    try {
      const compliance = await calculateCompliance({ clientId, trainerId })

      const thirtyDaysAgo = new Date(Date.now() - MONTH_DAYS * MS_PER_DAY).toISOString()

      const { data: goal } = await db
        .from("client_goals")
        .select("goal_type, target_weight, starting_weight, current_weight, weekly_target_rate, target_date")
        .eq("client_id", clientId)
        .eq("goal_status", "ACTIVE")
        .limit(1)
        .maybeSingle()

      const goalRow = goal as Record<string, any> | null

      const { data: meals } = await db
        .from("food_logs")
        .select("calories, logged_at, review_state")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .gte("logged_at", thirtyDaysAgo)

      const { avgDailyCalories } = summarizeMonthlyProjectionFoodLogs((meals ?? []) as MonthlyProjectionFoodLog[])

      let goalProjectionScore: number | null = null
      let predictedSuccess: boolean | null = null
      let summaryText = ""

      if (goalRow && goalRow.goal_type && goalRow.target_weight && goalRow.starting_weight) {
        const weightChange = Number(goalRow.starting_weight) - Number(goalRow.target_weight)
        const weeklyRate = Number(goalRow.weekly_target_rate ?? 0.5)
        const weeksRemaining = weightChange > 0 && weeklyRate > 0 ? Math.ceil(weightChange / weeklyRate) : 12
        const projectedWeeksCompliance = Math.round((compliance.compliance_score / 100) * weeksRemaining)

        goalProjectionScore = Math.min(100, Math.round((projectedWeeksCompliance / weeksRemaining) * 100))
        predictedSuccess = goalProjectionScore >= 50

        summaryText = compliance.compliance_score >= 70
          ? `On track. ${predictedSuccess ? "Projected to reach goal." : "May need adjustment."} Avg ${avgDailyCalories} kcal/day.`
          : `Needs improvement. Compliance at ${compliance.compliance_score}%. Avg ${avgDailyCalories} kcal/day.`
      } else {
        summaryText = `No active goal. Avg ${avgDailyCalories} kcal/day over 30 days. Compliance: ${compliance.compliance_score}%.`
      }

      await db.from("monthly_reports").insert({
        client_id: clientId,
        trainer_id: trainerId,
        report_month: reportMonth,
        compliance_score: compliance.compliance_score,
        goal_projection_score: goalProjectionScore,
        predicted_goal_success: predictedSuccess,
        summary: summaryText,
      })

      summary.generated++
    } catch (err) {
      summary.errors++
      console.error(`[monthly-projections] error for ${clientId}:`, (err as Error).message)
    }
  }

  console.log(
    `[monthly-projections] done — evaluated=${summary.evaluated} generated=${summary.generated} errors=${summary.errors}`,
  )
  return summary
}
