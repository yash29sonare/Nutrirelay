import { describe, it, expect } from "vitest"
import { mapEngagementEvents, mapClientState, mapEngagementActions } from "@/lib/timeline/timelineMapper"
import { createEvent, createClient } from "../builders/index"
import { createAction } from "../builders/index"

describe("timelineMapper", () => {
  describe("mapEngagementEvents", () => {
    it("maps empty events to empty array", () => {
      expect(mapEngagementEvents([], "c1")).toHaveLength(0)
    })

    it("filters events by clientId", () => {
      const events = [
        createEvent({ eventType: "ACTION_CREATED", clientId: "c1" }),
        createEvent({ eventType: "ACTION_COMPLETED", clientId: "c2" }),
      ]
      const mapped = mapEngagementEvents(events, "c1")
      expect(mapped).toHaveLength(1)
      expect(mapped[0].clientId).toBe("c1")
    })

    it("maps action events to timeline entries", () => {
      const events = [createEvent({ eventType: "ACTION_CREATED", clientId: "c1" })]
      const mapped = mapEngagementEvents(events, "c1")
      expect(mapped.length).toBeGreaterThan(0)
      expect(mapped[0]).toHaveProperty("id")
      expect(mapped[0]).toHaveProperty("timestamp")
    })

    it("is deterministic", () => {
      const events = [createEvent({ eventType: "ACTION_CREATED", clientId: "c1" })]
      const a = mapEngagementEvents(events, "c1")
      const b = mapEngagementEvents(events, "c1")
      expect(a).toEqual(b)
    })
  })

  describe("mapClientState", () => {
    it("returns empty array for client with no activity", () => {
      const client = createClient({ mealsLoggedToday: 0, strikeCount: 0 })
      const entries = mapClientState(client)
      expect(entries).toHaveLength(0)
    })

    it("creates compliance entry for strikes", () => {
      const client = createClient({ mealsLoggedToday: 0, strikeCount: 2 })
      const entries = mapClientState(client)
      expect(entries.length).toBeGreaterThan(0)
      expect(entries.some((e) => e.eventType === "ACTIVE_STRIKES")).toBe(true)
    })

    it("creates meal entry when meals logged", () => {
      const client = createClient({ mealsLoggedToday: 3, strikeCount: 0 })
      const entries = mapClientState(client)
      expect(entries.length).toBeGreaterThan(0)
      expect(entries.some((e) => e.eventType === "MEALS_LOGGED")).toBe(true)
    })
  })

  describe("mapEngagementActions", () => {
    it("maps empty array to empty array", () => {
      expect(mapEngagementActions([], "c1")).toHaveLength(0)
    })

    it("maps engagement actions to timeline format", () => {
      const actions = [createAction({ type: "message", clientId: "c1" })]
      const mapped = mapEngagementActions(actions, "c1")
      expect(mapped).toHaveLength(1)
      expect(mapped[0]).toHaveProperty("id")
      expect(mapped[0]).toHaveProperty("eventType")
    })

    it("is deterministic", () => {
      const actions = [
        createAction({ type: "message" }),
        createAction({ type: "check_in" }),
      ]
      const a = mapEngagementActions(actions, "c1")
      const b = mapEngagementActions(actions, "c1")
      expect(a).toEqual(b)
    })
  })
})
