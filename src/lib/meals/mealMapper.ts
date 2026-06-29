import type { MealRecord, MealStatus, MealType, MealReview, MealAttachment } from "@/types/meal"

export interface FoodLogRow {
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
  meal_slot_id?: string | null
  wam_id?: string
  transcription_failed?: boolean
}

function mapStatus(dbStatus: string): MealStatus {
  switch (dbStatus) {
    case "VERIFIED":   return "verified"
    case "UNVERIFIED": return "unverified"
    case "PENDING":    return "pending"
    default:           return "recorded"
  }
}

function deriveMealType(timestamp: string): MealType {
  const hour = new Date(timestamp).getHours()
  if (hour < 11) return "breakfast"
  if (hour < 16) return "lunch"
  if (hour < 21) return "dinner"
  return "snack"
}

export function mapFoodLogToMealRecord(row: FoodLogRow): MealRecord {
  const status = mapStatus(row.verification_status)
  const attachment: MealAttachment | undefined = row.image_path
    ? { path: row.image_path, type: "image" }
    : undefined

  const review: MealReview = {
    status,
    ...(status === "verified" || status === "unverified"
      ? { reviewedAt: row.updated_at }
      : {}),
    ...(row.notes && status !== "recorded" ? { notes: row.notes } : {}),
  }

  return {
    id: row.id,
    clientId: row.client_id,
    trainerId: row.trainer_id,
    mealType: deriveMealType(row.logged_at),
    mealTimestamp: row.logged_at,
    calories: row.calories ?? 0,
    proteinG: row.protein_g ?? 0,
    carbsG: row.carbs_g ?? 0,
    fatG: row.fat_g ?? 0,
    review,
    attachment,
    notes: row.notes && status === "recorded" ? row.notes : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapMealRecordToDBInsert(
  record: Omit<MealRecord, "id" | "createdAt" | "updatedAt">,
): Record<string, unknown> {
  const statusMap: Record<string, string> = {
    recorded: "UNVERIFIED",
    verified: "VERIFIED",
    unverified: "UNVERIFIED",
    pending: "PENDING",
  }

  return {
    client_id: record.clientId,
    trainer_id: record.trainerId,
    logged_at: record.mealTimestamp,
    calories: record.calories,
    protein_g: record.proteinG,
    carbs_g: record.carbsG,
    fat_g: record.fatG,
    verification_status: statusMap[record.review.status] ?? "UNVERIFIED",
    image_path: record.attachment?.path ?? null,
    notes: record.notes ?? null,
  }
}

const DB_STATUS_MAP: Record<string, string> = {
  recorded: "UNVERIFIED",
  verified: "VERIFIED",
  unverified: "UNVERIFIED",
  pending: "PENDING",
}

export function mapMealRecordToDBUpdate(
  record: Partial<MealRecord>,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {}

  if (record.calories !== undefined) updates.calories = record.calories
  if (record.proteinG !== undefined) updates.protein_g = record.proteinG
  if (record.carbsG !== undefined) updates.carbs_g = record.carbsG
  if (record.fatG !== undefined) updates.fat_g = record.fatG
  if (record.notes !== undefined) updates.notes = record.notes
  if (record.review?.status !== undefined) {
    updates.verification_status = DB_STATUS_MAP[record.review.status] ?? "UNVERIFIED"
  }
  if (record.attachment !== undefined) {
    updates.image_path = record.attachment?.path ?? null
  }

  return updates
}
