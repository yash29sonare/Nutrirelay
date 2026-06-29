import type { MealRecord } from "@/types/meal"
import type { MealAIResult } from "@/types/meal-ai"
import type { ConversationReason } from "@/types/conversation"
import { LOW_CALORIE_THRESHOLD, MIN_MACRO_FIELDS, MEAL_GAP_HOURS } from "@/lib/constants"

export interface RuleResult {
  triggered: boolean
  reason: ConversationReason
  message: string
  templateId: string
  templateParams: string[]
  priority: "high" | "medium" | "low"
}

const LOW_CONFIDENCE_THRESHOLD: "high" | "medium" | "low" = "low"

function hasSufficientInfo(meal: MealRecord): boolean {
  if (meal.calories <= LOW_CALORIE_THRESHOLD) return false
  let filled = 0
  if (meal.proteinG > 0) filled++
  if (meal.carbsG > 0) filled++
  if (meal.fatG > 0) filled++
  return filled >= MIN_MACRO_FIELDS
}

export function checkMissingAttachment(meal: MealRecord): RuleResult | null {
  if (meal.attachment) return null
  return {
    triggered: true,
    reason: "missing_attachment",
    message: "Meal recorded without photo evidence.",
    templateId: "missing_details_clarification",
    templateParams: [],
    priority: "medium",
  }
}

export function checkLowInformation(meal: MealRecord): RuleResult | null {
  if (hasSufficientInfo(meal)) return null
  return {
    triggered: true,
    reason: "low_information",
    message: "Meal recorded with insufficient macro information.",
    templateId: "missing_details_clarification",
    templateParams: [],
    priority: "medium",
  }
}

export function checkNegativeReview(meal: MealRecord): RuleResult | null {
  if (meal.review.status !== "unverified") return null
  return {
    triggered: true,
    reason: "negative_review",
    message: `Meal was marked unverified${meal.review.notes ? `: ${meal.review.notes}` : ""}.`,
    templateId: "trainer_alert",
    templateParams: [],
    priority: "high",
  }
}

export function checkLowAIConfidence(aiResult: MealAIResult): RuleResult | null {
  if (aiResult.confidence.overall !== LOW_CONFIDENCE_THRESHOLD) return null
  return {
    triggered: true,
    reason: "low_ai_confidence",
    message: "AI analysis confidence is low. Manual review recommended.",
    templateId: "trainer_alert",
    templateParams: [],
    priority: "medium",
  }
}

export function checkRepeatedIncomplete(
  meal: MealRecord,
  recentMeals: MealRecord[],
): RuleResult | null {
  const incompleteCount = recentMeals.filter((m) => {
    if (m.id === meal.id) return false
    if (!m.attachment) return true
    if (m.calories <= LOW_CALORIE_THRESHOLD) return true
    return false
  }).length

  if (incompleteCount < 2) return null
  return {
    triggered: true,
    reason: "repeated_incomplete",
    message: `${incompleteCount + 1} consecutive incomplete meals logged.`,
    templateId: "trainer_alert",
    templateParams: [],
    priority: "high",
  }
}

export function checkMealGap(lastMealTimestamp: string | null): RuleResult | null {
  if (!lastMealTimestamp) return null

  const hoursSinceLastMeal =
    (Date.now() - new Date(lastMealTimestamp).getTime()) / (1000 * 60 * 60)

  if (hoursSinceLastMeal < MEAL_GAP_HOURS) return null
  return {
    triggered: true,
    reason: "long_meal_gap",
    message: `No meal recorded in ${Math.floor(hoursSinceLastMeal)} hours.`,
    templateId: "meal_confirmation",
    templateParams: [],
    priority: "medium",
  }
}
