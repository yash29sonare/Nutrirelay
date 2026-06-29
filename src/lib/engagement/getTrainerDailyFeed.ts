/**
 * ════════════════════════════════════════════════════════════
 * Trainer Daily Feed — Action Grouping Layer
 * ════════════════════════════════════════════════════════════
 *
 * Groups EngagementAction[] by priority for the daily feed view.
 * Filters out dismissed/completed actions when engagement state
 * is provided.
 *
 * Pure deterministic — no DB, no RPC, no side effects.
 * ════════════════════════════════════════════════════════════
 */

import type { EngagementAction, TrainerDailyFeed } from "@/types/engagement"
import type { ClientEngagementState } from "@/types/engagement-state"

function shouldShowAction(
  action: EngagementAction,
  states?: Map<string, ClientEngagementState>,
): boolean {
  if (!states || !action.clientId) return true
  const state = states.get(action.clientId)
  if (!state) return true
  return state.activeActions.some((a) => a.actionId === action.id)
}

export function getTrainerDailyFeed(
  actions: EngagementAction[],
  engagementStates?: Map<string, ClientEngagementState>,
): TrainerDailyFeed {
  const high: EngagementAction[] = []
  const medium: EngagementAction[] = []
  const low: EngagementAction[] = []

  for (const a of actions) {
    if (!shouldShowAction(a, engagementStates)) continue

    if (a.priority === "high") high.push(a)
    else if (a.priority === "medium") medium.push(a)
    else low.push(a)
  }

  return {
    highPriority: high,
    mediumPriority: medium,
    lowPriority: low,
  }
}
