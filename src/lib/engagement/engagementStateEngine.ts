/**
 * ════════════════════════════════════════════════════════════
 * Engagement State Engine — Action Lifecycle Management
 * ════════════════════════════════════════════════════════════
 *
 * Pure deterministic functions that manage engagement state
 * for each client. Designed to be backed by persistent storage.
 *
 * Current: derives state from DTO + action list (in-memory).
 * Future: can switch to DB-backed lookup by clientId.
 * ════════════════════════════════════════════════════════════
 */

import type { ClientSummary } from "@/types/dashboard"
import type { EngagementAction } from "@/types/engagement"
import type {
  ClientEngagementState,
  ActionLifecycle,
  ActionStatus,
} from "@/types/engagement-state"

// ── Engagement score heuristic ─────────────────────────

function computeEngagementScore(client: ClientSummary): number {
  let score = 50
  if (client.active_strike_count === 0) score += 20
  else if (client.active_strike_count === 1) score -= 10
  else score -= 20
  if (client.total_meals_logged_today > 0) score += 20
  return Math.max(0, Math.min(100, score))
}

// ── 1. Derive engagement state from available data ──────

export function getEngagementState(
  client: ClientSummary,
  actions: EngagementAction[],
): ClientEngagementState {
  const clientActions = actions.filter((a) => a.clientId === client.client_id)

  const activeActions: ActionLifecycle[] = clientActions.map((a) => ({
    actionId: a.id,
    status: "active" as ActionStatus,
  }))

  const timestamps = clientActions
    .map((a) => a.createdAt)
    .filter(Boolean)
    .sort()
    .reverse()

  return {
    clientId: client.client_id,
    activeActions,
    completedActions: [],
    dismissedActions: [],
    lastActionTimestamp: timestamps[0] ?? null,
    engagementScore: computeEngagementScore(client),
  }
}

// ── 2. Update engagement state (pure, returns new state) ─

export function updateEngagementState(
  state: ClientEngagementState,
  actionId: string,
  newStatus: ActionStatus,
): ClientEngagementState {
  const lifecycle: ActionLifecycle = {
    actionId,
    status: newStatus,
    ...(newStatus === "completed" ? { completedAt: new Date().toISOString() } : {}),
    ...(newStatus === "dismissed" ? { dismissedAt: new Date().toISOString() } : {}),
  }

  const removed = state.activeActions.filter((a) => a.actionId !== actionId)

  return {
    ...state,
    activeActions:
      newStatus === "active"
        ? [...state.activeActions, lifecycle]
        : removed,
    completedActions:
      newStatus === "completed"
        ? [...state.completedActions, lifecycle]
        : state.completedActions,
    dismissedActions:
      newStatus === "dismissed"
        ? [...state.dismissedActions, lifecycle]
        : state.dismissedActions,
  }
}

// ── 3. Suppression safety rules ─────────────────────────

export function shouldSuppressAction(
  state: ClientEngagementState,
  newAction: EngagementAction,
): boolean {
  // Suppress low-priority actions for highly engaged clients
  if (newAction.priority === "low" && state.engagementScore >= 80) {
    return true
  }

  // Suppress check_in for clients with no risk indicators
  if (newAction.type === "check_in" && state.engagementScore >= 70) {
    return true
  }

  // Suppress if an active action of the same type already exists
  const hasActiveOfType = state.activeActions.some(
    (a) => a.actionId !== newAction.id && a.status === "active",
  )
  if (hasActiveOfType) {
    return true
  }

  return false
}
