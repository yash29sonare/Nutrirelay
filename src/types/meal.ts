export type MealStatus = "recorded" | "verified" | "unverified" | "pending"

export type MealType = "breakfast" | "lunch" | "dinner" | "snack"

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
  attachment?: MealAttachment
  notes?: string
  createdAt: string
  updatedAt: string
}
