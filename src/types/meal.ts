export type MealStatus = "recorded" | "verified" | "unverified" | "pending"

export type MealType = "breakfast" | "lunch" | "dinner" | "snack"

export type MealReviewState = "auto_logged" | "needs_review" | "reviewed" | "corrected" | "rejected" | "merged"

export type NutritionConfidence = "high" | "medium" | "low"

export type MealReviewReason =
  | "unclear_quantity"
  | "unknown_food"
  | "image_only"
  | "conflicting_input"
  | "duplicate_possible"
  | "low_confidence_ai"
  | "client_correction"
  | "trainer_requested"

export interface MealAttachment {
  path: string
  type: "image"
}

export interface MealReview {
  status: MealStatus
  reviewedBy?: string
  reviewedAt?: string
  notes?: string
}

export interface MealRecord {
  id: string
  clientId: string
  trainerId: string
  mealType: MealType
  mealTimestamp: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  review: MealReview
  reviewState: MealReviewState
  aiConfidence: NutritionConfidence
  reviewReason?: MealReviewReason
  trainerNote?: string
  reviewedAt?: string
  reviewedBy?: string
  mergedIntoId?: string
  attachment?: MealAttachment
  notes?: string
  sourceText?: string
  sourceType?: "text" | "voice" | "image" | "poll" | "unknown"
  createdAt: string
  updatedAt: string
}
