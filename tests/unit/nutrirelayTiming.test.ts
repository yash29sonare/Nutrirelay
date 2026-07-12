import { describe, expect, it } from "vitest"
import { adjustMealSlotForWorkout, shouldSuppressMealSlot } from "@/lib/automation/meal-nudges"
import { resolveRoutineAnchorTime } from "@/lib/reminders/reminderPlanner"

describe("NutriRelay timing", () => {
  it("shifts evening dinner after workout when dinner overlaps workout", () => {
    const adjusted = adjustMealSlotForWorkout({
      slotName: "Dinner",
      scheduledMinutes: 19 * 60,
      workoutMinutes: 19 * 60,
    })

    expect(adjusted).toBe(20 * 60 + 45)
  })

  it("keeps unrelated meal slots at their own client time", () => {
    const adjusted = adjustMealSlotForWorkout({
      slotName: "Lunch",
      scheduledMinutes: 13 * 60,
      workoutMinutes: 19 * 60,
    })

    expect(adjusted).toBe(13 * 60)
  })

  it("uses wake time for daily check-in and post-workout timing for meal overdue", () => {
    expect(resolveRoutineAnchorTime("daily_check_in", { wakeTime: "06:30" }, null)).toBe("06:30")
    expect(resolveRoutineAnchorTime("meal_overdue", {
      breakfastTime: "08:00",
      workoutTime: "18:30",
      postWorkoutDelayMinutes: 30,
    }, null)).toBe("20:00")
  })

  it("keeps breakfast reminders suppressed when breakfast is skipped", () => {
    expect(resolveRoutineAnchorTime("meal_overdue", {
      breakfastTime: null,
      lunchTime: "14:00:00",
      snackTime: "17:00:00",
      dinnerTime: "22:00:00",
      skippedMeals: ["breakfast"],
    }, "08:00")).toBe("14:00:00")
  })

  it("suppresses breakfast meal slots when onboarding says breakfast is skipped", () => {
    expect(shouldSuppressMealSlot({
      slotName: "Breakfast",
      onboardingCollectedData: {
        routine_times: {
          skippedMeals: ["breakfast"],
        },
      },
    })).toBe(true)
  })

  it("does not suppress breakfast when the client explicitly schedules breakfast", () => {
    expect(shouldSuppressMealSlot({
      slotName: "Breakfast",
      onboardingCollectedData: {
        routine_times: {
          breakfast: "09:00",
          lunch: "14:00",
          snack: "17:00",
          dinner: "22:00",
        },
      },
    })).toBe(false)
  })
})
