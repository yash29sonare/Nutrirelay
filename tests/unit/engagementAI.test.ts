import { describe, it, expect } from "vitest"
import { generateInsightsFromEvents } from "@/lib/ai/engagementAI"
import { createEvent } from "../builders/index"

describe("engagementAI", () => {
  it("returns null for empty events", () => {
    const result = generateInsightsFromEvents([])
    expect(result).toBeNull()
  })

  it("generates insights from action events", () => {
    const events = [
      createEvent({ eventType: "ACTION_CREATED", payload: { actionType: "message", confidence: 0.8 } }),
      createEvent({ eventType: "ACTION_COMPLETED", payload: { actionType: "message", confidence: 0.9 } }),
    ]
    const result = generateInsightsFromEvents(events)
    expect(result).not.toBeNull()
    expect(result!.confidenceScore).toBeGreaterThanOrEqual(0)
    expect(result!.explanation.length).toBeGreaterThan(0)
  })

  it("handles events with null clients", () => {
    const events = [
      createEvent({ eventType: "ACTION_CREATED", clientId: null }),
    ]
    const result = generateInsightsFromEvents(events)
    expect(result).not.toBeNull()
  })

  it("is deterministic for same events", () => {
    const events = [
      createEvent({ eventType: "ACTION_CREATED", payload: { actionType: "message", confidence: 0.8 } }),
    ]
    const a = generateInsightsFromEvents(events)
    const b = generateInsightsFromEvents(events)
    expect(a).toEqual(b)
  })

  it("handles large event arrays without error", () => {
    const events = Array.from({ length: 100 }, (_, i) =>
      createEvent({ eventType: "ACTION_CREATED", eventId: `bulk-${i}`, payload: { actionType: "message", confidence: 0.5 + (i % 5) * 0.1 } }),
    )
    const result = generateInsightsFromEvents(events)
    expect(result).not.toBeNull()
  })
})
