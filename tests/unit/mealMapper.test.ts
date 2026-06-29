import { describe, it, expect } from "vitest"
import { mapFoodLogToMealRecord, mapMealRecordToDBInsert, mapMealRecordToDBUpdate } from "@/lib/meals/mealMapper"
import type { FoodLogRow } from "@/lib/meals/mealMapper"

const baseRow: FoodLogRow = {
  id: "meal-1",
  client_id: "c1",
  trainer_id: "t1",
  logged_at: "2026-06-01T12:30:00.000Z",
  calories: 650,
  protein_g: 35,
  carbs_g: 60,
  fat_g: 25,
  verification_status: "UNVERIFIED",
  image_path: null,
  notes: null,
  created_at: "2026-06-01T12:30:00.000Z",
  updated_at: "2026-06-01T12:30:00.000Z",
}

describe("mealMapper", () => {
  describe("mapFoodLogToMealRecord", () => {
    it("maps a food log row to a MealRecord", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      expect(meal.id).toBe("meal-1")
      expect(meal.clientId).toBe("c1")
      expect(meal.calories).toBe(650)
      expect(meal.review.status).toBe("unverified")
    })

    it("derives meal type from timestamp, returning a valid type", () => {
      const valid = ["breakfast", "lunch", "dinner", "snack"]
      const meal = mapFoodLogToMealRecord(baseRow)
      expect(valid).toContain(meal.mealType)
    })

    it("handles null image_path", () => {
      const meal = mapFoodLogToMealRecord(baseRow)
      expect(meal.attachment).toBeUndefined()
    })

    it("maps image_path to attachment", () => {
      const meal = mapFoodLogToMealRecord({ ...baseRow, image_path: "meals/img.jpg" })
      expect(meal.attachment).toBeDefined()
      expect(meal.attachment!.path).toBe("meals/img.jpg")
    })

    it("is deterministic", () => {
      const a = mapFoodLogToMealRecord(baseRow)
      const b = mapFoodLogToMealRecord(baseRow)
      expect(a).toEqual(b)
    })
  })

  describe("mapMealRecordToDBInsert", () => {
    it("maps a MealRecord to a DB insert object", () => {
      const record = mapFoodLogToMealRecord(baseRow)
      const db = mapMealRecordToDBInsert(record)
      expect(db.client_id).toBe("c1")
      expect(db.calories).toBe(650)
      expect(db.verification_status).toBe("UNVERIFIED")
    })
  })

  describe("mapMealRecordToDBUpdate", () => {
    it("maps partial MealRecord to DB update", () => {
      const update = mapMealRecordToDBUpdate({ calories: 700, proteinG: 40 })
      expect(update.calories).toBe(700)
      expect(update.protein_g).toBe(40)
    })

    it("omits undefined fields", () => {
      const update = mapMealRecordToDBUpdate({ calories: 700 })
      expect(update).not.toHaveProperty("protein_g")
    })

    it("maps review status to verification_status", () => {
      const update = mapMealRecordToDBUpdate({ review: { status: "verified" } } as any)
      expect(update.verification_status).toBe("VERIFIED")
    })
  })
})
