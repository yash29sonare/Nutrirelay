/**
 * ════════════════════════════════════════════════════════════
 * Engagement State & Action Lifecycle Model
 * ════════════════════════════════════════════════════════════
 *
 * Lightweight in-memory engagement workflow state.
 * Pure deterministic — no DB, no RPC, no side effects.
 *
 * Designed to be backed by persistent storage in future phases.
 * ════════════════════════════════════════════════════════════
 */

export type ActionStatus = "active" | "completed" | "dismissed"

export interface ActionLifecycle {
  actionId: string
  status: ActionStatus
  completedAt?: string
  dismissedAt?: string
}

export interface ClientEngagementState {
  clientId: string
  activeActions: ActionLifecycle[]
  completedActions: ActionLifecycle[]
  dismissedActions: ActionLifecycle[]
  lastActionTimestamp: string | null
  engagementScore: number
}
