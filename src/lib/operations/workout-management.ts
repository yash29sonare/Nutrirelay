import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "./audit"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface CreateWorkoutInput {
  client_id: string
  trainer_id: string
  timezone?: string
  workout_time?: string | null
  preferred_checkin_time?: string | null
  rest_days?: string[]
}

export interface WorkoutResult {
  id: string
  client_id: string
  trainer_id: string
  timezone: string
  workout_time: string | null
}

async function ensureTrainerOwnsClient(trainerId: string, clientId: string, db: ReturnType<typeof getDb>): Promise<void> {
  const { data } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId)
    .eq("is_active", true)
    .maybeSingle()
  if (!data) throw new Error("Trainer does not own this client")
}

export async function createWorkoutSchedule(input: CreateWorkoutInput): Promise<WorkoutResult> {
  const db = getDb()
  await ensureTrainerOwnsClient(input.trainer_id, input.client_id, db)

  const { data } = await db.from("client_workout_schedules").insert({
    client_id: input.client_id,
    timezone: input.timezone ?? "UTC",
    workout_time: input.workout_time ?? null,
    preferred_checkin_time: input.preferred_checkin_time ?? null,
    rest_days: input.rest_days ?? [],
  }).select("id, client_id, timezone, workout_time").maybeSingle()

  if (!data) throw new Error("Failed to create workout schedule")
  const result = data as WorkoutResult

  await writeAuditLog({
    trainer_id: input.trainer_id,
    actor_id: input.trainer_id,
    event_type: "workout_schedule_create",
    entity_type: "client_workout_schedules",
    entity_id: result.id,
    metadata: { client_id: input.client_id, timezone: input.timezone, workout_time: input.workout_time },
  })

  return result
}

export async function updateWorkoutSchedule(
  scheduleId: string,
  trainerId: string,
  updates: Partial<{
    timezone: string
    workout_time: string | null
    preferred_checkin_time: string | null
    rest_days: string[]
  }>,
): Promise<WorkoutResult> {
  const db = getDb()

  const { data: existing } = await db
    .from("client_workout_schedules")
    .select("client_id, timezone, workout_time")
    .eq("id", scheduleId)
    .maybeSingle()

  if (!existing) throw new Error("Workout schedule not found")
  await ensureTrainerOwnsClient(trainerId, existing.client_id, db)

  const payload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() }

  const { data } = await db.from("client_workout_schedules").update(payload).eq("id", scheduleId).select("id, client_id, timezone, workout_time").maybeSingle()
  if (!data) throw new Error("Failed to update workout schedule")
  const result = data as WorkoutResult

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "workout_schedule_update",
    entity_type: "client_workout_schedules",
    entity_id: scheduleId,
    metadata: { changes: updates },
  })

  return result
}

export async function pauseWorkoutSchedule(scheduleId: string, trainerId: string): Promise<void> {
  const db = getDb()

  const { data: existing } = await db
    .from("client_workout_schedules")
    .select("client_id")
    .eq("id", scheduleId)
    .maybeSingle()

  if (!existing) throw new Error("Workout schedule not found")
  await ensureTrainerOwnsClient(trainerId, existing.client_id, db)

  await db.from("client_workout_schedules").update({
    workout_time: null,
    preferred_checkin_time: null,
    updated_at: new Date().toISOString(),
  }).eq("id", scheduleId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "workout_schedule_pause",
    entity_type: "client_workout_schedules",
    entity_id: scheduleId,
    metadata: { paused: true },
  })
}

export async function deleteWorkoutSchedule(scheduleId: string, trainerId: string): Promise<void> {
  const db = getDb()

  const { data: existing } = await db
    .from("client_workout_schedules")
    .select("client_id")
    .eq("id", scheduleId)
    .maybeSingle()

  if (!existing) throw new Error("Workout schedule not found")
  await ensureTrainerOwnsClient(trainerId, existing.client_id, db)

  await db.from("client_workout_schedules").delete().eq("id", scheduleId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "workout_schedule_delete",
    entity_type: "client_workout_schedules",
    entity_id: scheduleId,
    metadata: { deleted: true },
  })
}
