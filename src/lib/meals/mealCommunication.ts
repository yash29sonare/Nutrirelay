import type { MealRecord } from "@/types/meal"
import { LOW_CALORIE_THRESHOLD, MIN_MACRO_FIELDS } from "@/lib/constants"

export type FollowUpReason =
  | "missing_attachment"
  | "low_information"
  | "negative_review"
  | "missing_required_info"

export interface FollowUpRequest {
  type: "follow_up"
  mealId: string
  clientId: string
  trainerId: string
  reason: FollowUpReason
  message: string
  templateId: string
  templateParams: string[]
  createdAt: string
}

export interface ReminderRequest {
  type: "reminder"
  clientId: string
  trainerId: string
  mealType?: string
  message: string
  templateId: string
  templateParams: string[]
  createdAt: string
}

export type CommunicationRequest = FollowUpRequest | ReminderRequest

export interface FollowUpResult {
  requests: FollowUpRequest[]
  reminders: ReminderRequest[]
}

function hasSufficientInfo(meal: MealRecord): boolean {
  if (meal.calories <= LOW_CALORIE_THRESHOLD) return false
  let filled = 0
  if (meal.proteinG > 0) filled++
  if (meal.carbsG > 0) filled++
  if (meal.fatG > 0) filled++
  return filled >= MIN_MACRO_FIELDS
}

function hasPhotoEvidence(meal: MealRecord): boolean {
  return !!meal.attachment
}

export function evaluateFollowUp(meal: MealRecord): FollowUpRequest | null {
  const now = new Date().toISOString()

  if (!hasPhotoEvidence(meal)) {
    return {
      type: "follow_up",
      mealId: meal.id,
      clientId: meal.clientId,
      trainerId: meal.trainerId,
      reason: "missing_attachment",
      message: "Meal recorded without photo evidence. Requesting image.",
      templateId: "missing_details_clarification",
      templateParams: [],
      createdAt: now,
    }
  }

  if (!hasSufficientInfo(meal)) {
    return {
      type: "follow_up",
      mealId: meal.id,
      clientId: meal.clientId,
      trainerId: meal.trainerId,
      reason: "low_information",
      message: "Meal recorded with insufficient macro information. Requesting clarification.",
      templateId: "missing_details_clarification",
      templateParams: [],
      createdAt: now,
    }
  }

  if (meal.review.status === "unverified") {
    return {
      type: "follow_up",
      mealId: meal.id,
      clientId: meal.clientId,
      trainerId: meal.trainerId,
      reason: "negative_review",
      message: `Meal marked unverified${meal.review.notes ? `: ${meal.review.notes}` : ""}. Trainer follow-up required.`,
      templateId: "trainer_alert",
      templateParams: [],
      createdAt: now,
    }
  }

  return null
}

export function evaluateReminderNeed(
  clientId: string,
  trainerId: string,
  lastMealTimestamp: string | null,
  expectedMealType?: string,
): ReminderRequest | null {
  if (!lastMealTimestamp) {
    return {
      type: "reminder",
      clientId,
      trainerId,
      message: "No meals recorded yet today. Sending meal reminder.",
      templateId: "meal_confirmation",
      templateParams: [],
      createdAt: new Date().toISOString(),
    }
  }

  const hoursSinceLastMeal =
    (Date.now() - new Date(lastMealTimestamp).getTime()) / (1000 * 60 * 60)

  if (hoursSinceLastMeal >= 4) {
    return {
      type: "reminder",
      clientId,
      trainerId,
      mealType: expectedMealType,
      message: `No meal recorded in ${Math.floor(hoursSinceLastMeal)} hours. Sending reminder.`,
      templateId: "meal_confirmation",
      templateParams: [],
      createdAt: new Date().toISOString(),
    }
  }

  return null
}

export function evaluateMeal(meal: MealRecord): CommunicationRequest[] {
  const requests: CommunicationRequest[] = []

  const followUp = evaluateFollowUp(meal)
  if (followUp) requests.push(followUp)

  return requests
}
