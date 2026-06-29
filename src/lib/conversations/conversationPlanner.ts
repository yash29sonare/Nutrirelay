import type { MealRecord } from "@/types/meal"
import type { MealAIResult } from "@/types/meal-ai"
import type { ConversationPlan, ConversationReason, ConversationPriority } from "@/types/conversation"
import {
  checkMissingAttachment,
  checkLowInformation,
  checkNegativeReview,
  checkLowAIConfidence,
  checkRepeatedIncomplete,
  checkMealGap,
} from "./conversationRules"
import { appendEvents } from "@/lib/events/engagementEventStore"

type RuleFn = () => import("./conversationRules").RuleResult | null

function planId(seed: string): string {
  return `conv-${seed}-${Date.now()}`
}

function buildTemplateParams(
  reason: ConversationReason,
  _meal?: MealRecord,
): string[] {
  switch (reason) {
    case "missing_attachment":
    case "low_information":
      return []
    case "negative_review":
    case "low_ai_confidence":
    case "repeated_incomplete":
      return []
    case "long_meal_gap":
      return []
  }
}

const PRIORITY_ORDER: Record<ConversationPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export function planMealConversation(
  meal: MealRecord,
  aiResult?: MealAIResult,
  recentMeals?: MealRecord[],
): ConversationPlan[] {
  const now = new Date().toISOString()
  const plans: ConversationPlan[] = []

  const rules: RuleFn[] = [
    () => checkMissingAttachment(meal),
    () => checkLowInformation(meal),
    () => checkNegativeReview(meal),
  ]

  if (aiResult) {
    rules.push(() => checkLowAIConfidence(aiResult))
  }

  if (recentMeals) {
    rules.push(() => checkRepeatedIncomplete(meal, recentMeals))
  }

  for (const rule of rules) {
    const result = rule()
    if (result && result.triggered) {
      const templateParams = buildTemplateParams(result.reason, meal)
      plans.push({
        id: planId(`${meal.id}-${result.reason}`),
        reason: result.reason,
        priority: result.priority,
        channel: "whatsapp",
        message: result.message,
        templateId: result.templateId,
        templateParams,
        context: {
          mealId: meal.id,
          clientId: meal.clientId,
          trainerId: meal.trainerId,
          aiConfidence: aiResult?.confidence.overall,
          mealType: meal.mealType,
        },
        createdAt: now,
      })
    }
  }

  plans.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  return plans
}

export function planClientConversation(
  clientId: string,
  trainerId: string,
  lastMealTimestamp: string | null,
): ConversationPlan[] {
  const now = new Date().toISOString()
  const plans: ConversationPlan[] = []

  const gapResult = checkMealGap(lastMealTimestamp)
  if (gapResult && gapResult.triggered) {
    plans.push({
      id: planId(`${clientId}-meal-gap`),
      reason: gapResult.reason,
      priority: gapResult.priority,
      channel: "whatsapp",
      message: gapResult.message,
      templateId: gapResult.templateId,
      templateParams: [],
      context: {
        clientId,
        trainerId,
      },
      createdAt: now,
    })
  }

  return plans
}

export async function planConversation(
  meal: MealRecord,
  aiResult?: MealAIResult,
  recentMeals?: MealRecord[],
): Promise<{
  plans: ConversationPlan[]
  events: { client_id: string; event_type: "CONVERSATION_PLANNED"; event_id: string; payload: Record<string, unknown> }[]
}> {
  const plans = planMealConversation(meal, aiResult, recentMeals)

  const events = plans.map((p) => ({
    client_id: p.context.clientId,
    action_id: null,
    event_type: "CONVERSATION_PLANNED" as const,
    event_id: `conv-event-${p.id}`,
    payload: {
      conversationId: p.id,
      reason: p.reason,
      priority: p.priority,
      message: p.message,
      templateId: p.templateId,
    },
  }))

  if (plans.length > 0) {
    await appendEvents(meal.trainerId, events)
  }

  return { plans, events }
}
