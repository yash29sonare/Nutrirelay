export type ReminderReason =
  | "meal_overdue"
  | "meal_review_pending"
  | "follow_up_overdue"
  | "unanswered_clarification"
  | "daily_check_in"

export type ReminderPriority = "high" | "medium" | "low"

export type ReminderStatus = "planned" | "active" | "completed" | "cancelled"

export interface ReminderSchedule {
  earliestTriggerAt: string
  latestTriggerAt: string
  maxRepeatCount: number
  repeatIntervalMs: number
}

export interface ReminderContext {
  clientId: string
  trainerId: string
  mealId?: string
  conversationId?: string
}

export interface ReminderPlan {
  id: string
  reason: ReminderReason
  priority: ReminderPriority
  status: ReminderStatus
  schedule: ReminderSchedule
  message: string
  templateId: string
  templateParams: string[]
  context: ReminderContext
  createdAt: string
}
