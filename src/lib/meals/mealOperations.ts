import { createClient } from "@supabase/supabase-js"
import type { MealRecord, MealReviewReason, MealReviewState, MealStatus, NutritionConfidence } from "@/types/meal"
import { mapFoodLogToMealRecord, type FoodLogRow } from "./mealMapper"
import { appendEvents } from "@/lib/events/engagementEventStore"
import { countsTowardMacros } from "./reviewRules"

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
  options?: { limit?: number; offset?: number; trainerId?: string },
): Promise<MealRecord[]> {
  const db = getDb()

  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  let query = db
    .from("food_logs")
    .select("*")
    .eq("client_id", clientId)

  if (options?.trainerId) {
    query = query.eq("trainer_id", options.trainerId)
  }

  const { data } = await query
    .order("logged_at", { ascending: false })
    .range(offset, offset + limit - 1)

  return ((data ?? []) as FoodLogRow[]).map(mapFoodLogToMealRecord)
}

export async function getClientMealsForDay(
  clientId: string,
  date = new Date(),
  trainerId?: string,
): Promise<MealRecord[]> {
  const db = getDb()
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  let query = db
    .from("food_logs")
    .select("*")
    .eq("client_id", clientId)
    .gte("logged_at", start.toISOString())
    .lt("logged_at", end.toISOString())

  if (trainerId) {
    query = query.eq("trainer_id", trainerId)
  }

  const { data } = await query
    .order("logged_at", { ascending: false })

  return ((data ?? []) as FoodLogRow[]).map(mapFoodLogToMealRecord).filter((meal) => countsTowardMacros(meal.reviewState))
}

export interface MealReviewPatch {
  reviewState?: MealReviewState
  aiConfidence?: NutritionConfidence
  reviewReason?: MealReviewReason | null
  trainerNote?: string | null
  foodText?: string | null
  calories?: number | null
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  mergedIntoId?: string | null
}

export async function updateMealReviewWorkflow(
  mealId: string,
  trainerId: string,
  patch: MealReviewPatch,
): Promise<MealRecord> {
  const db = getDb()
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updated_at: now }

  if (patch.reviewState !== undefined) {
    updates.review_state = patch.reviewState
    if (patch.reviewState === "reviewed" || patch.reviewState === "corrected" || patch.reviewState === "rejected" || patch.reviewState === "merged") {
      updates.reviewed_at = now
      updates.reviewed_by = trainerId
    }
    if (patch.reviewState === "reviewed" || patch.reviewState === "corrected" || patch.reviewState === "merged") {
      updates.verification_status = "VERIFIED"
    }
    if (patch.reviewState === "rejected") {
      updates.verification_status = "UNVERIFIED"
    }
  }
  if (patch.aiConfidence !== undefined) updates.ai_confidence = patch.aiConfidence
  if (patch.reviewReason !== undefined) updates.review_reason = patch.reviewReason
  if (patch.trainerNote !== undefined) updates.trainer_note = patch.trainerNote
  if (patch.foodText !== undefined) updates.notes = patch.foodText
  if (patch.calories !== undefined) updates.calories = patch.calories
  if (patch.proteinG !== undefined) updates.protein_g = patch.proteinG
  if (patch.carbsG !== undefined) updates.carbs_g = patch.carbsG
  if (patch.fatG !== undefined) updates.fat_g = patch.fatG
  if (patch.mergedIntoId !== undefined) updates.merged_into_id = patch.mergedIntoId

  const { data, error } = await db
    .from("food_logs")
    .update(updates)
    .eq("id", mealId)
    .eq("trainer_id", trainerId)
    .select("*")
    .maybeSingle()

  if (error) throw new Error(`Failed to update nutrition review: ${error.message}`)
  if (!data) throw new Error("Meal record not found or access denied")

  const record = mapFoodLogToMealRecord(data as FoodLogRow)
  await appendEvents(record.trainerId, [
    {
      client_id: record.clientId,
      action_id: null,
      event_type: "MEAL_REVIEWED",
      event_id: makeEventId(),
      payload: {
        mealId: record.id,
        reviewState: record.reviewState,
        aiConfidence: record.aiConfidence,
        reviewReason: record.reviewReason ?? null,
      },
    },
  ])

  return record
}

export async function getNutritionReviewQueue(trainerId: string, limit = 50): Promise<MealRecord[]> {
  const db = getDb()
  const { data } = await db
    .from("food_logs")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("review_state", "needs_review")
    .order("logged_at", { ascending: false })
    .limit(limit)

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
