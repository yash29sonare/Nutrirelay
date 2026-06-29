import { createClient } from '@supabase/supabase-js'

interface QueueMessage {
  wam_id: string
  client_phone: string
  message_timestamp: number
  message_type: 'text' | 'audio' | 'image' | 'interactive' | 'unknown'
  message_text: string | null
  media_id: string | null
  button_reply_id: string | null
  raw_entry: unknown
}

interface PgmqRecord {
  msg_id: number
  read_ct: number
  enqueued_at: string
  vt: string
  message: QueueMessage | string  // JSONB double-encoded as string by PostgREST
}

let isRunning = false

interface ProcessMessageResult {
  status: "SUCCESS" | "FAILURE_HANDLED" | "RETRY"
  wam_id: string
  error?: string
  fallback_message?: string
}

// Untyped client — used for tables not yet in the generated supabase.ts
// (incoming_webhook_logs added in migration 04_pgmq_init, push pending)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function processMessage(record: PgmqRecord): Promise<ProcessMessageResult> {
  const supabase = getSupabase()
  const { msg_id } = record

  try {
    const rawMessage = record.message
    const message: QueueMessage =
      typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage

    const wam_id = message.wam_id ?? ''
    if (!wam_id) {
      return { status: "FAILURE_HANDLED", wam_id: "", error: "missing wam_id" }
    }

    const {
      client_phone,
      message_timestamp,
      message_type,
      message_text,
      media_id,
      button_reply_id,
    } = message

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', client_phone)
      .limit(1)
      .single()

    const clientId = (profileRow as { id: string } | null)?.id ?? null

    let trainerId: string | null = null
    if (clientId) {
      const { data: tcRow } = await supabase
        .from('trainer_clients')
        .select('trainer_id')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .limit(1)
        .single()
      trainerId = (tcRow as { trainer_id: string } | null)?.trainer_id ?? null
    }

    if (!trainerId) {
      return { status: "FAILURE_HANDLED", wam_id, error: "no active trainer" }
    }

    try {
      const mastra = (globalThis as Record<string, unknown>).mastra
      if (!mastra) throw new Error('Mastra instance not initialised on globalThis')

      const workflow = (mastra as any).getWorkflow('whatsappPipeline')
      const run = await workflow.createRun()

      await run.start({
        inputData: {
          wam_id,
          client_phone,
          trainer_id: trainerId,
          message_timestamp,
          message_type,
          raw_body: JSON.stringify({
            message_text,
            media_id,
            button_reply_id,
          }),
        },
      })

      return { status: "SUCCESS", wam_id }
    } catch (err) {
      return { status: "FAILURE_HANDLED", wam_id, error: (err as Error).message }
    }
  } catch (err) {
    return { status: "RETRY", wam_id: (record as any)?.message?.wam_id ?? "", error: (err as Error).message }
  }
}

async function pollQueue(): Promise<void> {
  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('pgmq_read', {
    queue_name: 'whatsapp_incoming_queue',
    vt: 30,
    qty: 5,
  })

  if (error) {
    console.error('[HEALTH] pgmq_read error:', error.message)
    return
  }

  const records = (data as PgmqRecord[] | null) ?? []

  for (const record of records) {
    const msgId = (record as any)?.msg_id

    // ── Claim-field extraction (minimal — no ownership assumption) ─────────
    let claimWamId = ""
    let claimPhone = ""
    let claimMsgType = ""
    try {
      const raw = (record as any)?.message
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
      claimWamId = parsed?.wam_id ?? ""
      claimPhone = parsed?.client_phone ?? ""
      claimMsgType = parsed?.message_type ?? ""
    } catch { }

    if (!claimWamId) {
      console.log("[ALERT] msg_id:", msgId, "reason: missing wam_id in queue message")
      try { await supabase.rpc("pgmq_delete", { queue_name: "whatsapp_incoming_queue", msg_id: msgId }) } catch { }
      continue
    }

    // ══════════════════════════════════════════════════════════════════════
    // 1. CLAIM LAYER — atomic claim with lease expiry + reclaim
    //    Fresh INSERT on UNIQUE(wam_id) is the sole authority.
    //    On 23505: stale CLAIMED → RECLAIMED, RETRY → re-entry,
    //    active CLAIMED → skip cycle, otherwise duplicate → delete.
    // ══════════════════════════════════════════════════════════════════════
    const STALE_LEASE_MS = 5 * 60 * 1000

    let claimResult: "NEW" | "RECLAIMED" | "RETRY" | "" = ""

    const { error: claimError } = await supabase
      .from("incoming_webhook_logs")
      .insert({
        wam_id: claimWamId,
        client_phone: claimPhone,
        message_type: claimMsgType,
        received_at: new Date().toISOString(),
        status: "CLAIMED",
      })

    if (claimError) {
      if (claimError.code === "23505") {
        const { data: existing } = await supabase
          .from("incoming_webhook_logs")
          .select("status, updated_at, retry_count")
          .eq("wam_id", claimWamId)
          .single()

        if (existing?.status === "RETRY") {
          const retryCount = (existing as any)?.retry_count ?? 0
          if (retryCount >= 3) {
            console.log("[ALERT] wam_id:", claimWamId, "retry_count:", retryCount)
            await supabase
              .from("incoming_webhook_logs")
              .update({ status: "FAILED_HANDLED", processed_at: new Date().toISOString() })
              .eq("wam_id", claimWamId)
            try { await supabase.rpc("pgmq_delete", { queue_name: "whatsapp_incoming_queue", msg_id: msgId }) } catch { }
            continue
          }
          await supabase
            .from("incoming_webhook_logs")
            .update({ status: "CLAIMED" })
            .eq("wam_id", claimWamId)
          claimResult = "RETRY"
        } else if (existing?.status === "CLAIMED" || existing?.status === "PROCESSING") {
          if (
            existing?.updated_at &&
            Date.now() - new Date(existing.updated_at).getTime() > STALE_LEASE_MS
          ) {
            await supabase
              .from("incoming_webhook_logs")
              .update({ status: "RECLAIMED" })
              .eq("wam_id", claimWamId)
            claimResult = "RECLAIMED"
          } else {
            const reason = existing?.status === "PROCESSING" ? "active execution in progress" : "active claim in progress"
            console.log("[ALERT] wam_id:", claimWamId, "reason:", reason)
            continue
          }
        } else {
          console.log("[ALERT] wam_id:", claimWamId, "reason: duplicate wam_id")
          try { await supabase.rpc("pgmq_delete", { queue_name: "whatsapp_incoming_queue", msg_id: msgId }) } catch { }
          continue
        }
      } else {
        console.log("[ALERT] wam_id:", claimWamId, "reason:", claimError.message)
        continue
      }
    } else {
      claimResult = "NEW"
    }

    if (claimResult === "NEW") {
      console.log("[TRACE] wam_id:", claimWamId, "stage=CLAIMED")
    } else if (claimResult === "RECLAIMED") {
      console.log("[TRACE] wam_id:", claimWamId, "stage=RECLAIMED")
    } else if (claimResult === "RETRY") {
      console.log("[TRACE] wam_id:", claimWamId, "stage=RETRY_REENTRY")
    }

    // ── Acquire PROCESSING lock — signals active execution to other cycles ──
    await supabase
      .from("incoming_webhook_logs")
      .update({ status: "PROCESSING" })
      .eq("wam_id", claimWamId)

    console.log("[TRACE] wam_id:", claimWamId, "stage=PROCESS_START")

    // ══════════════════════════════════════════════════════════════════════
    // 2. PROCESS LAYER — pure business logic, no queue / claim state touch
    // ══════════════════════════════════════════════════════════════════════
    let result: ProcessMessageResult | null = null

    try {
      result = await processMessage(record)
    } catch (err) {
      console.log("[ALERT] wam_id:", claimWamId, "error:", (err as Error).message)
      result = { status: "FAILURE_HANDLED", wam_id: claimWamId, error: "UNHANDLED_PIPELINE_ERROR" }
    }

    // ── Safe-return guard ─────────────────────────────────────────────────
    if (!result || !result.status) {
      console.log("[ALERT] wam_id:", claimWamId, "error: invalid processMessage result")
      result = { status: "FAILURE_HANDLED", wam_id: claimWamId, error: "UNHANDLED_PIPELINE_ERROR" }
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. STATE LAYER — source-of-truth commit before queue decision
    // ══════════════════════════════════════════════════════════════════════
    let finalStatus =
      result.status === "SUCCESS" ? "SUCCESS" :
        result.status === "FAILURE_HANDLED" ? "FAILED_HANDLED" :
          "RETRY"

    const statePayload: Record<string, unknown> = {
      status: finalStatus,
      processed_at: new Date().toISOString(),
    }

    // ── Retry safety cap — max 3 RETRY attempts, then force FAILED_HANDLED ──
    if (finalStatus === "RETRY") {
      const { data: retryRow } = await supabase
        .from("incoming_webhook_logs")
        .select("retry_count")
        .eq("wam_id", claimWamId)
        .single()

      const retryCount = (retryRow as any)?.retry_count ?? 0
      if (retryCount >= 3) {
        console.log("[ALERT] wam_id:", claimWamId, "retry_count:", retryCount)
        result = { status: "FAILURE_HANDLED", wam_id: claimWamId, error: "retry exhausted" }
        finalStatus = "FAILED_HANDLED"
        statePayload.status = "FAILED_HANDLED"
      } else {
        statePayload.retry_count = retryCount + 1
      }
    }

    const { error: stateError } = await supabase
      .from("incoming_webhook_logs")
      .update(statePayload)
      .eq("wam_id", claimWamId)

    if (stateError) {
      console.log("[ALERT] wam_id:", claimWamId, "reason:", stateError.message)
      result = { status: "RETRY", wam_id: claimWamId, error: `state commit failed: ${stateError.message}` }
      finalStatus = "RETRY"
    } else {
      console.log("[EVENT] outcome=state_commit wam_id:", claimWamId, "status:", finalStatus)
    }

    if (result.status === "FAILURE_HANDLED") {
      console.log("[EVENT] outcome=failure wam_id:", result.wam_id, "reason:", result.error ?? "unknown")
    }
    if (result.status === "RETRY") {
      console.log("[EVENT] outcome=retry wam_id:", result.wam_id, "reason:", result.error ?? "unknown")
    }

    console.log("[EVENT] outcome=final_state wam_id:", result.wam_id, "status:", result.status)

    // ══════════════════════════════════════════════════════════════════════
    // 4. QUEUE DELETION — only after state is committed
    // ══════════════════════════════════════════════════════════════════════
    if (!stateError && (result.status === "SUCCESS" || result.status === "FAILURE_HANDLED")) {
      try {
        await supabase.rpc("pgmq_delete", { queue_name: "whatsapp_incoming_queue", msg_id: msgId })
        console.log("[EVENT] outcome=delete wam_id:", result.wam_id)
      } catch (deleteErr) {
        console.log("[ALERT] wam_id:", result.wam_id, "reason: delete failed:", (deleteErr as Error).message)
      }
    }

    if (result.status === "RETRY") {
      if (stateError) {
        console.log("[EVENT] outcome=delete_skipped wam_id:", result.wam_id, "reason=state_not_committed")
      }
      console.log("[EVENT] outcome=retry_hold wam_id:", result.wam_id)
    }
  }
}

export function startQueueWorker(): void {
  if (isRunning) return
  isRunning = true

  const POLL_INTERVAL_MS = 2000

  const tick = async (): Promise<void> => {
    if (!isRunning) return
    try {
      await pollQueue()
    } catch (err) {
      console.error('[HEALTH] unhandled poll error:', (err as Error).message)
    }
    setTimeout(tick, POLL_INTERVAL_MS)
  }

  tick()
  console.log('[HEALTH] worker polling started')
}

export function stopQueueWorker(): void {
  isRunning = false
  console.log('[HEALTH] worker stopped')
}
