import { describe, expect, it } from "vitest"
import {
  advanceOnboardingState,
  buildRoutineTimingFromSchedule,
  parseAllergies,
  parseCheckinPreference,
  parseFoodPreferences,
  parseGoalType,
  parseHeightCm,
  parseRoutineTimes,
  parseWeightKg,
  parseWorkoutSchedule,
} from "@/lib/whatsapp/onboardingStateMachine"
import { resolveRoutineAnchorTime } from "@/lib/reminders/reminderPlanner"
import { buildWeeklyClientReportSummary } from "@/lib/automation/weekly-report"

describe("onboardingStateMachine", () => {
  it("A parses 170 cm", () => {
    expect(parseHeightCm("170 cm")).toBe(170)
  })

  it("B parses 5'7", () => {
    expect(parseHeightCm("5'7")).toBeCloseTo(170.2, 1)
  })

  it("C parses 72 kg", () => {
    expect(parseWeightKg("72 kg")).toBe(72)
  })

  it("D parses fat loss goal", () => {
    expect(parseGoalType("fat loss")).toBe("LOSE_WEIGHT")
  })

  it("E parses peanut allergy", () => {
    expect(parseAllergies("I am allergic to peanuts")).toContain("peanut")
  })

  it("F parses veg but eggs allowed", () => {
    expect(parseFoodPreferences("veg but eggs allowed")?.dietType).toBe("veg_eggs_allowed")
  })

  it("G parses routine meal times", () => {
    expect(parseRoutineTimes("breakfast 9, lunch 2, snack 5, dinner 10")).toEqual({
      breakfast: "09:00",
      lunch: "14:00",
      snack: "17:00",
      dinner: "22:00",
    })
  })

  it("H parses workout time and Sunday rest", () => {
    expect(parseWorkoutSchedule("workout at 8 pm, rest on sunday")).toMatchObject({
      workoutTime: "20:00",
      restDays: ["sunday"],
      workoutDays: [],
      noWorkoutCurrently: false,
    })
  })

  it("I keeps step on unclear answer", () => {
    const result = advanceOnboardingState({
      onboarding_status: "in_progress",
      current_step: "height",
      collected_data: {},
    }, "maybe later")

    expect(result.ok).toBe(false)
    expect(result.nextStep).toBe("height")
  })

  it("J duplicate-style replay does not advance the next step", () => {
    const first = advanceOnboardingState({
      onboarding_status: "in_progress",
      current_step: "height",
      collected_data: {},
    }, "170 cm")

    const replay = advanceOnboardingState({
      onboarding_status: "in_progress",
      current_step: "weight",
      collected_data: first.updates?.value ?? {},
    }, "170 cm")

    expect(first.nextStep).toBe("weight")
    expect(replay.ok).toBe(false)
    expect(replay.nextStep).toBe("weight")
  })

  it("K reaches completion over full progression", () => {
    let state = {
      onboarding_status: "in_progress" as const,
      current_step: "height" as const,
      collected_data: {},
    }

    const answers = [
      "170 cm",
      "72 kg",
      "fat loss",
      "65 kg",
      "I am allergic to peanuts",
      "veg but eggs allowed",
      "breakfast 9, lunch 2, snack 5, dinner 10",
      "workout at 8 pm, rest on sunday",
      "evening",
    ]

    for (const answer of answers) {
      const result = advanceOnboardingState(state, answer)
      state = {
        ...state,
        current_step: result.nextStep,
        collected_data: { ...state.collected_data, ...(result.updates?.value ?? {}) },
      }
    }

    expect(state.current_step).toBe("complete")
  })

  it("L maps stored routine data into reminder inputs", () => {
    const routine = buildRoutineTimingFromSchedule({
      breakfast_time: "09:00:00",
      lunch_time: "14:00:00",
      snack_time: "17:00:00",
      dinner_time: "22:00:00",
      workout_time: "20:00:00",
      preferred_checkin_time: "20:00:00",
      post_workout_delay_minutes: 30,
    })

    expect(resolveRoutineAnchorTime("meal_overdue", routine, null)).toBe("21:30")
    expect(parseCheckinPreference("evening")?.preference).toBe("evening")
  })

  it("accepts long real workout answer with frequency, range, and Sunday rest", () => {
    const parsed = parseWorkoutSchedule("6 days a week, sunday rest day, i work out at 8 pm to 10pm daily")

    expect(parsed).toMatchObject({
      workoutTime: "20:00",
      workoutEndTime: "22:00",
      workoutDurationMinutes: 120,
      restDays: ["sunday"],
      workoutFrequency: 6,
      postWorkoutDelayMinutes: 90,
    })
  })

  it("accepts short real workout answer with Sunday rest", () => {
    expect(parseWorkoutSchedule("8pm workout sunday rest")).toMatchObject({
      workoutTime: "20:00",
      restDays: ["sunday"],
    })
  })

  it("advances from workout schedule to check-in preference after valid workout answer", () => {
    const result = advanceOnboardingState({
      onboarding_status: "in_progress",
      current_step: "workout_schedule",
      collected_data: {},
    }, "8pm workout sunday rest")

    expect(result.ok).toBe(true)
    expect(result.nextStep).toBe("checkin_preference")
  })

  it("does not turn a repeated workout answer into another workout prompt after state advanced", () => {
    const result = advanceOnboardingState({
      onboarding_status: "in_progress",
      current_step: "checkin_preference",
      collected_data: {},
    }, "8pm workout sunday rest")

    expect(result.ok).toBe(false)
    expect(result.nextStep).toBe("checkin_preference")
  })

  it("represents skipped breakfast and later meal times safely", () => {
    expect(parseRoutineTimes("I don't eat breakfast, lunch at 2 pm, snacks around 4-5pm, dinner at 11pm")).toMatchObject({
      skippedMeals: ["breakfast"],
      lunch: "14:00",
      snack: "16:00",
      dinner: "23:00",
    })
  })

  it("parses no breakfast without inventing a breakfast time", () => {
    expect(parseRoutineTimes("no breakfast")).toMatchObject({
      skippedMeals: ["breakfast"],
    })
  })

  it("parses Hinglish breakfast skip while preserving other meals", () => {
    expect(parseRoutineTimes("nashta nahi karta, lunch 2 baje, snack 5 baje, dinner 11 baje")).toMatchObject({
      skippedMeals: ["breakfast"],
      lunch: "14:00",
      snack: "17:00",
      dinner: "23:00",
    })
  })

  it("treats tea or coffee only mornings as no breakfast schedule", () => {
    expect(parseRoutineTimes("morning sirf chai, no breakfast")).toMatchObject({
      skippedMeals: ["breakfast"],
    })
  })

  it("shifts dinner/post-workout timing after an 8pm-10pm workout", () => {
    const routine = buildRoutineTimingFromSchedule({
      lunch_time: "14:00:00",
      snack_time: "16:00:00",
      dinner_time: "23:00:00",
      workout_time: "20:00:00",
      rest_days: ["sunday"],
      post_workout_delay_minutes: 90,
    })

    expect(resolveRoutineAnchorTime("meal_overdue", routine, null, new Date("2026-07-13T12:00:00+05:30"))).toBe("22:30")
  })

  it("uses normal meal timing on Sunday rest day", () => {
    const routine = buildRoutineTimingFromSchedule({
      lunch_time: "14:00:00",
      snack_time: "16:00:00",
      dinner_time: "23:00:00",
      workout_time: "20:00:00",
      rest_days: ["sunday"],
      post_workout_delay_minutes: 90,
    })

    expect(resolveRoutineAnchorTime("meal_overdue", routine, null, new Date("2026-07-12T12:00:00+05:30"))).toBe("14:00:00")
  })

  it("client profile read model can receive onboarding routine/workout fields", () => {
    const routine = buildRoutineTimingFromSchedule(
      {
        breakfast_time: null,
        lunch_time: "14:00:00",
        snack_time: "16:00:00",
        dinner_time: "23:00:00",
        workout_time: "20:00:00",
        rest_days: ["sunday"],
        checkin_preference: "evening",
      },
      {
        routine_times: {
          skippedMeals: ["breakfast"],
        },
      },
    )

    expect(routine).toMatchObject({
      breakfastTime: null,
      lunchTime: "14:00:00",
      dinnerTime: "23:00:00",
      workoutTime: "20:00:00",
      restDays: ["sunday"],
      skippedMeals: ["breakfast"],
    })
  })

  it("weekly report summary builder includes meals, adherence, review, macros, and goal context", () => {
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
