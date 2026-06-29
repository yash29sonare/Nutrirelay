import { createClient } from "@supabase/supabase-js"
import type { MealRecord, MealStatus } from "@/types/meal"
import { mapFoodLogToMealRecord, type FoodLogRow } from "./mealMapper"
import { appendEvents } from "@/lib/events/engagementEventStore"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

function makeEventId(): string {
  return `meal-${crypto.randomUUID()}`
}

export async function createMealRecord(input: {
  clientId: string
  trainerId: string
  mealTimestamp: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  notes?: string
  imagePath?: string
}): Promise<MealRecord> {
  const db = getDb()
  const now = new Date().toISOString()

  const { data, error } = await db
    .from("food_logs")
    .insert({
      client_id: input.clientId,
      trainer_id: input.trainerId,
      logged_at: input.mealTimestamp,
      calories: input.calories,
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
      verification_status: "UNVERIFIED",
      image_path: input.imagePath ?? null,
      notes: input.notes ?? null,
      wam_id: `canonical-${crypto.randomUUID()}`,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create meal record: ${error.message}`)
  if (!data) throw new Error("No data returned after meal record creation")

  const record = mapFoodLogToMealRecord(data as FoodLogRow)

  await appendEvents(input.trainerId, [
    {
      client_id: input.clientId,
      action_id: null,
      event_type: "MEAL_RECORDED",
      event_id: makeEventId(),
      payload: {
        mealId: record.id,
        mealType: record.mealType,
        calories: input.calories,
        proteinG: input.proteinG,
        mealTimestamp: input.mealTimestamp,
      },
    },
  ])

  return record
}

export async function updateMealReview(
  mealId: string,
  trainerId: string,
  review: { status: MealStatus; notes?: string },
): Promise<MealRecord> {
  const db = getDb()

  const statusMap: Record<string, string> = {
    recorded: "UNVERIFIED",
    verified: "VERIFIED",
    unverified: "UNVERIFIED",
    pending: "PENDING",
  }

  const dbStatus = statusMap[review.status]
  if (!dbStatus) throw new Error(`Invalid review status: ${review.status}`)

  const updates: Record<string, unknown> = {
    verification_status: dbStatus,
    updated_at: new Date().toISOString(),
  }
  if (review.notes !== undefined) {
    updates.notes = review.notes
  }

  const { data, error } = await db
    .from("food_logs")
    .update(updates)
    .eq("id", mealId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update meal review: ${error.message}`)
  if (!data) throw new Error("Meal record not found")

  const record = mapFoodLogToMealRecord(data as FoodLogRow)

  await appendEvents(record.trainerId, [
    {
      client_id: record.clientId,
      action_id: null,
      event_type: "MEAL_REVIEWED",
      event_id: makeEventId(),
      payload: {
        mealId: record.id,
        previousStatus: review.status,
        newStatus: review.status,
        notes: review.notes ?? null,
      },
    },
  ])

  return record
}

export async function getMeal(mealId: string): Promise<MealRecord | null> {
  const db = getDb()

  const { data } = await db
    .from("food_logs")
    .select("*")
    .eq("id", mealId)
    .single()

  if (!data) return null
  return mapFoodLogToMealRecord(data as FoodLogRow)
}

export async function getClientMeals(
  clientId: string,
  options?: { limit?: number; offset?: number },
): Promise<MealRecord[]> {
  const db = getDb()

  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const { data } = await db
    .from("food_logs")
    .select("*")
    .eq("client_id", clientId)
    .order("logged_at", { ascending: false })
    .range(offset, offset + limit - 1)

  return ((data ?? []) as FoodLogRow[]).map(mapFoodLogToMealRecord)
}

export async function deleteMealAttachment(mealId: string): Promise<void> {
  const db = getDb()

  const { data, error } = await db
    .from("food_logs")
    .update({ image_path: null, updated_at: new Date().toISOString() })
    .eq("id", mealId)
    .select()

  if (error) throw new Error(`Failed to delete meal attachment: ${error.message}`)
  if (!data || data.length === 0) throw new Error("Meal record not found")
}
