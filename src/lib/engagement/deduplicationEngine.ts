/**
 * ════════════════════════════════════════════════════════════
 * Deduplication Engine — Deterministic Action Suppression
 * ════════════════════════════════════════════════════════════
 *
 * Prevents repeated identical actions within a single
 * generation window. Pure deterministic — no state, no DB.
 * ════════════════════════════════════════════════════════════
 */

import type { EngagementAction } from "@/types/engagement"

// ── 1. Check if a new action duplicates any existing one ─

export function isDuplicateAction(
  existing: EngagementAction[],
  newAction: EngagementAction,
): boolean {
  return existing.some(
    (a) =>
      a.clientId === newAction.clientId &&
      a.type === newAction.type &&
      a.reason === newAction.reason,
  )
}

// ── 2. Filter duplicates, keeping first occurrence ───────

export function filterDuplicateActions(
  actions: EngagementAction[],
): EngagementAction[] {
  const seen = new Set<string>()
  const result: EngagementAction[] = []

  for (const action of actions) {
    const key = `${action.clientId}:${action.type}:${action.reason}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(action)
  }

  return result
}
