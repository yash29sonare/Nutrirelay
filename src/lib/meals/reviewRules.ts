import { looksMealRelatedText } from "@/mastra/tools/mealParser"
import type { MealReviewReason, MealReviewState, NutritionConfidence } from "@/types/meal"

export interface NutritionReviewInput {
  foodName?: string | null
  extractedContent?: string | null
  messageType?: "text" | "audio" | "image" | "interactive" | "unknown" | null
  mediaKind?: "food_photo" | "progress_photo" | "other_media" | null
  calories?: number | null
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  isDuplicate?: boolean | null
}

export interface NutritionReviewDecision {
  reviewState: MealReviewState
  confidence: NutritionConfidence
  reason: MealReviewReason | null
  countsTowardMacros: boolean
}

const AMBIGUOUS_QUANTITY_RE = /\b(thoda|kuch|maybe|approx|around|little|some|few|andaaza|andaza)\b/i

export function decideNutritionReview(input: NutritionReviewInput): NutritionReviewDecision {
  const text = `${input.foodName ?? ""} ${input.extractedContent ?? ""}`.trim()
  const calories = input.calories ?? 0
  const hasMacros = [input.calories, input.proteinG, input.carbsG, input.fatG]
    .some((value) => typeof value === "number" && Number.isFinite(value) && value > 0)

  if (input.mediaKind === "progress_photo" || input.mediaKind === "other_media") {
    return { reviewState: "rejected", confidence: "high", reason: null, countsTowardMacros: false }
  }

  if (input.isDuplicate) {
    return { reviewState: "needs_review", confidence: "medium", reason: "duplicate_possible", countsTowardMacros: true }
  }

  if (input.messageType === "image" && !text) {
    return { reviewState: "needs_review", confidence: "low", reason: "image_only", countsTowardMacros: true }
  }

  if (input.messageType === "image" && input.mediaKind === "food_photo" && !looksMealRelatedText(text)) {
    return { reviewState: "needs_review", confidence: "medium", reason: "image_only", countsTowardMacros: true }
  }

  if (!hasMacros || !text || /unknown|not_food/i.test(text)) {
    return { reviewState: "needs_review", confidence: "low", reason: "unknown_food", countsTowardMacros: true }
  }

  if (AMBIGUOUS_QUANTITY_RE.test(text)) {
    return { reviewState: "needs_review", confidence: "medium", reason: "unclear_quantity", countsTowardMacros: true }
  }

  if (calories > 1500 || (calories > 0 && calories < 40)) {
    return { reviewState: "needs_review", confidence: "medium", reason: "low_confidence_ai", countsTowardMacros: true }
  }

  return { reviewState: "auto_logged", confidence: "high", reason: null, countsTowardMacros: true }
}

export function countsTowardMacros(reviewState?: MealReviewState | null): boolean {
  return reviewState !== "rejected" && reviewState !== "merged"
}
