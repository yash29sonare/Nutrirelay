import type { MealRecord } from "@/types/meal"
import type { ReminderPlan, ReminderStatus, ReminderSchedule, ReminderContext, ReminderReason } from "@/types/reminder"
import type { EngagementEvent, EngagementEventInput } from "@/types/engagement-events"
import type { RuleResult } from "./reminderRules"
import {
  checkMealOverdue,
  checkMealReviewPending,
  checkFollowUpOverdue,
  checkUnansweredClarification,
  checkDailyCheckIn,
} from "./reminderRules"

type RuleFn = () => RuleResult | null

function planId(seed: string): string {
  return `rem-${seed}-${Date.now()}`
}

function buildSchedule(reason: ReminderReason): ReminderSchedule {
  const now = Date.now()
  const hourMs = 60 * 60 * 1000

  switch (reason) {
    case "meal_overdue":
    case "daily_check_in":
      return {
        earliestTriggerAt: new Date(now + hourMs).toISOString(),
        latestTriggerAt: new Date(now + 2 * hourMs).toISOString(),
        maxRepeatCount: 3,
        repeatIntervalMs: 2 * hourMs,
      }
    case "meal_review_pending":
      return {
        earliestTriggerAt: new Date(now + 30 * 60 * 1000).toISOString(),
        latestTriggerAt: new Date(now + hourMs).toISOString(),
        maxRepeatCount: 2,
        repeatIntervalMs: 4 * hourMs,
      }
    case "follow_up_overdue":
      return {
        earliestTriggerAt: new Date(now + 30 * 60 * 1000).toISOString(),
        latestTriggerAt: new Date(now + hourMs).toISOString(),
        maxRepeatCount: 2,
        repeatIntervalMs: hourMs,
      }
    case "unanswered_clarification":
      return {
        earliestTriggerAt: new Date(now + 15 * 60 * 1000).toISOString(),
        latestTriggerAt: new Date(now + 30 * 60 * 1000).toISOString(),
        maxRepeatCount: 1,
        repeatIntervalMs: 0,
      }
  }
}

function buildContext(
  clientId: string,
  trainerId: string,
  ruleResult: RuleResult,
  meals?: MealRecord[],
  events?: EngagementEvent[],
): ReminderContext {
  const ctx: ReminderContext = { clientId, trainerId }

  if (ruleResult.reason === "meal_overdue" || ruleResult.reason === "meal_review_pending") {
    const meal = meals?.find((m) => m.review.status === "recorded" || m.review.status === "pending")
    if (meal) ctx.mealId = meal.id
  }

  if (ruleResult.reason === "follow_up_overdue") {
    const ev = events?.find((e) => e.event_type === "CONVERSATION_APPROVED")
    const convId = ev?.payload?.["conversationId"]
    if (typeof convId === "string") ctx.conversationId = convId
  }

  return ctx
}

function buildEventInput(
  plan: ReminderPlan,
): EngagementEventInput {
  return {
    client_id: plan.context.clientId,
    action_id: null,
    event_type: "REMINDER_PLANNED",
    event_id: `rem-event-${plan.id}`,
    payload: {
      reminderId: plan.id,
      reason: plan.reason,
      priority: plan.priority,
      message: plan.message,
      templateId: plan.templateId,
      schedule: plan.schedule,
    },
  }
}

export function planClientReminders(
  clientId: string,
  trainerId: string,
  input: {
    meals: MealRecord[]
    events: EngagementEvent[]
    mealsToday: number
    lastMealTimestamp: string | null
  },
): { plans: ReminderPlan[]; events: EngagementEventInput[] } {
  const now = new Date().toISOString()
  const plans: ReminderPlan[] = []

  const rules: RuleFn[] = [
    () => checkMealOverdue(input.lastMealTimestamp),
    () => checkMealReviewPending(input.meals),
    () => checkFollowUpOverdue(input.events),
    () => checkUnansweredClarification(input.events),
    () => checkDailyCheckIn(input.mealsToday),
  ]

  for (const rule of rules) {
    const result = rule()
    if (result && result.triggered) {
      const schedule = buildSchedule(result.reason)
      const context = buildContext(clientId, trainerId, result, input.meals, input.events)
      const status: ReminderStatus = schedule.earliestTriggerAt <= now ? "active" : "planned"

      plans.push({
        id: planId(`${clientId}-${result.reason}`),
        reason: result.reason,
        priority: result.priority,
        status,
        schedule,
        message: result.message,
        templateId: result.templateId,
        templateParams: result.templateParams,
        context,
        createdAt: now,
      })
    }
  }

  const events = plans.map(buildEventInput)

  return { plans, events }
}

export function planTrainerReminders(
  trainerId: string,
  clientsData: Array<{
    clientId: string
    meals: MealRecord[]
    events: EngagementEvent[]
    mealsToday: number
    lastMealTimestamp: string | null
  }>,
): { plans: ReminderPlan[]; events: EngagementEventInput[] } {
  const allPlans: ReminderPlan[] = []
  const allEvents: EngagementEventInput[] = []

  for (const data of clientsData) {
    const result = planClientReminders(data.clientId, trainerId, {
      meals: data.meals,
      events: data.events,
      mealsToday: data.mealsToday,
      lastMealTimestamp: data.lastMealTimestamp,
    })
    allPlans.push(...result.plans)
    allEvents.push(...result.events)
  }

  return { plans: allPlans, events: allEvents }
}

export async function planReminders(
  trainerId: string,
  clientsData: Array<{
    clientId: string
    meals: MealRecord[]
    events: EngagementEvent[]
    mealsToday: number
    lastMealTimestamp: string | null
  }>,
  persistEvents: (events: EngagementEventInput[]) => Promise<void>,
): Promise<ReminderPlan[]> {
  const { plans, events } = planTrainerReminders(trainerId, clientsData)

  if (events.length > 0) {
    await persistEvents(events)
  }

  return plans
}
