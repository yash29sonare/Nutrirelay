import { createClient } from "@supabase/supabase-js"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface CommunicationLogInput {
  trainer_id: string
  client_id: string
  direction: "INBOUND" | "OUTBOUND"
  message_type: "TEXT" | "VOICE" | "IMAGE" | "POLL" | "TEMPLATE"
  wam_id?: string | null
  message_timestamp?: string
  delivery_status?: string | null
  metadata?: Record<string, unknown>
}

export async function logCommunication(input: CommunicationLogInput): Promise<void> {
  const db = getDb()

  const { error } = await db.from("communication_logs").insert({
    trainer_id: input.trainer_id,
    client_id: input.client_id,
    direction: input.direction,
    message_type: input.message_type,
    wam_id: input.wam_id ?? null,
    message_timestamp: input.message_timestamp ?? new Date().toISOString(),
    delivery_status: input.delivery_status ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) {
    throw new Error(`Failed to log ${input.direction.toLowerCase()} communication: ${error.message}`)
  }
}
