/**
 * ════════════════════════════════════════════════════════════
 * Engagement Action Model
 * ════════════════════════════════════════════════════════════
 *
 * Convert intelligence → actions → trainer workflow.
 * Pure deterministic model — no DB, no RPC, no side effects.
 * ════════════════════════════════════════════════════════════
 */

export type ActionPriority = "high" | "medium" | "low"

export type ActionType =
  | "message"
  | "check_in"
  | "adjust_plan"
  | "review"
  | "recovery"

export interface EngagementAction {
  id: string
  clientId: string
  clientName: string
  priority: ActionPriority
  type: ActionType
  reason: string
  confidence: number
  createdAt: string
}

export interface TrainerDailyFeed {
  highPriority: EngagementAction[]
  mediumPriority: EngagementAction[]
  lowPriority: EngagementAction[]
}
