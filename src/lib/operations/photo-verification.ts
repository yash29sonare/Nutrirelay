import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "./audit"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface PendingPhoto {
  id: string
  client_id: string
  image_path: string
  logged_at: string
  notes: string | null
}

export interface PhotoResult {
  id: string
  verification_status: string
}

export async function getPendingPhotos(trainerId: string): Promise<PendingPhoto[]> {
  const db = getDb()

  const { data } = await db
    .from("food_logs")
    .select("id, client_id, image_path, logged_at, notes")
    .eq("trainer_id", trainerId)
    .eq("verification_status", "PENDING")
    .not("image_path", "is", null)
    .order("logged_at", { ascending: false })
    .limit(50)

  return (data ?? []) as PendingPhoto[]
}

export async function verifyPhoto(foodLogId: string, trainerId: string): Promise<PhotoResult> {
  const db = getDb()

  const { data: existing } = await db
    .from("food_logs")
    .select("trainer_id, client_id, verification_status")
    .eq("id", foodLogId)
    .single()

  const row = existing as { trainer_id: string; client_id: string; verification_status: string } | null
  if (!row) throw new Error("Food log not found")
  if (row.trainer_id !== trainerId) throw new Error("Trainer does not own this food log")
  if (row.verification_status === "VERIFIED") return { id: foodLogId, verification_status: "VERIFIED" }

  await db.from("food_logs").update({
    verification_status: "VERIFIED",
    updated_at: new Date().toISOString(),
  }).eq("id", foodLogId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "photo_verify",
    entity_type: "food_logs",
    entity_id: foodLogId,
    metadata: { client_id: row.client_id, previous_status: row.verification_status, new_status: "VERIFIED" },
  })

  return { id: foodLogId, verification_status: "VERIFIED" }
}

export async function rejectPhoto(foodLogId: string, trainerId: string, reason?: string): Promise<PhotoResult> {
  const db = getDb()

  const { data: existing } = await db
    .from("food_logs")
    .select("trainer_id, client_id, verification_status, notes")
    .eq("id", foodLogId)
    .single()

  const row = existing as { trainer_id: string; client_id: string; verification_status: string; notes: string | null } | null
  if (!row) throw new Error("Food log not found")
  if (row.trainer_id !== trainerId) throw new Error("Trainer does not own this food log")

  await db.from("food_logs").update({
    verification_status: "UNVERIFIED",
    notes: reason ?? row.notes,
    updated_at: new Date().toISOString(),
  }).eq("id", foodLogId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "photo_reject",
    entity_type: "food_logs",
    entity_id: foodLogId,
    metadata: { client_id: row.client_id, previous_status: row.verification_status, new_status: "UNVERIFIED", reason },
  })

  return { id: foodLogId, verification_status: "UNVERIFIED" }
}
