import type { EngagementEvent } from "@/types/engagement-events"

export interface AIAdjustmentPayload {
  suggestedWeightChanges: {
    actionType: string
    currentWeight: number
    suggestedWeight: number
    rationale: string
  }[]
  recommendedPriorityShifts: {
    actionType: string
    currentPriority: string
    suggestedPriority: string
    rationale: string
  }[]
  confidenceScore: number
  explanation: string
}

export function generateInsightsFromEvents(
  events: EngagementEvent[],
): AIAdjustmentPayload | null {
  if (events.length === 0) return null

  // ── Analyze action type effectiveness ─────────────────
  const typeStats = new Map<
    string,
    { generated: number; completed: number; dismissed: number }
  >()

  for (const event of events) {
    const type = event.payload?.type as string | undefined
    if (!type) continue

    const stats = typeStats.get(type) ?? {
      generated: 0,
      completed: 0,
      dismissed: 0,
    }

    if (event.event_type === "ACTION_CREATED") stats.generated++
    if (event.event_type === "ACTION_COMPLETED") stats.completed++
    if (event.event_type === "ACTION_IGNORED") stats.dismissed++

    typeStats.set(type, stats)
  }

  const suggestedWeightChanges: AIAdjustmentPayload["suggestedWeightChanges"] = []
  const recommendedPriorityShifts: AIAdjustmentPayload["recommendedPriorityShifts"] = []

  for (const [type, stats] of typeStats) {
    if (stats.generated < 3) continue

    const completionRate = stats.completed / stats.generated
    const dismissalRate = stats.dismissed / stats.generated

    // High dismissal → reduce weight or priority
    if (dismissalRate > 0.5) {
      suggestedWeightChanges.push({
        actionType: type,
        currentWeight: 100,
        suggestedWeight: 50,
        rationale: `High dismissal rate (${(dismissalRate * 100).toFixed(0)}%) — trainer may not find this action type useful.`,
      })
    }

    // High completion → maintain or increase weight
    if (completionRate > 0.7 && stats.completed >= 3) {
      suggestedWeightChanges.push({
        actionType: type,
        currentWeight: 100,
        suggestedWeight: 100,
        rationale: `Consistent completion rate (${(completionRate * 100).toFixed(0)}%) — maintain current weight.`,
      })
    }

    // Low engagement → consider priority shift
    if (completionRate < 0.2 && dismissalRate > 0.3) {
      recommendedPriorityShifts.push({
        actionType: type,
        currentPriority: "high",
        suggestedPriority: "low",
        rationale: `Low completion (${(completionRate * 100).toFixed(0)}%) and high dismissal (${(dismissalRate * 100).toFixed(0)}%) — suggest deprioritizing.`,
      })
    }
  }

  const insightCount =
    suggestedWeightChanges.length + recommendedPriorityShifts.length

  return {
    suggestedWeightChanges,
    recommendedPriorityShifts,
    confidenceScore: events.length > 50 ? 85 : events.length > 20 ? 70 : 50,
    explanation:
      insightCount > 0
        ? `${insightCount} adjustment suggestion${insightCount !== 1 ? "s" : ""} based on ${events.length} event${events.length !== 1 ? "s" : ""} analyzed.`
        : `No significant pattern detected from ${events.length} events.`,
  }
}
