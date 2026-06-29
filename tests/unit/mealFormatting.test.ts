import { describe, it, expect } from "vitest"
import { formatCalories, formatProtein, formatMacroSummary, formatMealType, formatReviewStatus, formatMealSummary } from "@/lib/meals/mealFormatting"
import { mapFoodLogToMealRecord } from "@/lib/meals/mealMapper"
import type { FoodLogRow } from "@/lib/meals/mealMapper"

const baseRow: FoodLogRow = {
  id: "m1", client_id: "c1", trainer_id: "t1", logged_at: "2026-06-01T12:30:00.000Z",
  calories: 650, protein_g: 35, carbs_g: 60, fat_g: 25,
  verification_status: "UNVERIFIED", image_path: null, notes: null,
  created_at: "2026-06-01T12:30:00.000Z", updated_at: "2026-06-01T12:30:00.000Z",
}

describe("mealFormatting", () => {
  describe("formatCalories", () => {
    it("formats calories with kcal suffix", () => {
      expect(formatCalories(650)).toMatch(/kcal/)
    })
  })

  describe("formatProtein", () => {
    it("formats protein with g suffix", () => {
      expect(formatProtein(35)).toMatch(/protein/)
    })
  })

  describe("formatMacroSummary", () => {
    it("formats macro summary for a meal record", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      const summary = formatMacroSummary(meal)
      expect(summary.length).toBeGreaterThan(0)
      expect(summary).toContain("kcal")
    })

    it("returns fallback message for zero macros", () => {
      const zeroRow: FoodLogRow = { ...baseRow, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      const meal = mapFoodLogToMealRecord(zeroRow)
      expect(formatMacroSummary(meal)).toBe("No macro data")
    })
  })

  describe("formatMealType", () => {
    it("capitalizes meal type", () => {
      expect(formatMealType("breakfast")).toBe("Breakfast")
      expect(formatMealType("lunch")).toBe("Lunch")
      expect(formatMealType("dinner")).toBe("Dinner")
    })
  })

  describe("formatReviewStatus", () => {
    it("formats status values", () => {
      expect(formatReviewStatus("recorded")).toBe("Recorded")
      expect(formatReviewStatus("verified")).toBe("Verified")
      expect(formatReviewStatus("unverified")).toBe("Unverified")
      expect(formatReviewStatus("pending")).toBe("Pending review")
    })
  })

  describe("formatMealSummary", () => {
    it("formats full meal summary", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      const summary = formatMealSummary(meal)
      expect(summary.length).toBeGreaterThan(0)
      expect(summary).toContain("kcal")
    })
  })
})
