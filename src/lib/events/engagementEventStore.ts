import { createClient } from "@supabase/supabase-js"
import type { EngagementEventInput, EngagementEvent } from "@/types/engagement-events"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function appendEvents(
  trainerId: string,
  inputs: EngagementEventInput[],
): Promise<void> {
  if (inputs.length === 0) return

  const db = getDb()
  const rows = inputs.map((i) => ({
    trainer_id: trainerId,
    client_id: i.client_id,
    action_id: i.action_id,
    event_type: i.event_type,
    event_id: i.event_id,
    payload: i.payload ?? null,
  }))

  const { error } = await db
    .from("engagement_events")
    .upsert(rows, { onConflict: "event_id", ignoreDuplicates: true })
  if (error) {
    console.error("[engagementEventStore] appendEvents error:", error.message)
  }
}

export async function getEvents(
  trainerId: string,
): Promise<EngagementEvent[]> {
  const db = getDb()
  const { data } = await db
    .from("engagement_events")
    .select("*")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: true })
    .limit(500)

  return (data ?? []) as EngagementEvent[]
}

export async function getClientEvents(
  clientId: string,
): Promise<EngagementEvent[]> {
  const db = getDb()
  const { data } = await db
    .from("engagement_events")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true })
    .limit(100)

  return (data ?? []) as EngagementEvent[]
}
