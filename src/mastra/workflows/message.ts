import { createWorkflow, createStep } from '@mastra/core/workflows'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { voiceNoteRecoveryWorkflow } from './recovery'

// ── Supabase service client ────────────────────────────────────────────────────
function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const payloadSchema = z.object({
  messageType: z.enum(['text', 'audio', 'interactive']),
  messageBody: z.string(),
  senderId:    z.string(),
  mediaId:     z.string().optional(),
})

const inputSchema = z.object({
  queueMessageId: z.string(),
  payload:        payloadSchema,
})

const routerStateSchema = z.object({
  queueMessageId:  z.string(),
  payload:         payloadSchema,
  isDuplicate:     z.boolean(),
  clientId:        z.string().nullable(),
  routedTo:        z.enum(['voice_note', 'text', 'interactive', 'skipped']).optional(),
  routeError:      z.string().nullable(),
})

const outputSchema = routerStateSchema.extend({
  telemetryUpdated: z.boolean(),
  acked:            z.boolean(),
})

type RouterState = z.infer<typeof routerStateSchema>
type RouterOutput = z.infer<typeof outputSchema>

// ── Step 1: Dequeue isolation & duplicate guard ────────────────────────────────

const dequeueAndLockStep = createStep({
  id:           'dequeueAndLockStep',
  description:  'Validates the queue message is not already processed and resolves clientId.',
  inputSchema,
  outputSchema: routerStateSchema,
  execute: async ({ inputData }): Promise<RouterState> => {
    const db = getDb()
    const { queueMessageId, payload } = inputData

    // Check for an existing log entry — UNIQUE index on wam_id prevents double-processing
    const { data: existing } = await db
      .from('incoming_webhook_logs')
      .select('id, status')
      .eq('wam_id', queueMessageId)
      .limit(1)
      .single()

    if (existing && existing.status === 'processed') {
      return {
        queueMessageId,
        payload,
        isDuplicate: true,
        clientId:    null,
        routedTo:    'skipped',
        routeError:  null,
      }
    }

    // Resolve clientId from sender phone number
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('phone_number', payload.senderId)
      .limit(1)
      .single()

    return {
      queueMessageId,
      payload,
      isDuplicate: false,
      clientId:    (profile as { id: string } | null)?.id ?? null,
      routedTo:    undefined,
      routeError:  null,
    }
  },
})

// ── Step 2: Message type routing ───────────────────────────────────────────────

const routeMessageStep = createStep({
  id:           'routeMessageStep',
  description:  'Routes the message to voiceNoteRecoveryWorkflow or NLP path.',
  inputSchema:  routerStateSchema,
  outputSchema: routerStateSchema,
  execute: async ({ inputData }): Promise<RouterState> => {
    if (inputData.isDuplicate || !inputData.clientId) {
      return { ...inputData, routedTo: 'skipped', routeError: null }
    }

    const { payload, queueMessageId, clientId } = inputData

    if (payload.messageType === 'audio') {
      try {
        const run = await voiceNoteRecoveryWorkflow.createRun()
        await run.start({
          inputData: {
            mediaId:           payload.mediaId ?? '',
            whatsappMessageId: queueMessageId,
            userContext:       { clientId },
          },
        })
        return { ...inputData, routedTo: 'voice_note', routeError: null }
      } catch (err) {
        const msg = (err as Error).message
        console.error('[router/route] voiceNoteRecovery failed for', queueMessageId, msg)
        return { ...inputData, routedTo: 'voice_note', routeError: msg }
      }
    }

    // Text and interactive: pass through — downstream NLP step will process
    return {
      ...inputData,
      routedTo:   payload.messageType === 'interactive' ? 'interactive' : 'text',
      routeError: null,
    }
  },
})

// ── Step 3: Client telemetry update & ghost-lock reset ─────────────────────────

const updateTelemetryStateStep = createStep({
  id:           'updateTelemetryStateStep',
  description:  'Marks log as processed and clears ghost strikes for active clients.',
  inputSchema:  routerStateSchema,
  outputSchema: routerStateSchema.extend({ telemetryUpdated: z.boolean() }),
  execute: async ({ inputData }): Promise<RouterState & { telemetryUpdated: boolean }> => {
    if (inputData.isDuplicate) {
      return { ...inputData, telemetryUpdated: false }
    }

    const db = getDb()
    const now = new Date().toISOString()

    // Mark the webhook log as processed
    await db
      .from('incoming_webhook_logs')
      .update({ status: 'processed', processed_at: now })
      .eq('wam_id', inputData.queueMessageId)

    // Reset ghost-lock: delete any open strike_log entries for this client.
    // The ghosting daemon reads strike_log to determine silence duration —
    // clearing it on inbound activity resets the strike counter.
    if (inputData.clientId) {
      await db
        .from('strike_log')
        .delete()
        .eq('profile_id', inputData.clientId)
    }

    return { ...inputData, telemetryUpdated: true }
  },
})

// ── Step 4: Queue acknowledgment & purge ───────────────────────────────────────

const ackQueueMessageStep = createStep({
  id:           'ackQueueMessageStep',
  description:  'Finalises the router run. pgmq deletion is handled by queueConsumer — this workflow is invoked directly from the webhook route, not from a pgmq dequeue context.',
  inputSchema:  routerStateSchema.extend({ telemetryUpdated: z.boolean() }),
  outputSchema,
  execute: async ({ inputData }): Promise<RouterOutput> => {
    return {
      ...inputData,
      acked: true,
    }
  },
})

// ── Workflow assembly ──────────────────────────────────────────────────────────

export const inboundMessageRouterWorkflow = createWorkflow({
  id:           'inboundMessageRouterWorkflow',
  inputSchema,
  outputSchema,
})
  .then(dequeueAndLockStep       as any)
  .then(routeMessageStep         as any)
  .then(updateTelemetryStateStep as any)
  .then(ackQueueMessageStep      as any)
  .commit()
