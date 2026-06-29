import { describe, it, expect } from "vitest"
import { validateMealType, validateMacros, validateMealRecord, isValidReviewStatus } from "@/lib/meals/mealValidation"

describe("mealValidation", () => {
  describe("validateMealType", () => {
    it("returns null for valid meal types", () => {
      expect(validateMealType("breakfast")).toBeNull()
      expect(validateMealType("lunch")).toBeNull()
      expect(validateMealType("dinner")).toBeNull()
      expect(validateMealType("snack")).toBeNull()
    })

    it("returns error for invalid meal type", () => {
      const err = validateMealType("brunch")
      expect(err).not.toBeNull()
      expect(err!.field).toBe("mealType")
    })
  })

  describe("validateMacros", () => {
    it("returns null for valid values", () => {
      expect(validateMacros(500, "calories")).toBeNull()
      expect(validateMacros(0, "proteinG")).toBeNull()
    })

    it("returns null for null or undefined", () => {
      expect(validateMacros(null, "calories")).toBeNull()
      expect(validateMacros(undefined, "calories")).toBeNull()
    })

    it("returns error for negative values", () => {
      const err = validateMacros(-1, "calories")
      expect(err).not.toBeNull()
      expect(err!.field).toBe("calories")
    })

    it("returns error for values exceeding max", () => {
      const err = validateMacros(10001, "calories")
      expect(err).not.toBeNull()
      expect(err!.message).toContain("10000")
    })

    it("returns error for non-finite values", () => {
      expect(validateMacros(Infinity, "calories")).not.toBeNull()
      expect(validateMacros(NaN, "calories")).not.toBeNull()
    })
  })

  describe("validateMealRecord", () => {
    it("returns empty errors for valid input", () => {
      const errors = validateMealRecord({ mealType: "lunch", calories: 500, proteinG: 30 })
      expect(errors).toHaveLength(0)
    })

    it("returns error for invalid meal type", () => {
      const errors = validateMealRecord({ mealType: "invalid" })
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].field).toBe("mealType")
    })

    it("returns error for negative values", () => {
      const errors = validateMealRecord({ mealType: "lunch", calories: -100 })
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((e) => e.field === "calories")).toBe(true)
    })

    it("is deterministic", () => {
      const a = validateMealRecord({ mealType: "breakfast", calories: 300 })
      const b = validateMealRecord({ mealType: "breakfast", calories: 300 })
      expect(a).toEqual(b)
    })

    it("accepts missing optional fields", () => {
      const errors = validateMealRecord({ mealType: "dinner" })
      expect(errors).toHaveLength(0)
    })
  })

  describe("isValidReviewStatus", () => {
    it("returns true for valid statuses", () => {
      expect(isValidReviewStatus("recorded")).toBe(true)
      expect(isValidReviewStatus("verified")).toBe(true)
      expect(isValidReviewStatus("unverified")).toBe(true)
      expect(isValidReviewStatus("pending")).toBe(true)
    })

    it("returns false for invalid status", () => {
      expect(isValidReviewStatus("unknown")).toBe(false)
    })
  })
})
