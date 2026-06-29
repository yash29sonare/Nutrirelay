import { describe, it, expect } from "vitest"
import { evaluateFollowUp, evaluateReminderNeed, evaluateMeal } from "@/lib/meals/mealCommunication"
import { mapFoodLogToMealRecord } from "@/lib/meals/mealMapper"
import type { FoodLogRow } from "@/lib/meals/mealMapper"

const baseRow: FoodLogRow = {
  id: "m1", client_id: "c1", trainer_id: "t1", logged_at: "2026-06-01T12:30:00.000Z",
  calories: 650, protein_g: 35, carbs_g: 60, fat_g: 25,
  verification_status: "VERIFIED", image_path: "meals/img.jpg", notes: null,
  created_at: "2026-06-01T12:30:00.000Z", updated_at: "2026-06-01T12:30:00.000Z",
}

describe("mealCommunication", () => {
  describe("evaluateFollowUp", () => {
    it("returns null for a complete meal with photo", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      const result = evaluateFollowUp(meal)
      expect(result).toBeNull()
    })

    it("triggers missing_attachment when no photo", () => {
      const row = { ...baseRow, image_path: null }
      const meal = mapFoodLogToMealRecord(row)
      const result = evaluateFollowUp(meal)
      expect(result).not.toBeNull()
      expect(result!.reason).toBe("missing_attachment")
    })

    it("triggers low_information when insufficient macros", () => {
      const row = { ...baseRow, calories: 10, protein_g: 0, carbs_g: 0, fat_g: 0, image_path: "img.jpg" }
      const meal = mapFoodLogToMealRecord(row)
      const result = evaluateFollowUp(meal)
      expect(result).not.toBeNull()
      expect(result!.reason).toBe("low_information")
    })
  })

  describe("evaluateReminderNeed", () => {
    it("triggers reminder when no meals logged today", () => {
      const result = evaluateReminderNeed("c1", "t1", null)
      expect(result).not.toBeNull()
      expect(result!.type).toBe("reminder")
    })

    it("returns null when last meal was recent", () => {
      const recent = new Date(Date.now() - 3600000).toISOString()
      const result = evaluateReminderNeed("c1", "t1", recent)
      expect(result).toBeNull()
    })

    it("triggers reminder when last meal was long ago", () => {
      const old = new Date(Date.now() - 5 * 3600000).toISOString()
      const result = evaluateReminderNeed("c1", "t1", old)
      expect(result).not.toBeNull()
      expect(result!.type).toBe("reminder")
    })
  })

  describe("evaluateMeal", () => {
    it("returns requests array from meal evaluation", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      const requests = evaluateMeal(meal)
      expect(Array.isArray(requests)).toBe(true)
    })
  })
})
