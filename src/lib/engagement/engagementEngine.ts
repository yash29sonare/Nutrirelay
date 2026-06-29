/**
 * ════════════════════════════════════════════════════════════
 * Engagement Engine — Action Queue Generator
 * ════════════════════════════════════════════════════════════
 *
 * Transforms DTO + Insights + Semantics into a prioritized
 * action queue for the trainer.
 *
 * Pure deterministic — O(n) over clients, no DB, no RPC.
 *
 * Insight → Action → Trainer Behavior
 * ════════════════════════════════════════════════════════════
 */

import type { DashboardDataDTO } from "@/types/dashboard"
import type { DashboardInsights } from "@/types/dashboard-insights"
import type { EngagementAction } from "@/types/engagement"
import {
  isClientAtRisk,
  getPerformanceTrend,
  getComplianceState,
} from "@/lib/domain/dashboardSemantics"
import { filterDuplicateActions } from "@/lib/engagement/deduplicationEngine"
import {
  getEngagementState,
  shouldSuppressAction,
} from "@/lib/engagement/engagementStateEngine"

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

let _counter = 0
function nextId(): string {
  return `action-${++_counter}`
}

function buildActions(dto: DashboardDataDTO): EngagementAction[] {
  const actions: EngagementAction[] = []
  const now = new Date().toISOString()
  const trend = getPerformanceTrend(dto.metrics)
  const compliance = getComplianceState(dto.metrics)

  // ── Per-client: at-risk check_in ─────────────────────────
  for (const client of dto.clients) {
    if (isClientAtRisk(client)) {
      actions.push({
        id: nextId(),
        clientId: client.client_id,
        clientName: client.client_name,
        priority: "high",
        type: "check_in",
        reason: "Client has active risk indicators",
        confidence: 85,
        createdAt: now,
      })
    }
  }

  // ── Trainer-level: performance trend ─────────────────────
  if (trend === "declining") {
    actions.push({
      id: nextId(),
      clientId: "",
      clientName: "All clients",
      priority: "high",
      type: "recovery",
      reason: "Performance declining over time",
      confidence: 75,
      createdAt: now,
    })
  }

  if (trend === "improving") {
    actions.push({
      id: nextId(),
      clientId: "",
      clientName: "All clients",
      priority: "low",
      type: "adjust_plan",
      reason: "Client ready for progression",
      confidence: 80,
      createdAt: now,
    })
  }

  if (trend === "stable") {
    actions.push({
      id: nextId(),
      clientId: "",
      clientName: "All clients",
      priority: "low",
      type: "review",
      reason: "Maintain current progress",
      confidence: 65,
      createdAt: now,
    })
  }

  // ── Trainer-level: compliance state ──────────────────────
  if (compliance.level === "moderate" || compliance.level === "low") {
    actions.push({
      id: nextId(),
      clientId: "",
      clientName: "All clients",
      priority: "medium",
      type: "message",
      reason: "Compliance needs improvement",
      confidence: 70,
      createdAt: now,
    })
  }

  // ── Sort: priority → confidence → deterministic id ──────
  actions.sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (pDiff !== 0) return pDiff
    const cDiff = b.confidence - a.confidence
    if (cDiff !== 0) return cDiff
    return a.id.localeCompare(b.id)
  })

  return actions
}

export function generateActionQueue(
  dto: DashboardDataDTO,
  _insights: DashboardInsights,
): EngagementAction[] {
  _counter = 0
  const raw = buildActions(dto)

  // ── 1. Deduplicate: remove identical action records ─────
  const deduped = filterDuplicateActions(raw)

  // ── 2. Suppress: apply state-based suppression rules ────
  const clientMap = new Map(dto.clients.map((c) => [c.client_id, c]))
  const result: EngagementAction[] = []
  const seenClients = new Set<string>()

  for (const action of deduped) {
    // Trainer-level actions always pass through
    if (!action.clientId) {
      result.push(action)
      continue
    }

    // Derive engagement state and check suppression
    const client = clientMap.get(action.clientId)
    if (!client) continue

    const state = getEngagementState(client, result)
    if (shouldSuppressAction(state, action)) continue

    result.push(action)
    seenClients.add(action.clientId)
  }

  // ── 3. Preserve original sort order ─────────────────────
  result.sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (pDiff !== 0) return pDiff
    const cDiff = b.confidence - a.confidence
    if (cDiff !== 0) return cDiff
    return a.id.localeCompare(b.id)
  })

  return result
}

// ── Projection layer moved to engagementProjection.ts ────
