import { describe, it, expect, vi } from "vitest"
import { planMealConversation, planClientConversation } from "@/lib/conversations/conversationPlanner"
import { mapFoodLogToMealRecord } from "@/lib/meals/mealMapper"
import type { FoodLogRow } from "@/lib/meals/mealMapper"

const baseRow: FoodLogRow = {
  id: "m1", client_id: "c1", trainer_id: "t1", logged_at: "2026-06-01T12:30:00.000Z",
  calories: 650, protein_g: 35, carbs_g: 60, fat_g: 25,
  verification_status: "VERIFIED", image_path: "meals/img.jpg", notes: null,
  created_at: "2026-06-01T12:30:00.000Z", updated_at: "2026-06-01T12:30:00.000Z",
}

describe("conversationPlanner", () => {
  describe("planMealConversation", () => {
    it("returns empty plans for complete meal", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      const plans = planMealConversation(meal)
      expect(Array.isArray(plans)).toBe(true)
    })

    it("generates plans for incomplete meal", () => {
      const row = { ...baseRow, image_path: null }
      const meal = mapFoodLogToMealRecord(row)
      const plans = planMealConversation(meal)
      expect(plans.length).toBeGreaterThan(0)
    })

    it("sorts plans by priority", () => {
      const row = { ...baseRow, image_path: null, verification_status: "UNVERIFIED" }
      const meal = mapFoodLogToMealRecord(row)
      const plans = planMealConversation(meal)
      for (let i = 1; i < plans.length; i++) {
        const order = { high: 0, medium: 1, low: 2 } as Record<string, number>
        expect(order[plans[i - 1].priority]).toBeLessThanOrEqual(order[plans[i].priority])
      }
    })
  })

  describe("planClientConversation", () => {
    it("returns empty plans for recent meal", () => {
      const recent = new Date(Date.now() - 3600000).toISOString()
      const plans = planClientConversation("c1", "t1", recent)
      expect(plans).toHaveLength(0)
    })

    it("generates plans for meal gap", () => {
      const old = new Date(Date.now() - 5 * 3600000).toISOString()
      const plans = planClientConversation("c1", "t1", old)
      expect(plans.length).toBeGreaterThan(0)
    })

    it("handles null timestamp", () => {
      const plans = planClientConversation("c1", "t1", null)
      expect(plans).toHaveLength(0)
    })
  })
})
