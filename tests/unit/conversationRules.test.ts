import { describe, it, expect } from "vitest"
import {
  checkMissingAttachment,
  checkLowInformation,
  checkNegativeReview,
  checkLowAIConfidence,
  checkRepeatedIncomplete,
  checkMealGap,
} from "@/lib/conversations/conversationRules"
import { mapFoodLogToMealRecord } from "@/lib/meals/mealMapper"
import type { FoodLogRow } from "@/lib/meals/mealMapper"
import type { MealAIResult } from "@/types/meal-ai"

const baseRow: FoodLogRow = {
  id: "m1", client_id: "c1", trainer_id: "t1", logged_at: "2026-06-01T12:30:00.000Z",
  calories: 650, protein_g: 35, carbs_g: 60, fat_g: 25,
  verification_status: "VERIFIED", image_path: "meals/img.jpg", notes: null,
  created_at: "2026-06-01T12:30:00.000Z", updated_at: "2026-06-01T12:30:00.000Z",
}

const highConfidenceAI: MealAIResult = {
  fitScore: 85,
  confidence: { overall: "high" as const, protein: "high" as const, calories: "high" as const },
  recommendations: [],
  summary: "Good meal",
  adherence: "medium",
  dailyTotals: { calories: 2000, protein: 120, carbs: 250, fat: 65 },
}

const lowConfidenceAI: MealAIResult = {
  fitScore: 40,
  confidence: { overall: "low" as const, protein: "low" as const, calories: "low" as const },
  recommendations: ["increase protein"],
  summary: "Needs improvement",
  adherence: "low",
  dailyTotals: { calories: 1500, protein: 60, carbs: 200, fat: 50 },
}

describe("conversationRules", () => {
  describe("checkMissingAttachment", () => {
    it("returns null when meal has attachment", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      expect(checkMissingAttachment(meal)).toBeNull()
    })

    it("triggers when meal has no attachment", () => {
      const row = { ...baseRow, image_path: null }
      const meal = mapFoodLogToMealRecord(row)
      const result = checkMissingAttachment(meal)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
      expect(result!.reason).toBe("missing_attachment")
    })
  })

  describe("checkLowInformation", () => {
    it("returns null when meal has sufficient info", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      expect(checkLowInformation(meal)).toBeNull()
    })

    it("triggers when meal has low info", () => {
      const row = { ...baseRow, calories: 10, protein_g: 0, carbs_g: 0, fat_g: 0 }
      const meal = mapFoodLogToMealRecord(row)
      const result = checkLowInformation(meal)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
    })
  })

  describe("checkNegativeReview", () => {
    it("returns null when meal is verified", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      expect(checkNegativeReview(meal)).toBeNull()
    })

    it("triggers when meal is unverified", () => {
      const row = { ...baseRow, verification_status: "UNVERIFIED" }
      const meal = mapFoodLogToMealRecord(row)
      const result = checkNegativeReview(meal)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
      expect(result!.reason).toBe("negative_review")
    })
  })

  describe("checkLowAIConfidence", () => {
    it("returns null for high confidence", () => {
      expect(checkLowAIConfidence(highConfidenceAI)).toBeNull()
    })

    it("triggers for low confidence", () => {
      const result = checkLowAIConfidence(lowConfidenceAI)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
      expect(result!.reason).toBe("low_ai_confidence")
    })
  })

  describe("checkRepeatedIncomplete", () => {
    it("returns null for single incomplete meal", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      const result = checkRepeatedIncomplete(meal, [])
      expect(result).toBeNull()
    })

    it("triggers for repeated incomplete meals", () => {
      const row = { ...baseRow, image_path: null }
      const meal = mapFoodLogToMealRecord(row)
      const recent = [
        mapFoodLogToMealRecord({ ...baseRow, id: "m2", image_path: null }),
        mapFoodLogToMealRecord({ ...baseRow, id: "m3", image_path: null }),
      ]
      const result = checkRepeatedIncomplete(meal, recent)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
      expect(result!.reason).toBe("repeated_incomplete")
    })
  })

  describe("checkMealGap", () => {
    it("returns null for null timestamp", () => {
      expect(checkMealGap(null)).toBeNull()
    })

    it("returns null for recent meal", () => {
      const recent = new Date(Date.now() - 3600000).toISOString()
      expect(checkMealGap(recent)).toBeNull()
    })

    it("triggers for old meal timestamp", () => {
      const old = new Date(Date.now() - 5 * 3600000).toISOString()
      const result = checkMealGap(old)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
    })
  })
})
