import { createClient } from "@supabase/supabase-js"
import { mapFoodLogToMealRecord, type FoodLogRow } from "@/lib/meals/mealMapper"
import { planClientConversation } from "@/lib/conversations/conversationPlanner"
import { planReminders } from "@/lib/reminders/reminderPlanner"
import { dispatchPlans } from "@/lib/communications/communicationOrchestrator"
import { appendEvents, getEvents } from "@/lib/events/engagementEventStore"
import type { EngagementEvent, EngagementEventInput } from "@/types/engagement-events"
import type { MealRecord } from "@/types/meal"

// ── Types ────────────────────────────────────────────────────────────────────

export interface SchedulerSummary {
  totalTrainers: number
  processedTrainers: number
  failedTrainers: number
  totalConversationPlans: number
  totalReminderPlans: number
  totalDispatched: number
  totalSkipped: number
  totalFailed: number
}

interface TrainerClientLink {
  client_id: string
  trainer_id: string
}

interface ClientData {
  clientId: string
  meals: MealRecord[]
  events: EngagementEvent[]
  mealsToday: number
  lastMealTimestamp: string | null
}

// ── DB helpers ───────────────────────────────────────────────────────────────

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

function isToday(timestamp: string): boolean {
  const d = new Date(timestamp)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

// ── Data loading ─────────────────────────────────────────────────────────────

async function loadAllActiveLinks(): Promise<TrainerClientLink[]> {
  const db = getDb()
  const { data } = await db
    .from("trainer_clients")
    .select("client_id, trainer_id")
    .eq("is_active", true)

  return (data ?? []) as TrainerClientLink[]
}

interface FoodLogDbRow {
  id: string
  client_id: string
  trainer_id: string
  logged_at: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  verification_status: string
  image_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

async function loadMealsForClients(
  clientIds: string[],
  limitPerClient: number = 20,
): Promise<Map<string, MealRecord[]>> {
  if (clientIds.length === 0) return new Map()

  const db = getDb()
  const allMeals = new Map<string, MealRecord[]>()

  // Query all meals for the given clients, ordered by time descending
  const { data } = await db
    .from("food_logs")
    .select("*")
    .in("client_id", clientIds)
    .order("logged_at", { ascending: false })
    .limit(clientIds.length * limitPerClient)

  const rows = (data ?? []) as FoodLogDbRow[]

  for (const row of rows) {
    const meal = mapFoodLogToMealRecord(row as unknown as FoodLogRow)
    const existing = allMeals.get(row.client_id) ?? []
    if (existing.length < limitPerClient) {
      existing.push(meal)
      allMeals.set(row.client_id, existing)
    }
  }

  return allMeals
}

function buildClientData(
  clientId: string,
  meals: MealRecord[],
  allEvents: EngagementEvent[],
): ClientData {
  const clientEvents = allEvents.filter((e) => e.client_id === clientId)
  const mealsToday = meals.filter((m) => isToday(m.mealTimestamp)).length
  const lastMealTimestamp = meals.length > 0 ? meals[0].mealTimestamp : null

  return { clientId, meals, events: clientEvents, mealsToday, lastMealTimestamp }
}

// ── Trainer processing ───────────────────────────────────────────────────────

async function processTrainer(
  trainerId: string,
  clientLinks: TrainerClientLink[],
): Promise<{
  conversationPlans: number
  reminderPlans: number
  dispatched: number
  skipped: number
  failed: number
}> {
  const clientIds = clientLinks.map((l) => l.client_id)
  const clientSet = new Set(clientIds)
  const uniqueClientIds = [...clientSet]

  // Load data
  const mealsMap = await loadMealsForClients(uniqueClientIds)
  const allEvents = await getEvents(trainerId)

  // Build per-client data
  const clientsData: ClientData[] = uniqueClientIds.map((cid) =>
    buildClientData(cid, mealsMap.get(cid) ?? [], allEvents),
  )

  // Generate conversation plans (meal gap checks)
  const conversationPlans = clientsData.flatMap((cd) =>
    planClientConversation(cd.clientId, trainerId, cd.lastMealTimestamp),
  )

  // Append CONVERSATION_PLANNED events for meal gap plans
  if (conversationPlans.length > 0) {
    const convEvents: EngagementEventInput[] = conversationPlans.map((p) => ({
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
    // Fire-and-forget: individual trainer must never block another
    await appendEvents(trainerId, convEvents).catch(() => {})
  }

  // Generate reminder plans
  const reminderPlans = await planReminders(
    trainerId,
    clientsData.map((cd) => ({
      clientId: cd.clientId,
      meals: cd.meals,
      events: cd.events,
      mealsToday: cd.mealsToday,
      lastMealTimestamp: cd.lastMealTimestamp,
    })),
    (events) => appendEvents(trainerId, events),
  )

  // Dispatch via communication orchestrator
  const dispatchResults = await dispatchPlans(trainerId, conversationPlans, reminderPlans)

  const dispatched = dispatchResults.filter((r) => r.status === "sent").length
  const skipped = dispatchResults.filter((r) => r.status === "skipped").length
  const failed = dispatchResults.filter((r) => r.status === "failed").length

  return {
    conversationPlans: conversationPlans.length,
    reminderPlans: reminderPlans.length,
    dispatched,
    skipped,
    failed,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function runScheduler(): Promise<SchedulerSummary> {
  const startedAt = new Date().toISOString()
  const summary: SchedulerSummary = {
    totalTrainers: 0,
    processedTrainers: 0,
    failedTrainers: 0,
    totalConversationPlans: 0,
    totalReminderPlans: 0,
    totalDispatched: 0,
    totalSkipped: 0,
    totalFailed: 0,
  }

  // Discover work
  const links = await loadAllActiveLinks()
  const trainerMap = new Map<string, TrainerClientLink[]>()

  for (const link of links) {
    const existing = trainerMap.get(link.trainer_id) ?? []
    existing.push(link)
    trainerMap.set(link.trainer_id, existing)
  }

  summary.totalTrainers = trainerMap.size

  // Append AUTOMATION_STARTED (trainer-level — use a synthetic ID)
  const runId = `scheduler-run-${Date.now()}`
  for (const [trainerId] of trainerMap) {
    await appendEvents(trainerId, [
      {
        client_id: null,
        action_id: null,
        event_type: "AUTOMATION_STARTED",
        event_id: `${runId}-${trainerId.slice(0, 8)}`,
        payload: { runId, startedAt },
      },
    ]).catch(() => {})
  }

  // Process each trainer independently
  for (const [trainerId, clientLinks] of trainerMap) {
    try {
      const result = await processTrainer(trainerId, clientLinks)

      summary.processedTrainers++
      summary.totalConversationPlans += result.conversationPlans
      summary.totalReminderPlans += result.reminderPlans
      summary.totalDispatched += result.dispatched
      summary.totalSkipped += result.skipped
      summary.totalFailed += result.failed

      await appendEvents(trainerId, [
        {
          client_id: null,
          action_id: null,
          event_type: "AUTOMATION_COMPLETED",
          event_id: `${runId}-${trainerId.slice(0, 8)}-done`,
          payload: {
            runId,
            finishedAt: new Date().toISOString(),
            conversationPlans: result.conversationPlans,
            reminderPlans: result.reminderPlans,
            dispatched: result.dispatched,
            skipped: result.skipped,
            failed: result.failed,
          },
        },
      ]).catch(() => {})
    } catch (err) {
      summary.failedTrainers++

      await appendEvents(trainerId, [
        {
          client_id: null,
          action_id: null,
          event_type: "AUTOMATION_FAILED",
          event_id: `${runId}-${trainerId.slice(0, 8)}-fail`,
          payload: {
            runId,
            error: (err as Error).message,
            finishedAt: new Date().toISOString(),
          },
        },
      ]).catch(() => {})

      console.error(`[scheduler] trainer ${trainerId}: ${(err as Error).message}`)
      // Continue processing remaining trainers
    }
  }

  return summary
}
