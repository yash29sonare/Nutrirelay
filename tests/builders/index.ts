import type { MealRecord, MealType, MealStatus } from "@/types/meal"
import type { ConversationPlan, ConversationReason, ConversationPriority } from "@/types/conversation"
import type { ReminderPlan, ReminderReason, ReminderPriority, ReminderStatus } from "@/types/reminder"
import type { EngagementAction, ActionType, ActionPriority } from "@/types/engagement"
import type { EngagementEvent, EngagementEventType } from "@/types/engagement-events"
import type { TimelineEntry, TimelineSeverity, TimelineSource, TimelineCategory } from "@/types/timeline"
import type { DashboardDataDTO, ClientSummary } from "@/types/dashboard"

let counter = 0

function seq(prefix: string): string {
  counter++
  return `${prefix}-${counter}-${Date.now()}`
}

export function resetCounter(): void {
  counter = 0
}

// ── Meal builder ─────────────────────────────────────────────────────────────

export interface CreateMealOverrides {
  id?: string
  clientId?: string
  trainerId?: string
  mealType?: MealType
  calories?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  reviewStatus?: MealStatus
  hasAttachment?: boolean
  mealTimestamp?: string
}

export function createMeal(overrides?: CreateMealOverrides): MealRecord {
  const id = overrides?.id ?? seq("meal")
  return {
    id,
    clientId: overrides?.clientId ?? "client-1",
    trainerId: overrides?.trainerId ?? "trainer-1",
    mealType: overrides?.mealType ?? "lunch",
    mealTimestamp: overrides?.mealTimestamp ?? new Date().toISOString(),
    calories: overrides?.calories ?? 650,
    proteinG: overrides?.proteinG ?? 35,
    carbsG: overrides?.carbsG ?? 60,
    fatG: overrides?.fatG ?? 25,
    review: {
      status: overrides?.reviewStatus ?? "recorded",
    },
    attachment: overrides?.hasAttachment ? { path: "meals/img.jpg", type: "image" } : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ── Client builder ────────────────────────────────────────────────────────────

export interface CreateClientOverrides {
  clientId?: string
  clientName?: string
  trainerId?: string
  mealsLoggedToday?: number
  caloriesToday?: number
  proteinToday?: number
  strikeCount?: number
}

export function createClient(overrides?: CreateClientOverrides): ClientSummary {
  return {
    client_id: overrides?.clientId ?? seq("client"),
    client_name: overrides?.clientName ?? "Test Client",
    trainer_id: overrides?.trainerId ?? "trainer-1",
    total_meals_logged_today: overrides?.mealsLoggedToday ?? 2,
    total_calories_today: overrides?.caloriesToday ?? 1200,
    total_protein_today: overrides?.proteinToday ?? 60,
    total_carbs_today: 100,
    total_fat_today: 40,
    active_strike_count: overrides?.strikeCount ?? 0,
  }
}

// ── ConversationPlan builder ──────────────────────────────────────────────────

export interface CreateConversationOverrides {
  id?: string
  clientId?: string
  trainerId?: string
  reason?: ConversationReason
  priority?: ConversationPriority
  message?: string
  templateId?: string
}

export function createConversationPlan(overrides?: CreateConversationOverrides): ConversationPlan {
  return {
    id: overrides?.id ?? seq("conv"),
    reason: overrides?.reason ?? "low_information",
    priority: overrides?.priority ?? "medium",
    channel: "whatsapp",
    message: overrides?.message ?? "Can you provide more details about your meal?",
    templateId: overrides?.templateId ?? "missing_details_clarification",
    templateParams: [],
    context: {
      clientId: overrides?.clientId ?? "client-1",
      trainerId: overrides?.trainerId ?? "trainer-1",
    },
    createdAt: new Date().toISOString(),
  }
}

// ── ReminderPlan builder ──────────────────────────────────────────────────────

export interface CreateReminderOverrides {
  id?: string
  clientId?: string
  trainerId?: string
  reason?: ReminderReason
  priority?: ReminderPriority
  status?: ReminderStatus
  message?: string
  templateId?: string
}

export function createReminderPlan(overrides?: CreateReminderOverrides): ReminderPlan {
  const now = Date.now()
  return {
    id: overrides?.id ?? seq("rem"),
    reason: overrides?.reason ?? "meal_overdue",
    priority: overrides?.priority ?? "medium",
    status: overrides?.status ?? "planned",
    schedule: {
      earliestTriggerAt: new Date(now + 3600000).toISOString(),
      latestTriggerAt: new Date(now + 7200000).toISOString(),
      maxRepeatCount: 3,
      repeatIntervalMs: 7200000,
    },
    message: overrides?.message ?? "Don't forget to log your meal!",
    templateId: overrides?.templateId ?? "meal_confirmation",
    templateParams: ["Test Client", "meal", "0"],
    context: {
      clientId: overrides?.clientId ?? "client-1",
      trainerId: overrides?.trainerId ?? "trainer-1",
    },
    createdAt: new Date().toISOString(),
  }
}

// ── EngagementAction builder ──────────────────────────────────────────────────

export interface CreateActionOverrides {
  id?: string
  clientId?: string
  clientName?: string
  priority?: ActionPriority
  type?: ActionType
  reason?: string
  confidence?: number
}

export function createAction(overrides?: CreateActionOverrides): EngagementAction {
  return {
    id: overrides?.id ?? seq("action"),
    clientId: overrides?.clientId ?? "client-1",
    clientName: overrides?.clientName ?? "Test Client",
    priority: overrides?.priority ?? "medium",
    type: overrides?.type ?? "message",
    reason: overrides?.reason ?? "Low meal logging compliance",
    confidence: overrides?.confidence ?? 0.85,
    createdAt: new Date().toISOString(),
  }
}

// ── EngagementEvent builder ───────────────────────────────────────────────────

export interface CreateEventOverrides {
  clientId?: string | null
  trainerId?: string
  eventType?: EngagementEventType
  eventId?: string
  payload?: Record<string, unknown> | null
}

export function createEvent(overrides?: CreateEventOverrides): EngagementEvent {
  return {
    id: seq("evt"),
    trainer_id: overrides?.trainerId ?? "trainer-1",
    client_id: overrides?.clientId ?? "client-1",
    action_id: null,
    event_type: overrides?.eventType ?? "MEAL_RECORDED",
    event_id: overrides?.eventId ?? seq("event-id"),
    payload: overrides?.payload ?? null,
    created_at: new Date().toISOString(),
  }
}

// ── TimelineEntry builder ─────────────────────────────────────────────────────

export interface CreateTimelineEntryOverrides {
  id?: string
  clientId?: string
  eventType?: string
  title?: string
  severity?: TimelineSeverity
  source?: TimelineSource
  category?: TimelineCategory
}

export function createTimelineEntry(overrides?: CreateTimelineEntryOverrides): TimelineEntry {
  return {
    id: overrides?.id ?? seq("tl"),
    timestamp: new Date().toISOString(),
    clientId: overrides?.clientId ?? "client-1",
    eventType: overrides?.eventType ?? "MEAL_RECORDED",
    title: overrides?.title ?? "Meal logged",
    description: "Client logged a lunch meal",
    icon: "utensils",
    severity: overrides?.severity ?? "info",
    source: overrides?.source ?? "food_log",
    category: overrides?.category ?? "event",
    metadata: {},
  }
}

// ── DashboardDataDTO builder ──────────────────────────────────────────────────

export function createDashboardData(overrides?: {
  trainerId?: string
  clients?: ClientSummary[]
}): DashboardDataDTO {
  return {
    version: "v1",
    trainer: {
      id: overrides?.trainerId ?? "trainer-1",
      auth_user_id: overrides?.trainerId ?? "trainer-1",
      onboarding_status: "completed",
      business_name: "Test Gym",
      timezone: "America/New_York",
      country: "US",
    },
    clients: overrides?.clients ?? [createClient()],
    metrics: {
      activeClients: overrides?.clients?.length ?? 1,
      complianceRate: 0.75,
      weeklyProgress: 0.1,
      atRiskClients: 0,
    },
    trends: {
      complianceOverTime: [],
      clientActivity: [],
    },
  }
}
