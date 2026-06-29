import { createClient } from "@supabase/supabase-js"
import { calculateCompliance } from "../compliance-engine"
import { writeAuditLog } from "../operations/audit"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface ComplianceBatchSummary {
  evaluated: number
  updated: number
  errors: number
}

export async function runComplianceForAll(): Promise<ComplianceBatchSummary> {
  const db = getDb()
  const summary: ComplianceBatchSummary = { evaluated: 0, updated: 0, errors: 0 }

  const { data: links } = await db
    .from("trainer_clients")
    .select("client_id, trainer_id")
    .eq("is_active", true)

  if (!links || links.length === 0) return summary

  const batchId = `compliance_batch_${Date.now()}`

  for (const link of links as Array<{ client_id: string; trainer_id: string }>) {
    summary.evaluated++
    try {
      await calculateCompliance({
        clientId: link.client_id,
        trainerId: link.trainer_id,
      })
      summary.updated++

      await writeAuditLog({
        trainer_id: link.trainer_id,
        actor_id: link.trainer_id,
        event_type: "compliance_batch_calculated",
        entity_type: "client_compliance",
        entity_id: link.client_id,
        metadata: { batch_id: batchId },
      }).catch(() => {})
    } catch (err) {
      summary.errors++
      console.error(`[compliance-batch] error for ${link.client_id}:`, (err as Error).message)
    }
  }

  console.log(
    `[compliance-batch] done — evaluated=${summary.evaluated} updated=${summary.updated} errors=${summary.errors}`,
  )
  return summary
}
