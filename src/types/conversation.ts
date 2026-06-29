export type ConversationReason =
  | "missing_attachment"
  | "low_information"
  | "negative_review"
  | "low_ai_confidence"
  | "repeated_incomplete"
  | "long_meal_gap"

export type ConversationPriority = "high" | "medium" | "low"

export type ConversationChannel = "whatsapp"

export type ConversationStatus = "planned" | "sent" | "completed"

export interface ConversationContext {
  mealId?: string
  clientId: string
  trainerId: string
  aiConfidence?: string
  mealType?: string
}

export interface ConversationPlan {
  id: string
  reason: ConversationReason
  priority: ConversationPriority
  channel: ConversationChannel
  message: string
  templateId: string
  templateParams: string[]
  context: ConversationContext
  createdAt: string
}
