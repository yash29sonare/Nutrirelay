// ═══════════════════════════════════════════════════════════════════════════════
// DISABLED — DO NOT USE
//
// This workflow was a direct processing path that bypassed PGMQ. It was only
// ever invoked from the now-deprecated /api/webhooks/whatsapp route (now 410).
//
// RULE: ALL WhatsApp inbound messages MUST go through PGMQ queue.
// Pipeline: webhook → pgmq_send → queueConsumer → whatsappPipeline
//
// This file is preserved for reference only. Every step logs [CRITICAL VIOLATION]
// at runtime and rejects execution.
// ═══════════════════════════════════════════════════════════════════════════════

import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'

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

const VIOLATION = '[CRITICAL VIOLATION] inboundMessageRouterWorkflow is permanently disabled. ALL WhatsApp inbound messages MUST go through PGMQ queue. Pipeline: webhook → pgmq_send → queueConsumer → whatsappPipeline'

const dequeueAndLockStep = createStep({
  id:           'dequeueAndLockStep',
  description:  'DISABLED — always throws.',
  inputSchema,
  outputSchema: routerStateSchema,
  execute: async (_input): Promise<RouterState> => {
    const err = new Error('DIRECT INGESTION BLOCKED: USE /api/webhook/whatsapp')
    console.error(VIOLATION)
    console.error('[CRITICAL VIOLATION] stack:', err.stack)
    throw err
  },
})

const routeMessageStep = createStep({
  id:           'routeMessageStep',
  description:  'DISABLED — always throws.',
  inputSchema:  routerStateSchema,
  outputSchema: routerStateSchema,
  execute: async (_input): Promise<RouterState> => {
    const err = new Error('DIRECT INGESTION BLOCKED: USE /api/webhook/whatsapp')
    console.error(VIOLATION)
    console.error('[CRITICAL VIOLATION] stack:', err.stack)
    throw err
  },
})

const updateTelemetryStateStep = createStep({
  id:           'updateTelemetryStateStep',
  description:  'DISABLED — always throws.',
  inputSchema:  routerStateSchema,
  outputSchema: routerStateSchema.extend({ telemetryUpdated: z.boolean() }),
  execute: async (_input): Promise<RouterState & { telemetryUpdated: boolean }> => {
    const err = new Error('DIRECT INGESTION BLOCKED: USE /api/webhook/whatsapp')
    console.error(VIOLATION)
    console.error('[CRITICAL VIOLATION] stack:', err.stack)
    throw err
  },
})

const ackQueueMessageStep = createStep({
  id:           'ackQueueMessageStep',
  description:  'DISABLED — always throws.',
  inputSchema:  routerStateSchema.extend({ telemetryUpdated: z.boolean() }),
  outputSchema,
  execute: async (_input): Promise<RouterOutput> => {
    const err = new Error('DIRECT INGESTION BLOCKED: USE /api/webhook/whatsapp')
    console.error(VIOLATION)
    console.error('[CRITICAL VIOLATION] stack:', err.stack)
    throw err
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
