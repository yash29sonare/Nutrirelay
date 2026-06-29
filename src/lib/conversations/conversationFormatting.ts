import type { ConversationPlan, ConversationReason, ConversationPriority } from "@/types/conversation"

const REASON_LABELS: Record<ConversationReason, string> = {
  missing_attachment: "Missing photo",
  low_information: "Low macro info",
  negative_review: "Negative review",
  low_ai_confidence: "Low AI confidence",
  repeated_incomplete: "Repeated incomplete logs",
  long_meal_gap: "Long meal gap",
}

const PRIORITY_LABELS: Record<ConversationPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

export function formatConversationReason(reason: ConversationReason): string {
  return REASON_LABELS[reason] ?? reason
}

export function formatConversationPriority(priority: ConversationPriority): string {
  return PRIORITY_LABELS[priority] ?? priority
}

export function formatConversationSummary(plan: ConversationPlan): string {
  const reason = formatConversationReason(plan.reason)
  return `${reason}: ${plan.message}`
}
