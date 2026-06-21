import { createClient } from '@supabase/supabase-js'

interface QueueMessage {
  wam_id:            string
  client_phone:      string
  message_timestamp: number
  message_type:      'text' | 'audio' | 'image' | 'interactive' | 'unknown'
  message_text:      string | null
  media_id:          string | null
  button_reply_id:   string | null
  raw_entry:         unknown
}

interface PgmqRecord {
  msg_id:      number
  read_ct:     number
  enqueued_at: string
  vt:          string
  message:     QueueMessage
}

let isRunning = false

// Untyped client — used for tables not yet in the generated supabase.ts
// (incoming_webhook_logs added in migration 04_pgmq_init, push pending)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function processMessage(record: PgmqRecord): Promise<void> {
  const supabase = getSupabase()
  const { message, msg_id } = record
  const {
    wam_id,
    client_phone,
    message_timestamp,
    message_type,
    message_text,
    media_id,
    button_reply_id,
  } = message

  // Deduplication — UNIQUE index on wam_id will reject duplicates with code 23505
  const { error: logError } = await supabase
    .from('incoming_webhook_logs')
    .insert({
      wam_id,
      client_phone,
      message_type,
      received_at: new Date(message_timestamp * 1000).toISOString(),
      status:      'queued',
    })

  if (logError) {
    if (logError.code === '23505') {
      // Already processed — delete from queue silently
      await supabase.rpc('pgmq_delete', {
        queue_name: 'whatsapp_incoming_queue',
        msg_id,
      })
      return
    }
    console.error('[queueConsumer] log insert error:', logError.message)
    return
  }

  // Look up clientId from phone number
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone_number', client_phone)
    .limit(1)
    .single()

  const clientId = (profileRow as { id: string } | null)?.id ?? null

  // Resolve trainerId via trainer_clients mapping
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
    await supabase
      .from('incoming_webhook_logs')
      .update({ status: 'skipped', processed_at: new Date().toISOString() })
      .eq('wam_id', wam_id)

    await supabase.rpc('pgmq_delete', {
      queue_name: 'whatsapp_incoming_queue',
      msg_id,
    })
    return
  }

  // Execute whatsappPipeline via Mastra singleton
  try {
    const mastra = (globalThis as Record<string, unknown>).mastra
    if (!mastra) throw new Error('Mastra instance not initialised on globalThis')

    const workflow = (mastra as any).getWorkflow('whatsappPipeline')
    const run      = await workflow.createRun()

    await run.start({
      inputData: {
        wam_id,
        client_phone,
        trainer_id:        trainerId,
        message_timestamp,
        message_type,
        raw_body: JSON.stringify({
          message_text,
          media_id,
          button_reply_id,
        }),
      },
    })

    await supabase
      .from('incoming_webhook_logs')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('wam_id', wam_id)
  } catch (err) {
    console.error('[queueConsumer] workflow error for wam_id', wam_id, (err as Error).message)

    await supabase
      .from('incoming_webhook_logs')
      .update({ status: 'failed', processed_at: new Date().toISOString() })
      .eq('wam_id', wam_id)
  }

  // Always remove from queue to prevent infinite retry
  await supabase.rpc('pgmq_delete', {
    queue_name: 'whatsapp_incoming_queue',
    msg_id,
  })
}

async function pollQueue(): Promise<void> {
  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('pgmq_read', {
    queue_name: 'whatsapp_incoming_queue',
    vt:         30,
    qty:        5,
  })

  if (error) {
    console.error('[queueConsumer] pgmq_read error:', error.message)
    return
  }

  const records = (data as PgmqRecord[] | null) ?? []
  await Promise.all(records.map((record) => processMessage(record)))
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
      console.error('[queueConsumer] unhandled poll error:', (err as Error).message)
    }
    setTimeout(tick, POLL_INTERVAL_MS)
  }

  tick()
  console.log('[queueConsumer] worker started — polling whatsapp_incoming_queue every', POLL_INTERVAL_MS, 'ms')
}

export function stopQueueWorker(): void {
  isRunning = false
  console.log('[queueConsumer] worker stopped')
}
