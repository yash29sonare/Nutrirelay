import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "./audit"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface ComplianceOverrideResult {
  client_id: string
  adjusted_score: number
  original_score: number
  reason: string
}

export interface ComplianceHistoryEntry {
  event_type: string
  actor_id: string
  metadata: Record<string, unknown>
  created_at: string
}

export async function overrideCompliance(
  clientId: string,
  trainerId: string,
  adjustedScore: number,
  reason: string,
): Promise<ComplianceOverrideResult> {
  const db = getDb()

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId)
    .limit(1)
    .maybeSingle()

  if (!tc) throw new Error("Trainer does not own this client")

  const { data: snapshot } = await db
    .from("client_compliance_snapshots")
    .select("compliance_score")
    .eq("client_id", clientId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const originalScore = ((snapshot as { compliance_score: number | null } | null)?.compliance_score ?? 0)

  await db.from("client_compliance_snapshots").insert({
    client_id: clientId,
    trainer_id: trainerId,
    compliance_score: adjustedScore,
    risk_score: adjustedScore < 40 ? 80 : adjustedScore < 70 ? 50 : 20,
    status_color: adjustedScore >= 70 ? "GREEN" : adjustedScore >= 40 ? "YELLOW" : "RED",
    calculated_at: new Date().toISOString(),
  })

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "compliance_override",
    entity_type: "client_compliance",
    entity_id: clientId,
    metadata: { original_score: originalScore, adjusted_score: adjustedScore, reason },
  })

  return { client_id: clientId, adjusted_score: adjustedScore, original_score: originalScore, reason }
}

export async function removeOverride(clientId: string, trainerId: string): Promise<void> {
  const db = getDb()

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId)
    .limit(1)
    .maybeSingle()

  if (!tc) throw new Error("Trainer does not own this client")

  const { data: snapshot } = await db
    .from("client_compliance_snapshots")
    .select("compliance_score")
    .eq("client_id", clientId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentScore = ((snapshot as { compliance_score: number | null } | null)?.compliance_score ?? 0)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "compliance_override_removed",
    entity_type: "client_compliance",
    entity_id: clientId,
    metadata: { removed_score: currentScore, reason: "Override removed by trainer" },
  })
}

export async function viewComplianceHistory(clientId: string, trainerId: string): Promise<ComplianceHistoryEntry[]> {
  const db = getDb()

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId)
    .limit(1)
    .maybeSingle()

  if (!tc) return []

  const { data } = await db
    .from("audit_logs")
    .select("event_type, actor_id, metadata, created_at")
    .eq("entity_type", "client_compliance")
    .eq("entity_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50)

  return (data ?? []) as ComplianceHistoryEntry[]
}
