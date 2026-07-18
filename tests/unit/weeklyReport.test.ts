import { describe, expect, it } from "vitest"
import { buildWeeklyClientReportSummary, filterReportableFoodLogs, getAmbiguousWeeklyReportClientIds } from "@/lib/automation/weekly-report"
import { summarizeMonthlyProjectionFoodLogs } from "@/lib/automation/monthly-projections"

describe("weekly report helpers", () => {
  it("flags clients with multiple active trainer links as ambiguous", () => {
    const ambiguous = getAmbiguousWeeklyReportClientIds([
      { trainer_id: "trainer-a", client_id: "client-1" },
      { trainer_id: "trainer-b", client_id: "client-1" },
      { trainer_id: "trainer-a", client_id: "client-2" },
    ])

    expect([...ambiguous]).toEqual(["client-1"])
  })

  it("builds summary metrics from logs and structured replies", () => {
    const summary = buildWeeklyClientReportSummary({
      foodLogs: [
        { calories: 500, protein_g: 30, carbs_g: 60, fat_g: 15, verification_status: "VERIFIED", review_state: "approved", logged_at: "2026-07-06T08:00:00Z" },
        { calories: 700, protein_g: 35, carbs_g: 80, fat_g: 20, verification_status: "NEEDS_REVIEW", review_state: "needs_review", logged_at: "2026-07-07T08:00:00Z" },
      ],
      communicationLogs: [
        { metadata: { structured_response: { adherence_status: "followed", selected_option: "Paneer meal" } } },
        { metadata: { structured_response: { adherence_status: "skipped", selected_option: "Skipped dinner" } } },
        { metadata: { structured_response: { adherence_status: "outside", selected_option: "Ate outside" } } },
        { metadata: { structured_response: { adherence_status: "alternative", selected_option: "Alternative meal" } } },
      ],
      goal: { goal_type: "GAIN_WEIGHT", starting_weight: 60, current_weight: 61, target_weight: 65 },
      workoutSchedule: {
        workout_time: "20:00:00",
        rest_days: ["sunday"],
        checkin_preference: "evening",
        lunch_time: "14:00:00",
        snack_time: "16:00:00",
        dinner_time: "23:00:00",
      },
    })

    expect(summary).toMatchObject({
      mealsLogged: 2,
      followedMeals: 1,
      skippedMeals: 1,
      outsideFoodEvents: 1,
      alternativeMeals: 1,
      reviewNeededItems: 1,
      macroTotals: { calories: 1200, protein: 65, carbs: 140, fat: 35 },
      projection: "on_track",
    })
  })

  it("excludes rejected and merged food logs from report macros", () => {
    const logs = [
      { calories: 500, protein_g: 30, carbs_g: 60, fat_g: 15, verification_status: "VERIFIED", review_state: "corrected", logged_at: "2026-07-19T08:00:00Z" },
      { calories: 900, protein_g: 10, carbs_g: 100, fat_g: 40, verification_status: "VERIFIED", review_state: "rejected", logged_at: "2026-07-19T12:00:00Z" },
      { calories: 300, protein_g: 15, carbs_g: 35, fat_g: 8, verification_status: "VERIFIED", review_state: "merged", logged_at: "2026-07-19T18:00:00Z" },
      { calories: null, protein_g: null, carbs_g: null, fat_g: null, verification_status: "NEEDS_REVIEW", review_state: "needs_review", logged_at: "2026-07-20T08:00:00Z" },
    ]

    expect(filterReportableFoodLogs(logs).map((log) => log.review_state)).toEqual(["corrected", "needs_review"])

    const weekly = buildWeeklyClientReportSummary({
      foodLogs: logs,
      communicationLogs: [],
    })

    expect(weekly.mealsLogged).toBe(2)
    expect(weekly.macroTotals).toEqual({ calories: 500, protein: 30, carbs: 60, fat: 15 })

    const monthly = summarizeMonthlyProjectionFoodLogs(logs)
    expect(monthly).toMatchObject({
      reportableMeals: 2,
      totalCalories: 500,
      avgDailyCalories: 17,
    })
  })
})
