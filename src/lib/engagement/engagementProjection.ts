import type { EngagementEvent } from "@/types/engagement-events"

export type ActionProjectedStatus = "active" | "completed" | "ignored" | "snoozed"

export interface EngagementProjection {
  statusByKey: Map<string, ActionProjectedStatus>
}

export function buildEngagementState(
  events: EngagementEvent[],
): EngagementProjection {
  const statusByKey = new Map<string, ActionProjectedStatus>()

  const sorted = [...events].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  )

  for (const event of sorted) {
    const actionKey = event.payload?.actionKey as string | undefined
    if (!actionKey) continue

    switch (event.event_type) {
      case "ACTION_CREATED":
        statusByKey.set(actionKey, "active")
        break
      case "ACTION_SUPPRESSED":
      case "ACTION_SNOOZED":
        statusByKey.set(actionKey, "snoozed")
        break
      case "ACTION_COMPLETED":
        statusByKey.set(actionKey, "completed")
        break
      case "ACTION_IGNORED":
        statusByKey.set(actionKey, "ignored")
        break
    }
  }

  return { statusByKey }
}

export function filterByProjection<T extends { clientId: string; type: string; reason: string }>(
  runtimeActions: T[],
  projection: EngagementProjection,
  trainerId: string,
): T[] {
  const result: T[] = []

  for (const action of runtimeActions) {
    const cid = action.clientId ?? ""
    const key = `${trainerId}:${cid}:${action.type.toLowerCase().trim()}:${action.reason.toLowerCase().trim()}`
    const status = projection.statusByKey.get(key)

    if (status === "completed" || status === "ignored") continue

    result.push(action)
  }

  return result
}
