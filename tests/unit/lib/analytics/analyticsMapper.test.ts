import { describe, it, expect } from "vitest"
import { mapTimelineActivity } from "@/lib/analytics/analyticsMapper"
import type { EngagementEvent } from "@/types/engagement-events"

function makeEvent(overrides: Partial<EngagementEvent>): EngagementEvent {
  return {
    event_id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    event_type: "MEAL_RECORDED",
    created_at: "2026-06-29T10:00:00Z",
    client_id: "c1",
    payload: null,
    ...overrides,
  }
}

const clientNameMap = new Map([
  ["c1", "Alice"],
  ["c2", "Bob"],
])

describe("mapTimelineActivity", () => {
  it("filters to activity event types only", () => {
    const events = [
      makeEvent({ event_type: "MEAL_RECORDED" }),
      makeEvent({ event_type: "SOME_UNKNOWN_EVENT" as any }),
    ]
    const result = mapTimelineActivity(events, clientNameMap)
    const totalEvents = result.reduce((sum, g) => sum + g.events.length, 0)
    expect(totalEvents).toBe(1)
  })

  it("groups events by date descending", () => {
    const events = [
      makeEvent({ event_type: "MEAL_RECORDED", created_at: "2026-06-29T10:00:00Z" }),
      makeEvent({ event_type: "MEAL_RECORDED", created_at: "2026-06-28T10:00:00Z" }),
      makeEvent({ event_type: "MEAL_RECORDED", created_at: "2026-06-29T12:00:00Z" }),
    ]
    const result = mapTimelineActivity(events, clientNameMap)
    expect(result).toHaveLength(2)
    expect(result[0].dateKey).toBe("2026-06-29")
    expect(result[1].dateKey).toBe("2026-06-28")
  })

  it("sorts events newest first within groups", () => {
    const events = [
      makeEvent({ event_type: "MEAL_RECORDED", event_id: "old", created_at: "2026-06-29T08:00:00Z" }),
      makeEvent({ event_type: "MEAL_RECORDED", event_id: "new", created_at: "2026-06-29T12:00:00Z" }),
    ]
    const result = mapTimelineActivity(events, clientNameMap)
    expect(result[0].events[0].eventId).toBe("new")
  })

  it("resolves client name from map", () => {
    const events = [
      makeEvent({ event_type: "MEAL_RECORDED", client_id: "c2" }),
    ]
    const result = mapTimelineActivity(events, clientNameMap)
    expect(result[0].events[0].clientName).toBe("Bob")
  })

  it("falls back to truncated id for unknown client", () => {
    const events = [
      makeEvent({ event_type: "MEAL_RECORDED", client_id: "unknown-id-12345" }),
    ]
    const result = mapTimelineActivity(events, clientNameMap)
    expect(result[0].events[0].clientName).toBe("unknown-")
  })

  it("respects limit", () => {
    const events = Array.from({ length: 50 }, (_, i) =>
      makeEvent({ event_type: "MEAL_RECORDED", event_id: `evt-${i}`, created_at: `2026-06-${29 - (i % 5)}T10:00:00Z` }),
    )
    const result = mapTimelineActivity(events, clientNameMap, 10)
    const totalEvents = result.reduce((sum, g) => sum + g.events.length, 0)
    expect(totalEvents).toBeLessThanOrEqual(10)
  })

  it("maps event properties correctly", () => {
    const events = [
      makeEvent({ event_type: "COMMUNICATION_FAILED" }),
    ]
    const result = mapTimelineActivity(events, clientNameMap)
    const ev = result[0].events[0]
    expect(ev.eventType).toBe("COMMUNICATION_FAILED")
    expect(ev.label).toBe("Failed")
    expect(ev.timestamp).toBeDefined()
  })
})
