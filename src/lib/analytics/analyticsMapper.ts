import type { EngagementEvent } from "@/types/engagement-events"
import type { TimelineActivityGroup } from "@/types/analytics"
import { ACTIVITY_EVENT_TYPES, EVENT_LABELS } from "./analyticsFormatting"

export const ACTIVITY_LIMIT = 40

export function mapTimelineActivity(
  events: EngagementEvent[],
  clientNameMap: Map<string, string>,
  limit = ACTIVITY_LIMIT,
): TimelineActivityGroup[] {
  const activityEvents = events
    .filter((e) => ACTIVITY_EVENT_TYPES.has(e.event_type))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)

  const activityByDate = new Map<string, EngagementEvent[]>()
  for (const ev of activityEvents) {
    const dateKey = ev.created_at.slice(0, 10)
    const group = activityByDate.get(dateKey) ?? []
    group.push(ev)
    activityByDate.set(dateKey, group)
  }

  const sortedActivityDates = [...activityByDate.keys()].sort((a, b) => b.localeCompare(a))

  return sortedActivityDates.map((dateKey) => ({
    dateKey,
    events: activityByDate.get(dateKey)!.map((ev) => ({
      eventId: ev.event_id,
      eventType: ev.event_type,
      label: EVENT_LABELS[ev.event_type] ?? ev.event_type,
      clientName: ev.client_id
        ? (clientNameMap.get(ev.client_id) ?? ev.client_id.slice(0, 8))
        : "",
      timestamp: ev.created_at,
    })),
  }))
}
