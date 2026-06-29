import { createClient } from "@supabase/supabase-js"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ConversationQueue } from "./components/ConversationQueue"
import type { FoodLogRow } from "@/lib/meals/mealMapper"
import { mapFoodLogToMealRecord } from "@/lib/meals/mealMapper"
import { planClientConversation, planMealConversation } from "@/lib/conversations/conversationPlanner"
import { getEvents } from "@/lib/events/engagementEventStore"
import { RECENT_MEAL_DAYS } from "@/lib/constants"
import type { Database } from "@/shared/types/supabase"

export const dynamic = "force-dynamic"

function getDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function ConversationsPage() {
  const db = getDb()

  const {
    data: { user },
  } = await db.auth.getUser()
  const trainerId = user?.id ?? null

  if (!trainerId) {
    return (
      <PageContainer>
        <PageHeader title="Conversations" description="Sign in to view conversation plans." />
      </PageContainer>
    )
  }

  const { data: tcRows } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("is_active", true)

  const clientIds = (tcRows ?? []).map((r) => r.client_id)
  if (clientIds.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="Conversations" description="Review and manage client conversation plans." />
        <ConversationQueue initialPlans={[]} clientNames={{}} />
      </PageContainer>
    )
  }

  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name")
    .in("id", clientIds)

  const clientNames: Record<string, string> = {}
  for (const p of profiles ?? []) {
    clientNames[p.id] = p.full_name
  }

  const since = new Date(Date.now() - RECENT_MEAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows } = await db
    .from("food_logs")
    .select("*")
    .in("client_id", clientIds)
    .gte("logged_at", since)
    .order("logged_at", { ascending: false })

  const meals = ((rows ?? []) as FoodLogRow[]).map(mapFoodLogToMealRecord)

  const mealsByClient = new Map<string, typeof meals>()
  for (const meal of meals) {
    const existing = mealsByClient.get(meal.clientId) ?? []
    existing.push(meal)
    mealsByClient.set(meal.clientId, existing)
  }

  const lastMealByClient = new Map<string, string>()
  for (const meal of meals) {
    const existing = lastMealByClient.get(meal.clientId)
    if (!existing || meal.mealTimestamp > existing) {
      lastMealByClient.set(meal.clientId, meal.mealTimestamp)
    }
  }

  const planSet = new Map<string, Set<string>>()
  const plans = []

  for (const meal of meals) {
    const clientMeals = mealsByClient.get(meal.clientId) ?? []
    const mealPlans = planMealConversation(meal, undefined, clientMeals)

    for (const plan of mealPlans) {
      const existing = planSet.get(plan.context.clientId)
      if (existing?.has(plan.reason)) continue

      if (!planSet.has(plan.context.clientId)) {
        planSet.set(plan.context.clientId, new Set())
      }
      planSet.get(plan.context.clientId)!.add(plan.reason)
      plans.push(plan)
    }
  }

  for (const clientId of clientIds) {
    const lastTs = lastMealByClient.get(clientId) ?? null
    const gapPlans = planClientConversation(clientId, trainerId, lastTs)

    for (const plan of gapPlans) {
      const existing = planSet.get(plan.context.clientId)
      if (existing?.has(plan.reason)) continue

      if (!planSet.has(plan.context.clientId)) {
        planSet.set(plan.context.clientId, new Set())
      }
      planSet.get(plan.context.clientId)!.add(plan.reason)
      plans.push(plan)
    }
  }

  const allEvents = await getEvents(trainerId)
  const handledIds = new Set<string>()
  for (const ev of allEvents) {
    if (
      ev.event_type === "CONVERSATION_APPROVED" ||
      ev.event_type === "CONVERSATION_DISMISSED" ||
      ev.event_type === "CONVERSATION_SNOOZED"
    ) {
      const convId = ev.payload?.["conversationId"]
      if (typeof convId === "string") handledIds.add(convId)
    }
  }

  const filtered = plans.filter((p) => !handledIds.has(p.id))

  return (
    <PageContainer>
      <PageHeader
        title="Conversations"
        description="Review and manage client conversation plans."
      />
      <ConversationQueue initialPlans={filtered} clientNames={clientNames} />
    </PageContainer>
  )
}
