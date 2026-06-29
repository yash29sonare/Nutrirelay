import type { MealRecord } from "@/types/meal"
import type { ReminderReason, ReminderPriority } from "@/types/reminder"
import type { EngagementEvent } from "@/types/engagement-events"
import {
  MEAL_OVERDUE_HOURS,
  MAX_REVIEW_PENDING_HOURS,
  FOLLOW_UP_OVERDUE_HOURS,
  UNANSWERED_CLARIFICATION_HOURS,
} from "@/lib/constants"

export interface RuleResult {
  triggered: boolean
  reason: ReminderReason
  message: string
  templateId: string
  templateParams: string[]
  priority: ReminderPriority
}

function hoursSince(iso: string | null): number | null {
  if (!iso) return null
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
}

export function checkMealOverdue(
  lastMealTimestamp: string | null,
): RuleResult | null {
  const h = hoursSince(lastMealTimestamp)
  if (h !== null && h < MEAL_OVERDUE_HOURS) return null

  return {
    triggered: true,
    reason: "meal_overdue",
    message: h !== null
      ? `No meal recorded in ${Math.floor(h)} hours.`
      : "No meals recorded. Client may need a check-in.",
    templateId: "meal_confirmation",
    templateParams: [],
    priority: h !== null && h >= 8 ? "high" : "medium",
  }
}

export function checkMealReviewPending(
  meals: MealRecord[],
): RuleResult | null {
  const pending = meals.filter(
    (m) => m.review.status === "recorded" || m.review.status === "pending",
  )
  if (pending.length === 0) return null

  const oldestPending = pending.reduce((a, b) =>
    a.mealTimestamp < b.mealTimestamp ? a : b,
  )

  const h = hoursSince(oldestPending.mealTimestamp)
  if (h !== null && h < MAX_REVIEW_PENDING_HOURS) return null

  return {
    triggered: true,
    reason: "meal_review_pending",
    message: `${pending.length} meal(s) awaiting review for ${h ? `${Math.floor(h)} hours` : "some time"}.`,
    templateId: "trainer_alert",
    templateParams: [],
    priority: pending.length >= 3 ? "high" : "medium",
  }
}

export function checkFollowUpOverdue(
  events: EngagementEvent[],
): RuleResult | null {
  const approved = events.filter(
    (e) =>
      e.event_type === "CONVERSATION_APPROVED" &&
      e.payload?.["conversationId"],
  )
  if (approved.length === 0) return null

  const sorted = approved.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const latest = sorted[0]

  const h = hoursSince(latest.created_at)
  if (h !== null && h < FOLLOW_UP_OVERDUE_HOURS) return null

  return {
    triggered: true,
    reason: "follow_up_overdue",
    message: `Approved follow-up not dispatched in ${h ? `${Math.floor(h)} hours` : "some time"}.`,
    templateId: "trainer_alert",
    templateParams: [],
    priority: "medium",
  }
}

export function checkUnansweredClarification(
  events: EngagementEvent[],
): RuleResult | null {
  const clarifications = events.filter(
    (e) =>
      e.event_type === "CONVERSATION_PLANNED" &&
      (e.payload?.["reason"] === "missing_attachment" ||
       e.payload?.["reason"] === "low_information"),
  )
  if (clarifications.length === 0) return null

  const sorted = clarifications.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const latest = sorted[0]

  const h = hoursSince(latest.created_at)
  if (h !== null && h < UNANSWERED_CLARIFICATION_HOURS) return null

  return {
    triggered: true,
    reason: "unanswered_clarification",
    message: `Clarification request sent ${h ? `${Math.floor(h)} hours ago` : "some time ago"} with no client response.`,
    templateId: "missing_details_clarification",
    templateParams: [],
    priority: "medium",
  }
}

export function checkDailyCheckIn(
  mealsToday: number,
): RuleResult | null {
  if (mealsToday > 0) return null

  return {
    triggered: true,
    reason: "daily_check_in",
    message: "No meals logged today. Send a check-in reminder.",
    templateId: "meal_confirmation",
    templateParams: [],
    priority: "low",
  }
}
