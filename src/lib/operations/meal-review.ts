import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "./audit"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface MealReviewResult {
  id: string
  client_id: string
  verification_status: string
}

async function getFoodLog(foodLogId: string, trainerId: string, db: ReturnType<typeof getDb>): Promise<Record<string, any>> {
  const { data } = await db
    .from("food_logs")
    .select("*")
    .eq("id", foodLogId)
    .single()

  const row = data as Record<string, any> | null
  if (!row) throw new Error("Food log not found")
  if (row.trainer_id !== trainerId) throw new Error("Trainer does not own this food log")
  return row
}

export async function approveMeal(foodLogId: string, trainerId: string): Promise<MealReviewResult> {
  const db = getDb()
  const row = await getFoodLog(foodLogId, trainerId, db)

  await db.from("food_logs").update({
    verification_status: "VERIFIED",
    updated_at: new Date().toISOString(),
  }).eq("id", foodLogId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "meal_approve",
    entity_type: "food_logs",
    entity_id: foodLogId,
    metadata: { client_id: row.client_id, previous_status: row.verification_status, new_status: "VERIFIED" },
  })

  return { id: foodLogId, client_id: row.client_id, verification_status: "VERIFIED" }
}

export async function rejectMeal(foodLogId: string, trainerId: string, reason?: string): Promise<MealReviewResult> {
  const db = getDb()
  const row = await getFoodLog(foodLogId, trainerId, db)

  await db.from("food_logs").update({
    verification_status: "UNVERIFIED",
    notes: reason ?? row.notes,
    updated_at: new Date().toISOString(),
  }).eq("id", foodLogId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "meal_reject",
    entity_type: "food_logs",
    entity_id: foodLogId,
    metadata: { client_id: row.client_id, previous_status: row.verification_status, new_status: "UNVERIFIED", reason },
  })

  return { id: foodLogId, client_id: row.client_id, verification_status: "UNVERIFIED" }
}

export interface EditMealInput {
  food_log_id: string
  trainer_id: string
  calories?: number | null
  protein_g?: number | null
  carbs_g?: number | null
  fat_g?: number | null
  notes?: string | null
}

export async function editMeal(input: EditMealInput): Promise<MealReviewResult> {
  const db = getDb()
  const row = await getFoodLog(input.food_log_id, input.trainer_id, db)

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  const originalValues: Record<string, any> = {}

  if (input.calories !== undefined) { originalValues.calories = row.calories; updates.calories = input.calories }
  if (input.protein_g !== undefined) { originalValues.protein_g = row.protein_g; updates.protein_g = input.protein_g }
  if (input.carbs_g !== undefined) { originalValues.carbs_g = row.carbs_g; updates.carbs_g = input.carbs_g }
  if (input.fat_g !== undefined) { originalValues.fat_g = row.fat_g; updates.fat_g = input.fat_g }
  if (input.notes !== undefined) { originalValues.notes = row.notes; updates.notes = input.notes }

  await db.from("food_logs").update(updates).eq("id", input.food_log_id)

  await writeAuditLog({
    trainer_id: input.trainer_id,
    actor_id: input.trainer_id,
    event_type: "meal_edit",
    entity_type: "food_logs",
    entity_id: input.food_log_id,
    metadata: {
      client_id: row.client_id,
      original_values: originalValues,
      updated_values: updates,
    },
  })

  const status = (updates.verification_status ?? row.verification_status) as string
  return { id: input.food_log_id, client_id: row.client_id, verification_status: status }
}

export async function markVerified(foodLogId: string, trainerId: string): Promise<MealReviewResult> {
  return approveMeal(foodLogId, trainerId)
}

export async function markUnverified(foodLogId: string, trainerId: string, reason?: string): Promise<MealReviewResult> {
  return rejectMeal(foodLogId, trainerId, reason)
}
