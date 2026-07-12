import { describe, expect, it } from "vitest"
import { buildWeeklyClientReportSummary, getAmbiguousWeeklyReportClientIds } from "@/lib/automation/weekly-report"

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
})
