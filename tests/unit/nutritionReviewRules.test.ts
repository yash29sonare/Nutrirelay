import { describe, expect, it } from "vitest"
import { countsTowardMacros, decideNutritionReview } from "@/lib/meals/reviewRules"

describe("nutrition review rules", () => {
  it("auto-logs clear meal text with usable macros", () => {
    expect(decideNutritionReview({
      foodName: "chicken rice bowl",
      extractedContent: "chicken rice bowl",
      messageType: "text",
      calories: 520,
      proteinG: 38,
      carbsG: 55,
      fatG: 14,
    })).toMatchObject({
      reviewState: "auto_logged",
      confidence: "high",
      reason: null,
      countsTowardMacros: true,
    })
  })

  it("flags unclear quantity for trainer review", () => {
    expect(decideNutritionReview({
      foodName: "thoda chicken rice khaya",
      extractedContent: "thoda chicken rice khaya",
      messageType: "text",
      calories: 360,
      proteinG: 24,
      carbsG: 42,
      fatG: 9,
    })).toMatchObject({
      reviewState: "needs_review",
      confidence: "medium",
      reason: "unclear_quantity",
      countsTowardMacros: true,
    })
  })

  it("rejects progress photos from nutrition macros", () => {
    expect(decideNutritionReview({
      extractedContent: "weekly progress check",
      messageType: "image",
      mediaKind: "progress_photo",
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    })).toMatchObject({
      reviewState: "rejected",
      confidence: "high",
      countsTowardMacros: false,
    })
  })

  it("flags possible duplicates while keeping them reviewable", () => {
    expect(decideNutritionReview({
      foodName: "2 roti and dal",
      extractedContent: "2 roti and dal",
      messageType: "text",
      calories: 420,
      proteinG: 18,
      carbsG: 62,
      fatG: 10,
      isDuplicate: true,
    })).toMatchObject({
      reviewState: "needs_review",
      confidence: "medium",
      reason: "duplicate_possible",
      countsTowardMacros: true,
    })
  })

  it("excludes rejected and merged rows from macro totals", () => {
    expect(countsTowardMacros("auto_logged")).toBe(true)
    expect(countsTowardMacros("needs_review")).toBe(true)
    expect(countsTowardMacros("reviewed")).toBe(true)
    expect(countsTowardMacros("corrected")).toBe(true)
    expect(countsTowardMacros("rejected")).toBe(false)
    expect(countsTowardMacros("merged")).toBe(false)
  })
})
