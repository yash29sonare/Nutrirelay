import { createClient } from "@supabase/supabase-js"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface AuditLogInput {
  trainer_id: string
  actor_id: string
  event_type: string
  entity_type: string
  entity_id: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  const db = getDb()
  await db.from("audit_logs").insert({
    trainer_id: input.trainer_id,
    actor_id: input.actor_id,
    event_type: input.event_type,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    metadata: input.metadata ?? {},
  })
}
