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

export interface ClientRoutineTiming {
  wakeTime?: string | null
  breakfastTime?: string | null
  lunchTime?: string | null
  snackTime?: string | null
  dinnerTime?: string | null
  workoutTime?: string | null
  restDays?: string[] | null
  postWorkoutDelayMinutes?: number | null
  preWorkoutOffsetMinutes?: number | null
  skippedMeals?: string[] | null
}

function hasSkippedMeal(routine: ClientRoutineTiming | null | undefined, mealType: string): boolean {
  return Array.isArray(routine?.skippedMeals)
    && routine.skippedMeals.some((value) => value.toLowerCase() === mealType)
}

function planId(seed: string): string {
  return `rem-${seed}-${Date.now()}`
}

function getRoutineAnchoredWindow(anchorTime: string): {
  earliestTriggerAt: string
  latestTriggerAt: string
} | null {
  const [hourText, minuteText] = anchorTime.split(":")
  const hour = Number.parseInt(hourText ?? "", 10)
  const minute = Number.parseInt(minuteText ?? "", 10)

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null
  }

  const now = new Date()
  const anchored = new Date(now)
  anchored.setHours(hour, minute, 0, 0)

  if (anchored.getTime() <= now.getTime()) {
    anchored.setDate(anchored.getDate() + 1)
  }

  const latest = new Date(anchored.getTime() + 60 * 60 * 1000)

  return {
    earliestTriggerAt: anchored.toISOString(),
    latestTriggerAt: latest.toISOString(),
  }
}

function addMinutesToTime(time: string, minutesToAdd: number): string | null {
  const [hourText, minuteText] = time.split(":")
  const hour = Number.parseInt(hourText ?? "", 10)
  const minute = Number.parseInt(minuteText ?? "", 10)

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null
  }

  const total = (((hour * 60 + minute + minutesToAdd) % 1440) + 1440) % 1440
  const nextHour = Math.floor(total / 60).toString().padStart(2, "0")
  const nextMinute = (total % 60).toString().padStart(2, "0")
  return `${nextHour}:${nextMinute}`
}

export function resolveRoutineAnchorTime(
  reason: ReminderReason,
  routine?: ClientRoutineTiming | null,
  fallback?: string | null,
  referenceDate: Date = new Date(),
): string | null {
  if (!routine) return fallback ?? null

  if (reason === "daily_check_in") {
    return routine.wakeTime ?? fallback ?? null
  }

  if (reason !== "meal_overdue") {
    return fallback ?? null
  }

  const weekday = referenceDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }).toLowerCase()
  const isRestDay = Array.isArray(routine.restDays) && routine.restDays.map((day) => day.toLowerCase()).includes(weekday)

  if (!isRestDay && routine.workoutTime && routine.postWorkoutDelayMinutes !== null && routine.postWorkoutDelayMinutes !== undefined) {
    return addMinutesToTime(routine.workoutTime, 60 + routine.postWorkoutDelayMinutes) ?? routine.dinnerTime ?? fallback ?? null
  }

  const mealAnchors = [
    routine.lunchTime,
    routine.snackTime,
    routine.dinnerTime,
    !hasSkippedMeal(routine, "breakfast") ? routine.breakfastTime : null,
  ]

  return mealAnchors.find((value) => Boolean(value)) ?? fallback ?? null
}

function buildSchedule(
  reason: ReminderReason,
  routineAnchorTime?: string | null,
  routine?: ClientRoutineTiming | null,
): ReminderSchedule {
  const now = Date.now()
  const hourMs = 60 * 60 * 1000
  const resolvedAnchor = resolveRoutineAnchorTime(reason, routine, routineAnchorTime)
  const anchoredWindow =
    resolvedAnchor && (reason === "meal_overdue" || reason === "daily_check_in")
      ? getRoutineAnchoredWindow(resolvedAnchor)
      : null

  switch (reason) {
    case "meal_overdue":
    case "daily_check_in":
      return {
        earliestTriggerAt: anchoredWindow?.earliestTriggerAt ?? new Date(now + hourMs).toISOString(),
        latestTriggerAt: anchoredWindow?.latestTriggerAt ?? new Date(now + 2 * hourMs).toISOString(),
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
    routineAnchorTime?: string | null
    routine?: ClientRoutineTiming | null
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
      const schedule = buildSchedule(result.reason, input.routineAnchorTime, input.routine)
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
    routineAnchorTime?: string | null
    routine?: ClientRoutineTiming | null
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
      routineAnchorTime: data.routineAnchorTime,
      routine: data.routine,
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
    routineAnchorTime?: string | null
    routine?: ClientRoutineTiming | null
  }>,
  persistEvents: (events: EngagementEventInput[]) => Promise<void>,
): Promise<ReminderPlan[]> {
  const { plans, events } = planTrainerReminders(trainerId, clientsData)

  if (events.length > 0) {
    await persistEvents(events)
  }

  return plans
}
