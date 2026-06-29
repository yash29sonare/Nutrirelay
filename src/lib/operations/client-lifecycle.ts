import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "./audit"
import { checkClientLimit } from "@/lib/entitlements"

type LifecycleStatus = "INVITED" | "ACTIVE" | "PAUSED" | "INACTIVE" | "ARCHIVED"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface LifecycleResult {
  client_id: string
  trainer_id: string
  status: LifecycleStatus
}

async function getActiveClientCount(trainerId: string): Promise<number> {
  const db = getDb()
  const { count } = await db
    .from("client_lifecycle")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", trainerId)
    .in("status", ["ACTIVE", "INVITED"])
  return count ?? 0
}

function verifyTrainerOwnership(trainerId: string, rowTrainerId: string): void {
  if (rowTrainerId !== trainerId) {
    throw new Error("Trainer does not own this client")
  }
}

async function ensureTrainerClientLink(trainerId: string, clientId: string, db: ReturnType<typeof getDb>): Promise<void> {
  const { data } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId)
    .maybeSingle()

  if (!data) {
    await db.from("trainer_clients").insert({
      trainer_id: trainerId,
      client_id: clientId,
      is_active: true,
    })
  }
}

export async function inviteClient(trainerId: string, clientId: string): Promise<LifecycleResult> {
  const db = getDb()

  await checkClientLimit(trainerId)
  const count = await getActiveClientCount(trainerId)

  await ensureTrainerClientLink(trainerId, clientId, db)

  const { data: existing } = await db
    .from("client_lifecycle")
    .select("id, status")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .maybeSingle()

  if (existing) {
    if (existing.status === "ACTIVE" || existing.status === "INVITED") {
      throw new Error("Client already has an active or invited lifecycle")
    }
    await db.from("client_lifecycle").update({
      status: "INVITED",
      reason: null,
      updated_at: new Date().toISOString(),
    }).eq("id", (existing as { id: string }).id)
  } else {
    await db.from("client_lifecycle").insert({
      client_id: clientId,
      trainer_id: trainerId,
      status: "INVITED",
    })
  }

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "lifecycle_invite",
    entity_type: "client_lifecycle",
    entity_id: clientId,
    metadata: { previous_status: (existing as { status: string } | null)?.status ?? null, new_status: "INVITED" },
  })

  return { client_id: clientId, trainer_id: trainerId, status: "INVITED" }
}

export async function activateClient(trainerId: string, clientId: string): Promise<LifecycleResult> {
  const db = getDb()

  const { data: row } = await db
    .from("client_lifecycle")
    .select("*")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .maybeSingle()

  if (!row) throw new Error("Client lifecycle record not found")
  verifyTrainerOwnership(trainerId, (row as { trainer_id: string }).trainer_id)

  await db.from("client_lifecycle").update({
    status: "ACTIVE",
    reason: null,
    updated_at: new Date().toISOString(),
  }).eq("id", (row as { id: string }).id)

  await db.from("trainer_clients").update({ is_active: true }).eq("trainer_id", trainerId).eq("client_id", clientId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "lifecycle_activate",
    entity_type: "client_lifecycle",
    entity_id: clientId,
    metadata: { previous_status: (row as { status: string }).status, new_status: "ACTIVE" },
  })

  return { client_id: clientId, trainer_id: trainerId, status: "ACTIVE" }
}

export async function pauseClient(trainerId: string, clientId: string, reason?: string): Promise<LifecycleResult> {
  const db = getDb()

  const { data: row } = await db
    .from("client_lifecycle")
    .select("*")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .maybeSingle()

  if (!row) throw new Error("Client lifecycle record not found")
  verifyTrainerOwnership(trainerId, (row as { trainer_id: string }).trainer_id)

  await db.from("client_lifecycle").update({
    status: "PAUSED",
    reason: reason ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", (row as { id: string }).id)

  await db.from("trainer_clients").update({ is_active: false }).eq("trainer_id", trainerId).eq("client_id", clientId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "lifecycle_pause",
    entity_type: "client_lifecycle",
    entity_id: clientId,
    metadata: { previous_status: (row as { status: string }).status, new_status: "PAUSED", reason },
  })

  return { client_id: clientId, trainer_id: trainerId, status: "PAUSED" }
}

export async function archiveClient(trainerId: string, clientId: string, reason?: string): Promise<LifecycleResult> {
  const db = getDb()

  const { data: row } = await db
    .from("client_lifecycle")
    .select("*")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .maybeSingle()

  if (!row) throw new Error("Client lifecycle record not found")
  verifyTrainerOwnership(trainerId, (row as { trainer_id: string }).trainer_id)

  await db.from("client_lifecycle").update({
    status: "ARCHIVED",
    reason: reason ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", (row as { id: string }).id)

  await db.from("trainer_clients").update({ is_active: false }).eq("trainer_id", trainerId).eq("client_id", clientId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "lifecycle_archive",
    entity_type: "client_lifecycle",
    entity_id: clientId,
    metadata: { previous_status: (row as { status: string }).status, new_status: "ARCHIVED", reason },
  })

  return { client_id: clientId, trainer_id: trainerId, status: "ARCHIVED" }
}

export async function restoreClient(trainerId: string, clientId: string): Promise<LifecycleResult> {
  const db = getDb()

  const { data: row } = await db
    .from("client_lifecycle")
    .select("*")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .maybeSingle()

  if (!row) throw new Error("Client lifecycle record not found")
  verifyTrainerOwnership(trainerId, (row as { trainer_id: string }).trainer_id)

  await db.from("client_lifecycle").update({
    status: "ACTIVE",
    reason: null,
    updated_at: new Date().toISOString(),
  }).eq("id", (row as { id: string }).id)

  await db.from("trainer_clients").update({ is_active: true }).eq("trainer_id", trainerId).eq("client_id", clientId)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "lifecycle_restore",
    entity_type: "client_lifecycle",
    entity_id: clientId,
    metadata: { previous_status: (row as { status: string }).status, new_status: "ACTIVE" },
  })

  return { client_id: clientId, trainer_id: trainerId, status: "ACTIVE" }
}
