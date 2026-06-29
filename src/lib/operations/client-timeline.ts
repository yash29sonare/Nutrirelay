import { createClient } from "@supabase/supabase-js"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface TimelineEvent {
  id: string
  event_type: string
  source: string
  timestamp: string
  summary: string
  details: Record<string, unknown>
}

export interface TimelineQuery {
  clientId: string
  trainerId: string
  limit?: number
  offset?: number
  eventTypes?: string[]
}

async function verifyAccess(clientId: string, trainerId: string, db: ReturnType<typeof getDb>): Promise<void> {
  const { data } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId)
    .maybeSingle()
  if (!data) throw new Error("Trainer does not own this client")
}

async function getFoodLogEvents(clientId: string, db: ReturnType<typeof getDb>): Promise<TimelineEvent[]> {
  const { data } = await db
    .from("food_logs")
    .select("id, logged_at, calories, protein_g, carbs_g, fat_g, verification_status, notes, image_path")
    .eq("client_id", clientId)
    .order("logged_at", { ascending: false })
    .limit(50)

  return ((data ?? []) as Array<Record<string, any>>).map((r) => ({
    id: r.id,
    event_type: r.verification_status === "VERIFIED" ? "meal_verified" : r.verification_status === "UNVERIFIED" ? "meal_unverified" : "meal_logged",
    source: "food_logs",
    timestamp: r.logged_at,
    summary: `Meal logged — ${r.calories ?? "?"} kcal, ${r.protein_g ?? "?"}g protein${r.image_path ? " (with photo)" : ""}`,
    details: { calories: r.calories, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g, verification_status: r.verification_status, notes: r.notes, has_photo: !!r.image_path },
  }))
}

async function getVoiceNoteEvents(clientId: string, db: ReturnType<typeof getDb>): Promise<TimelineEvent[]> {
  const { data } = await db
    .from("voice_notes")
    .select("id, created_at, processing_status, transcript")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20)

  return ((data ?? []) as Array<Record<string, any>>).map((r) => ({
    id: r.id,
    event_type: `voice_note_${r.processing_status}`,
    source: "voice_notes",
    timestamp: r.created_at,
    summary: `Voice note — ${r.processing_status}${r.transcript ? `: "${r.transcript.slice(0, 100)}"` : ""}`,
    details: { processing_status: r.processing_status, transcript: r.transcript },
  }))
}

async function getCommunicationEvents(clientId: string, db: ReturnType<typeof getDb>): Promise<TimelineEvent[]> {
  const { data } = await db
    .from("communication_logs")
    .select("id, message_timestamp, direction, message_type, delivery_status, wam_id, metadata")
    .eq("client_id", clientId)
    .order("message_timestamp", { ascending: false })
    .limit(50)

  return ((data ?? []) as Array<Record<string, any>>).map((r) => ({
    id: r.id,
    event_type: `communication_${r.direction.toLowerCase()}_${r.message_type.toLowerCase()}`,
    source: "communication_logs",
    timestamp: r.message_timestamp,
    summary: `${r.direction === "INBOUND" ? "Received" : "Sent"} ${r.message_type.toLowerCase()} message${r.delivery_status ? ` (${r.delivery_status})` : ""}`,
    details: { direction: r.direction, message_type: r.message_type, delivery_status: r.delivery_status, wam_id: r.wam_id, metadata: r.metadata },
  }))
}

async function getReportEvents(clientId: string, db: ReturnType<typeof getDb>): Promise<TimelineEvent[]> {
  const [weeklyRes, monthlyRes] = await Promise.all([
    db.from("weekly_reports").select("id, report_date, summary").eq("client_id", clientId).order("report_date", { ascending: false }).limit(12),
    db.from("monthly_reports").select("id, report_month, summary, compliance_score").eq("client_id", clientId).order("report_month", { ascending: false }).limit(12),
  ])

  const events: TimelineEvent[] = []

  for (const r of (weeklyRes.data ?? []) as Array<Record<string, any>>) {
    events.push({
      id: r.id,
      event_type: "weekly_report_generated",
      source: "weekly_reports",
      timestamp: r.report_date,
      summary: `Weekly report generated${r.summary ? ` — ${r.summary.slice(0, 80)}` : ""}`,
      details: { report_date: r.report_date, summary: r.summary },
    })
  }

  for (const r of (monthlyRes.data ?? []) as Array<Record<string, any>>) {
    events.push({
      id: r.id,
      event_type: "monthly_report_generated",
      source: "monthly_reports",
      timestamp: r.report_month,
      summary: `Monthly report — compliance score: ${r.compliance_score ?? "N/A"}${r.summary ? ` — ${r.summary.slice(0, 80)}` : ""}`,
      details: { report_month: r.report_month, compliance_score: r.compliance_score, summary: r.summary },
    })
  }

  return events
}

async function getComplianceEvents(clientId: string, db: ReturnType<typeof getDb>): Promise<TimelineEvent[]> {
  const [snapshotsRes, auditRes] = await Promise.all([
    db.from("client_compliance_snapshots").select("id, calculated_at, compliance_score, risk_score, status_color").eq("client_id", clientId).order("calculated_at", { ascending: false }).limit(20),
    db.from("audit_logs").select("audit_id, event_type, actor_id, metadata, created_at").eq("entity_type", "client_compliance").eq("entity_id", clientId).order("created_at", { ascending: false }).limit(20),
  ])

  const events: TimelineEvent[] = []

  for (const r of (snapshotsRes.data ?? []) as Array<Record<string, any>>) {
    events.push({
      id: r.id,
      event_type: "compliance_snapshot",
      source: "client_compliance_snapshots",
      timestamp: r.calculated_at,
      summary: `Compliance snapshot — score: ${r.compliance_score ?? "?"}, risk: ${r.risk_score ?? "?"}, status: ${r.status_color}`,
      details: { compliance_score: r.compliance_score, risk_score: r.risk_score, status_color: r.status_color },
    })
  }

  for (const r of (auditRes.data ?? []) as Array<Record<string, any>>) {
    events.push({
      id: r.audit_id,
      event_type: r.event_type,
      source: "audit_logs",
      timestamp: r.created_at,
      summary: `Compliance override — ${r.event_type === "compliance_override" ? "adjusted" : "removed"}`,
      details: { event_type: r.event_type, actor_id: r.actor_id, metadata: r.metadata },
    })
  }

  return events
}

async function getGoalEvents(clientId: string, db: ReturnType<typeof getDb>): Promise<TimelineEvent[]> {
  const [goalsRes, auditRes] = await Promise.all([
    db.from("client_goals").select("id, created_at, updated_at, goal_type, goal_status, target_weight, starting_weight, current_weight").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
    db.from("audit_logs").select("audit_id, event_type, actor_id, metadata, created_at").eq("entity_type", "client_goals").eq("entity_id", clientId).order("created_at", { ascending: false }).limit(20),
  ])

  const events: TimelineEvent[] = []

  for (const r of (goalsRes.data ?? []) as Array<Record<string, any>>) {
    events.push({
      id: r.id,
      event_type: `goal_${r.goal_status.toLowerCase()}`,
      source: "client_goals",
      timestamp: r.updated_at ?? r.created_at,
      summary: `Goal ${r.goal_status.toLowerCase()}: ${r.goal_type} (${r.starting_weight ?? "?"} → ${r.target_weight ?? "?"} kg)`,
      details: { goal_type: r.goal_type, goal_status: r.goal_status, target_weight: r.target_weight, starting_weight: r.starting_weight, current_weight: r.current_weight },
    })
  }

  for (const r of (auditRes.data ?? []) as Array<Record<string, any>>) {
    events.push({
      id: r.audit_id,
      event_type: r.event_type,
      source: "audit_logs",
      timestamp: r.created_at,
      summary: `Goal ${r.event_type.replace("goal_", "")}`,
      details: { event_type: r.event_type, actor_id: r.actor_id, metadata: r.metadata },
    })
  }

  return events
}

async function getWorkoutEvents(clientId: string, db: ReturnType<typeof getDb>): Promise<TimelineEvent[]> {
  const [schedulesRes, auditRes] = await Promise.all([
    db.from("client_workout_schedules").select("id, created_at, updated_at, timezone, workout_time, preferred_checkin_time, rest_days").eq("client_id", clientId).order("created_at", { ascending: false }).limit(10),
    db.from("audit_logs").select("audit_id, event_type, actor_id, metadata, created_at").eq("entity_type", "client_workout_schedules").eq("entity_id", clientId).order("created_at", { ascending: false }).limit(20),
  ])

  const events: TimelineEvent[] = []

  for (const r of (schedulesRes.data ?? []) as Array<Record<string, any>>) {
    events.push({
      id: r.id,
      event_type: "workout_schedule_created",
      source: "client_workout_schedules",
      timestamp: r.created_at,
      summary: `Workout schedule created — time: ${r.workout_time ?? "not set"}, tz: ${r.timezone}`,
      details: { timezone: r.timezone, workout_time: r.workout_time, preferred_checkin_time: r.preferred_checkin_time, rest_days: r.rest_days },
    })
  }

  for (const r of (auditRes.data ?? []) as Array<Record<string, any>>) {
    events.push({
      id: r.audit_id,
      event_type: r.event_type,
      source: "audit_logs",
      timestamp: r.created_at,
      summary: `Workout schedule ${r.event_type.replace("workout_schedule_", "")}`,
      details: { event_type: r.event_type, actor_id: r.actor_id, metadata: r.metadata },
    })
  }

  return events
}

async function getLifecycleEvents(clientId: string, db: ReturnType<typeof getDb>): Promise<TimelineEvent[]> {
  const [lifecycleRes, auditRes] = await Promise.all([
    db.from("client_lifecycle").select("id, created_at, updated_at, status, reason").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
    db.from("audit_logs").select("audit_id, event_type, actor_id, metadata, created_at").eq("entity_type", "client_lifecycle").eq("entity_id", clientId).order("created_at", { ascending: false }).limit(20),
  ])

  const events: TimelineEvent[] = []

  for (const r of (lifecycleRes.data ?? []) as Array<Record<string, any>>) {
    events.push({
      id: r.id,
      event_type: `lifecycle_${r.status.toLowerCase()}`,
      source: "client_lifecycle",
      timestamp: r.updated_at ?? r.created_at,
      summary: `Client status: ${r.status}${r.reason ? ` (${r.reason})` : ""}`,
      details: { status: r.status, reason: r.reason },
    })
  }

  for (const r of (auditRes.data ?? []) as Array<Record<string, any>>) {
    events.push({
      id: r.audit_id,
      event_type: r.event_type,
      source: "audit_logs",
      timestamp: r.created_at,
      summary: `Lifecycle ${r.event_type.replace("lifecycle_", "")}`,
      details: { event_type: r.event_type, actor_id: r.actor_id, metadata: r.metadata },
    })
  }

  return events
}

export async function getClientTimeline(query: TimelineQuery): Promise<TimelineEvent[]> {
  const db = getDb()
  await verifyAccess(query.clientId, query.trainerId, db)

  const sourceFetchers: Array<() => Promise<TimelineEvent[]>> = [
    () => getFoodLogEvents(query.clientId, db),
    () => getVoiceNoteEvents(query.clientId, db),
    () => getCommunicationEvents(query.clientId, db),
    () => getReportEvents(query.clientId, db),
    () => getComplianceEvents(query.clientId, db),
    () => getGoalEvents(query.clientId, db),
    () => getWorkoutEvents(query.clientId, db),
    () => getLifecycleEvents(query.clientId, db),
  ]

  const allEvents = (await Promise.all(sourceFetchers.map((f) => f()))).flat()

  const filtered = query.eventTypes?.length
    ? allEvents.filter((e) => query.eventTypes!.includes(e.event_type))
    : allEvents

  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const limit = query.limit ?? 100
  const offset = query.offset ?? 0
  return filtered.slice(offset, offset + limit)
}
