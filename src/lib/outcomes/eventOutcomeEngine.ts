import type { EngagementEvent } from "@/types/engagement-events"

export interface EngagementOutcomes {
  totalActionsGenerated: number
  totalActionsCompleted: number
  totalActionsDismissed: number
  completionRate: number
  clientResponseRate: number
  uniqueClientsEngaged: number
  uniqueClientsWithOutcome: number
}

export function computeOutcomeFromEvents(
  events: EngagementEvent[],
): EngagementOutcomes {
  let generated = 0
  let completed = 0
  let dismissed = 0
  const clientsWithAction = new Set<string>()
  const clientsWithOutcome = new Set<string>()

  for (const event of events) {
    switch (event.event_type) {
      case "ACTION_CREATED":
        generated++
        if (event.client_id) clientsWithAction.add(event.client_id)
        break
      case "ACTION_COMPLETED":
        completed++
        if (event.client_id) clientsWithOutcome.add(event.client_id)
        break
      case "ACTION_IGNORED":
        dismissed++
        if (event.client_id) clientsWithOutcome.add(event.client_id)
        break
    }
  }

  const totalResolved = completed + dismissed

  return {
    totalActionsGenerated: generated,
    totalActionsCompleted: completed,
    totalActionsDismissed: dismissed,
    completionRate: generated > 0 ? completed / generated : 0,
    clientResponseRate:
      clientsWithAction.size > 0
        ? clientsWithOutcome.size / clientsWithAction.size
        : 0,
    uniqueClientsEngaged: clientsWithAction.size,
    uniqueClientsWithOutcome: clientsWithOutcome.size,
  }
}

export function buildTrainerBehaviorProfile(
  events: EngagementEvent[],
): {
  completedActionTypes: Record<string, number>
  dismissedActionTypes: Record<string, number>
  averageCompletionTimeMs: number | null
} {
  const completedActionTypes: Record<string, number> = {}
  const dismissedActionTypes: Record<string, number> = {}
  const completionTimes: number[] = []

  for (const event of events) {
    if (event.event_type === "ACTION_COMPLETED") {
      const type = event.payload?.type as string | undefined
      if (type) completedActionTypes[type] = (completedActionTypes[type] ?? 0) + 1

      const generatedAt = event.payload?.generated_at as string | undefined
      if (generatedAt) {
        completionTimes.push(
          new Date(event.created_at).getTime() - new Date(generatedAt).getTime(),
        )
      }
    }

    if (event.event_type === "ACTION_IGNORED") {
      const type = event.payload?.type as string | undefined
      if (type) dismissedActionTypes[type] = (dismissedActionTypes[type] ?? 0) + 1
    }
  }

  return {
    completedActionTypes,
    dismissedActionTypes,
    averageCompletionTimeMs:
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : null,
  }
}

export function computeClientResponseRate(
  events: EngagementEvent[],
): number {
  const generatedByClient = new Map<string, number>()
  const resolvedByClient = new Map<string, number>()

  for (const event of events) {
    if (!event.client_id) continue

    if (event.event_type === "ACTION_CREATED") {
      generatedByClient.set(
        event.client_id,
        (generatedByClient.get(event.client_id) ?? 0) + 1,
      )
    }

    if (
      event.event_type === "ACTION_COMPLETED" ||
      event.event_type === "ACTION_IGNORED"
    ) {
      resolvedByClient.set(
        event.client_id,
        (resolvedByClient.get(event.client_id) ?? 0) + 1,
      )
    }
  }

  let totalClients = 0
  let respondingClients = 0

  for (const [clientId, generated] of generatedByClient) {
    totalClients++
    const resolved = resolvedByClient.get(clientId) ?? 0
    if (resolved > 0 && resolved >= generated * 0.5) {
      respondingClients++
    }
  }

  return totalClients > 0 ? respondingClients / totalClients : 0
}

export function computeActionEffectiveness(
  events: EngagementEvent[],
):
  | { type: string; completionRate: number; avgConfidence: number }[]
  | null {
  const byType = new Map<
    string,
    { generated: number; completed: number; totalConfidence: number }
  >()

  for (const event of events) {
    const type = event.payload?.type as string | undefined
    if (!type) continue

    if (event.event_type === "ACTION_CREATED") {
      const existing = byType.get(type) ?? {
        generated: 0,
        completed: 0,
        totalConfidence: 0,
      }
      existing.generated++
      existing.totalConfidence += (event.payload?.confidence as number) ?? 0
      byType.set(type, existing)
    }

    if (event.event_type === "ACTION_COMPLETED") {
      const existing = byType.get(type) ?? {
        generated: 0,
        completed: 0,
        totalConfidence: 0,
      }
      existing.completed++
      byType.set(type, existing)
    }
  }

  if (byType.size === 0) return null

  return Array.from(byType.entries())
    .map(([type, data]) => ({
      type,
      completionRate:
        data.generated > 0 ? data.completed / data.generated : 0,
      avgConfidence:
        data.generated > 0 ? data.totalConfidence / data.generated : 0,
    }))
    .sort((a, b) => b.completionRate - a.completionRate)
}
