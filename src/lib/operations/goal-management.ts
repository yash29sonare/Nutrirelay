import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "./audit"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface CreateGoalInput {
  client_id: string
  trainer_id: string
  goal_type: string
  target_weight?: number | null
  starting_weight?: number | null
  current_weight?: number | null
  target_date?: string | null
  weekly_target_rate?: number | null
}

export interface GoalResult {
  id: string
  client_id: string
  trainer_id: string
  goal_type: string
  goal_status: string
}

async function fetchActiveGoalRow(clientId: string, trainerId: string, db: ReturnType<typeof getDb>): Promise<Record<string, any> | null> {
  const { data } = await db
    .from("client_goals")
    .select("*")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .eq("goal_status", "ACTIVE")
    .limit(1)
    .maybeSingle()
  return data as Record<string, any> | null
}

export async function createGoal(input: CreateGoalInput): Promise<GoalResult> {
  const db = getDb()

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", input.trainer_id)
    .eq("client_id", input.client_id)
    .limit(1)
    .maybeSingle()

  if (!tc) throw new Error("Trainer does not own this client")

  const existing = await fetchActiveGoalRow(input.client_id, input.trainer_id, db)
  if (existing) {
    throw new Error("Client already has an active goal — archive it first")
  }

  const { data } = await db.from("client_goals").insert({
    client_id: input.client_id,
    trainer_id: input.trainer_id,
    goal_type: input.goal_type,
    goal_status: "ACTIVE",
    target_weight: input.target_weight ?? null,
    starting_weight: input.starting_weight ?? null,
    current_weight: input.current_weight ?? null,
    target_date: input.target_date ?? null,
    weekly_target_rate: input.weekly_target_rate ?? null,
  }).select("id, client_id, trainer_id, goal_type, goal_status").single()

  const result = data as unknown as GoalResult

  await writeAuditLog({
    trainer_id: input.trainer_id,
    actor_id: input.trainer_id,
    event_type: "goal_create",
    entity_type: "client_goals",
    entity_id: result.id,
    metadata: { client_id: input.client_id, goal_type: input.goal_type, goal_status: "ACTIVE" },
  })

  return result
}

export interface UpdateGoalInput {
  goal_id: string
  trainer_id: string
  goal_type?: string
  target_weight?: number | null
  current_weight?: number | null
  target_date?: string | null
  weekly_target_rate?: number | null
}

export async function updateGoal(input: UpdateGoalInput): Promise<GoalResult> {
  const db = getDb()

  const { data: existing } = await db
    .from("client_goals")
    .select("*")
    .eq("id", input.goal_id)
    .maybeSingle()

  const row = existing as Record<string, any> | null
  if (!row) throw new Error("Goal not found")
  if (row.trainer_id !== input.trainer_id) {
    throw new Error("Trainer does not own this goal")
  }

  const updates: Record<string, any> = {}
  if (input.goal_type !== undefined) updates.goal_type = input.goal_type
  if (input.target_weight !== undefined) updates.target_weight = input.target_weight
  if (input.current_weight !== undefined) updates.current_weight = input.current_weight
  if (input.target_date !== undefined) updates.target_date = input.target_date
  if (input.weekly_target_rate !== undefined) updates.weekly_target_rate = input.weekly_target_rate
  updates.updated_at = new Date().toISOString()

  const { data } = await db.from("client_goals").update(updates).eq("id", input.goal_id).select("id, client_id, trainer_id, goal_type, goal_status").single()
  const result = data as unknown as GoalResult

  await writeAuditLog({
    trainer_id: input.trainer_id,
    actor_id: input.trainer_id,
    event_type: "goal_update",
    entity_type: "client_goals",
    entity_id: input.goal_id,
    metadata: { changes: updates },
  })

  return result
}

export async function archiveGoal(goalId: string, trainerId: string): Promise<void> {
  const db = getDb()

  const { data: existing } = await db
    .from("client_goals")
    .select("*")
    .eq("id", goalId)
    .maybeSingle()

  const row = existing as Record<string, any> | null
  if (!row) throw new Error("Goal not found")
  if (row.trainer_id !== trainerId) {
    throw new Error("Trainer does not own this goal")
  }

  await db.from("client_goals").update({
    goal_status: "ARCHIVED",
    updated_at: new Date().toISOString(),
  }).eq("id", goalId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "goal_archive",
    entity_type: "client_goals",
    entity_id: goalId,
    metadata: { previous_status: row.goal_status, new_status: "ARCHIVED" },
  })
}

export async function getActiveGoal(clientId: string, trainerId: string): Promise<GoalResult | null> {
  const db = getDb()
  const goal = await fetchActiveGoalRow(clientId, trainerId, db)
  if (!goal) return null
  return {
    id: goal.id,
    client_id: goal.client_id,
    trainer_id: goal.trainer_id,
    goal_type: goal.goal_type,
    goal_status: goal.goal_status,
  }
}
