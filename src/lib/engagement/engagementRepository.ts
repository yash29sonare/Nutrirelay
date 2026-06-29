/**
 * ════════════════════════════════════════════════════════════
 * Engagement Repository — Persistent Action Storage
 * ════════════════════════════════════════════════════════════
 *
 * Pure DB abstraction layer for engagement actions.
 * No business logic, no dedup logic — CRUD only.
 *
 * Reconcile step in engine handles dedup and suppression.
 * ════════════════════════════════════════════════════════════
 */

import { createClient } from "@supabase/supabase-js"
import type { EngagementAction } from "@/types/engagement"

export interface PersistedAction {
  id: string
  trainer_id: string
  client_id: string | null
  type: string
  reason: string
  priority: string
  confidence: number
  status: "active" | "completed" | "dismissed"
  created_at: string
  updated_at: string
}

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// ── Fetch active + recently dismissed actions ────────────

export async function getActiveActions(
  trainerId: string,
): Promise<PersistedAction[]> {
  const db = getDb()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data } = await db
    .from("engagement_actions")
    .select("*")
    .eq("trainer_id", trainerId)
    .or(
      `and(status.eq.active),and(status.eq.dismissed,updated_at.gte.${cutoff})`,
    )
    .order("created_at", { ascending: false })
    .limit(100)

  return (data ?? []) as PersistedAction[]
}

// ── Batch upsert new actions by canonical key ────────────

export async function upsertActions(
  actions: EngagementAction[],
  trainerId: string,
): Promise<void> {
  const db = getDb()

  // Only NEW actions (runtime-generated IDs starting with "action-")
  const newActions = actions.filter(
    (a) => a.clientId && a.id.startsWith("action-"),
  )

  if (newActions.length === 0) return

  const rows = newActions.map((a) => ({
    trainer_id: trainerId,
    client_id: a.clientId,
    type: a.type,
    reason: a.reason,
    priority: a.priority,
    confidence: a.confidence,
    status: "active" as const,
  }))

  // Idempotent upsert by (trainer_id, client_id, type, reason).
  // Training-level actions (client_id IS NULL) are excluded above
  // (only clientId truthy actions reach here), so the unique
  // constraint always applies to every row in this batch.
  const { error } = await db
    .from("engagement_actions")
    .upsert(rows, { onConflict: "trainer_id,client_id,type,reason", ignoreDuplicates: true })

  if (error) {
    console.error("[engagementRepository] upsertActions error:", error.message)
  }
}

// ── Update single action status ──────────────────────────

export async function updateActionStatus(
  actionId: string,
  status: "completed" | "dismissed",
): Promise<void> {
  const db = getDb()

  const { error } = await db
    .from("engagement_actions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", actionId)

  if (error) {
    console.error(
      `[engagementRepository] updateActionStatus(${actionId}) error:`,
      error.message,
    )
  }
}
