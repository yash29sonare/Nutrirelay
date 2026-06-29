import type { MealRecord } from "@/types/meal"
import type { ConversationPlan } from "@/types/conversation"
import type { ReminderPlan } from "@/types/reminder"
import type { EngagementAction } from "@/types/engagement"
import type { EngagementEvent } from "@/types/engagement-events"
import type { TimelineEntry } from "@/types/timeline"
import type { DashboardDataDTO } from "@/types/dashboard"

const BASE_TIME = "2026-06-29T12:00:00.000Z"

// ── Meal fixtures ────────────────────────────────────────────────────────────

export const mealComplete: MealRecord = {
  id: "meal-complete-1",
  clientId: "client-1",
  trainerId: "trainer-1",
  mealType: "lunch",
  mealTimestamp: BASE_TIME,
  calories: 650,
  proteinG: 35,
  carbsG: 60,
  fatG: 25,
  review: { status: "recorded" },
  attachment: { path: "meals/img.jpg", type: "image" },
  createdAt: BASE_TIME,
  updatedAt: BASE_TIME,
}

export const mealLowCalorie: MealRecord = {
  ...mealComplete,
  id: "meal-low-cal-1",
  calories: 30,
  proteinG: 2,
  carbsG: 5,
  fatG: 1,
  attachment: undefined,
}

export const mealNoAttachment: MealRecord = {
  ...mealComplete,
  id: "meal-no-att-1",
  attachment: undefined,
}

export const mealBreakfast: MealRecord = {
  ...mealComplete,
  id: "meal-breakfast-1",
  mealType: "breakfast",
  mealTimestamp: "2026-06-29T08:00:00.000Z",
}

// ── Conversation plan fixtures ───────────────────────────────────────────────

export const conversationHigh: ConversationPlan = {
  id: "conv-high-1",
  reason: "missing_attachment",
  priority: "high",
  channel: "whatsapp",
  message: "Please attach a photo of your meal.",
  templateId: "missing_details_clarification",
  templateParams: [],
  context: { clientId: "client-1", trainerId: "trainer-1", mealId: "meal-complete-1" },
  createdAt: BASE_TIME,
}

export const conversationMedium: ConversationPlan = {
  ...conversationHigh,
  id: "conv-med-1",
  reason: "low_information",
  priority: "medium",
  message: "Can you provide more details about your meal?",
}

export const conversationLow: ConversationPlan = {
  ...conversationHigh,
  id: "conv-low-1",
  reason: "long_meal_gap",
  priority: "low",
  message: "It's been a while since your last meal log.",
}

// ── Reminder plan fixtures ───────────────────────────────────────────────────

export const reminderOverdue: ReminderPlan = {
  id: "rem-overdue-1",
  reason: "meal_overdue",
  priority: "high",
  status: "active",
  schedule: {
    earliestTriggerAt: BASE_TIME,
    latestTriggerAt: new Date(Date.parse(BASE_TIME) + 7200000).toISOString(),
    maxRepeatCount: 3,
    repeatIntervalMs: 7200000,
  },
  message: "You haven't logged a meal in a while.",
  templateId: "meal_confirmation",
  templateParams: ["Test Client", "meal", "0"],
  context: { clientId: "client-1", trainerId: "trainer-1" },
  createdAt: BASE_TIME,
}

export const reminderReviewPending: ReminderPlan = {
  ...reminderOverdue,
  id: "rem-review-1",
  reason: "meal_review_pending",
  priority: "medium",
  status: "planned",
  message: "Your meal review is pending.",
}

// ── Engagement action fixtures ───────────────────────────────────────────────

export const actionHigh: EngagementAction = {
  id: "action-high-1",
  clientId: "client-1",
  clientName: "Test Client",
  priority: "high",
  type: "check_in",
  reason: "No meals logged in 24 hours",
  confidence: 0.92,
  createdAt: BASE_TIME,
}

export const actionMedium: EngagementAction = {
  ...actionHigh,
  id: "action-med-1",
  priority: "medium",
  type: "message",
  reason: "Low meal logging consistency",
  confidence: 0.75,
}

// ── Timeline entry fixtures ──────────────────────────────────────────────────

export const timelineMealLogged: TimelineEntry = {
  id: "tl-meal-1",
  timestamp: BASE_TIME,
  clientId: "client-1",
  eventType: "MEAL_RECORDED",
  title: "Meal logged",
  description: "Client logged a lunch (650 cal)",
  icon: "utensils",
  severity: "info",
  source: "food_log",
  category: "event",
  metadata: { mealId: "meal-complete-1", calories: 650 },
}

export const timelineActionCreated: TimelineEntry = {
  ...timelineMealLogged,
  id: "tl-action-1",
  eventType: "ACTION_CREATED",
  title: "Action created",
  description: "High-priority check-in created",
  icon: "bell",
  severity: "warning",
  source: "engagement_action",
  category: "action",
  metadata: { actionId: "action-high-1" },
}

// ── Engagement event fixtures ────────────────────────────────────────────────

export const eventMealRecorded: EngagementEvent = {
  id: "evt-meal-1",
  trainer_id: "trainer-1",
  client_id: "client-1",
  action_id: null,
  event_type: "MEAL_RECORDED",
  event_id: "event-meal-1",
  payload: { mealId: "meal-complete-1", mealType: "lunch", calories: 650 },
  created_at: BASE_TIME,
}

export const eventConversationPlanned: EngagementEvent = {
  ...eventMealRecorded,
  id: "evt-conv-1",
  event_type: "CONVERSATION_PLANNED",
  event_id: "event-conv-1",
  payload: { conversationId: "conv-high-1", reason: "missing_attachment", priority: "high" },
}

// ── Dashboard data fixtures ──────────────────────────────────────────────────

export const dashboardSingleClient: DashboardDataDTO = {
  version: "v1",
  trainer: {
    id: "trainer-1",
    auth_user_id: "trainer-1",
    onboarding_status: "completed",
    business_name: "Test Gym",
    timezone: "America/New_York",
    country: "US",
  },
  clients: [
    {
      client_id: "client-1",
      client_name: "Test Client",
      trainer_id: "trainer-1",
      total_meals_logged_today: 2,
      total_calories_today: 1200,
      total_protein_today: 60,
      total_carbs_today: 100,
      total_fat_today: 40,
      active_strike_count: 0,
    },
  ],
  metrics: {
    activeClients: 1,
    complianceRate: 0.75,
    weeklyProgress: 0.1,
    atRiskClients: 0,
  },
  trends: {
    complianceOverTime: [],
    clientActivity: [],
  },
}
