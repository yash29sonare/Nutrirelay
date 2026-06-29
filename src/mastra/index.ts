import { Mastra } from '@mastra/core'
import { PostgresStore } from '@mastra/pg'
import { fitnessAgent } from './agents/fitnessAgent'
import { orchestratorAgent } from './agents/orchestrator'
import { fortressCoach } from './agents/coach'
import { whatsappPipeline } from './workflows/whatsappPipeline'
import { voiceNoteRecoveryWorkflow } from './workflows/recovery'
// [DISABLED] inboundMessageRouterWorkflow intentionally omitted — direct processing
// path that bypasses PGMQ. All WhatsApp traffic must go through the PGMQ queue.
// Pipeline: webhook → pgmq_send → queueConsumer → whatsappPipeline
import { postMealPollWorkflow } from './workflows/poll'
import { startQueueWorker } from '../workers/queueConsumer'

// ── Shared PostgresStore ───────────────────────────────────────────────────────
// Constructed at module scope so the pg connection pool is shared between the
// sync CLI export and the async runtime singleton. The pool is lazy — no TCP
// socket opens until the first query, so this is side-effect-free for plain imports.
const store = new PostgresStore({
  id: 'fortress-fitness-store',
  connectionString: process.env.DATABASE_URL!,
})

// ── Shared agent + workflow map ────────────────────────────────────────────────
const agentMap = {
  fitnessAgent,
  orchestratorAgent,
  fortressCoach,
}

// inboundMessageRouterWorkflow intentionally removed from workflowMap —
// it is a DISABLED direct processing path that bypassed PGMQ.
const workflowMap = {
  whatsappPipeline,
  voiceNoteRecoveryWorkflow,
  postMealPollWorkflow,
}

// ── CLI-compatible named export ────────────────────────────────────────────────
// `mastra dev` / `mastra migrate` require a synchronous named `export const mastra`.
// Storage must be set here so `mastra migrate` can run DDL against the adapter.
// Production callers always use getMastra() instead.
export const mastra = new Mastra({
  storage: store,
  agents: agentMap,
  workflows: workflowMap,
})

// ── globalThis singleton cache ─────────────────────────────────────────────────
const globalForMastra = globalThis as unknown as {
  mastra: Mastra | undefined
  mastraInitPromise: Promise<Mastra> | undefined
  queueWorkerActive: boolean | undefined

  // Dev-only: ensure the queue worker bootstrap actually happens during
  // local runtime testing even if no request path hits getMastra().
  devMastraBootstrapStarted: boolean | undefined
}

async function createMastra(): Promise<Mastra> {
  await store.init()
  return new Mastra({
    storage: store,
    agents: agentMap,
    workflows: workflowMap,
  })
}

// ── getMastra — race-safe async singleton ─────────────────────────────────────
// Stores the in-flight Promise on globalThis so concurrent cold-start callers
// all await the same initialisation — only one Mastra + pg pool is ever created.
export async function getMastra(): Promise<Mastra> {
  if (!globalForMastra.mastra) {
    globalForMastra.mastraInitPromise ??= createMastra().then((m) => {
      globalForMastra.mastra = m
      return m
    })
    await globalForMastra.mastraInitPromise
  }

  if (!globalForMastra.queueWorkerActive) {
    globalForMastra.queueWorkerActive = true
    startQueueWorker()
  }

  return globalForMastra.mastra!
}

// Dev-only bootstrap: trigger getMastra() exactly once so the queue worker
// starts during local tests without requiring a specific request path.
// Non-invasive: guarded by NODE_ENV and by a global “started” flag.
if (process.env.NODE_ENV !== "production") {
  if (!globalForMastra.devMastraBootstrapStarted) {
    globalForMastra.devMastraBootstrapStarted = true
    // Fire-and-forget; getMastra is itself idempotent via global flags.
    void getMastra().catch((err) => {
      console.error("[DEV] mastra bootstrap failed", (err as Error).message)
    })
  }
}
