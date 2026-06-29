import type { ReminderReason, ReminderPriority, ReminderStatus } from "@/types/reminder"

const REASON_LABELS: Record<ReminderReason, string> = {
  meal_overdue: "Meal overdue",
  meal_review_pending: "Review pending",
  follow_up_overdue: "Follow-up overdue",
  unanswered_clarification: "Unanswered clarification",
  daily_check_in: "Daily check-in",
}

const PRIORITY_LABELS: Record<ReminderPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

const STATUS_LABELS: Record<ReminderStatus, string> = {
  planned: "Planned",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
}

export function formatReminderReason(reason: ReminderReason): string {
  return REASON_LABELS[reason] ?? reason
}

export function formatReminderPriority(priority: ReminderPriority): string {
  return PRIORITY_LABELS[priority] ?? priority
}

export function formatReminderStatus(status: ReminderStatus): string {
  return STATUS_LABELS[status] ?? status
}

export function formatReminderSummary(
  reason: ReminderReason,
  message: string,
): string {
  return `${formatReminderReason(reason)}: ${message}`
}
