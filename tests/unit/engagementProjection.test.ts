import { describe, it, expect } from "vitest"
import { buildEngagementState, filterByProjection } from "@/lib/engagement/engagementProjection"
import { createEvent } from "../builders/index"

describe("engagementProjection", () => {
  describe("buildEngagementState", () => {
    it("returns empty projection for no events", () => {
      const projection = buildEngagementState([])
      expect(projection.statusByKey.size).toBe(0)
    })

    it("marks actions as active from ACTION_CREATED events with actionKey", () => {
      const events = [
        createEvent({ eventType: "ACTION_CREATED", payload: { actionKey: "t1:c1:message:check-in", actionType: "message" } }),
      ]
      const projection = buildEngagementState(events)
      expect(projection.statusByKey.size).toBe(1)
      expect(projection.statusByKey.get("t1:c1:message:check-in")).toBe("active")
    })

    it("ignores events without actionKey in payload", () => {
      const events = [
        createEvent({ eventType: "ACTION_CREATED", payload: { actionType: "message" } }),
      ]
      const projection = buildEngagementState(events)
      expect(projection.statusByKey.size).toBe(0)
    })

    it("is deterministic — same events produce same projection", () => {
      const events = [
        createEvent({ eventType: "ACTION_CREATED", payload: { actionKey: "k1" } }),
        createEvent({ eventType: "ACTION_COMPLETED", payload: { actionKey: "k1" } }),
      ]
      const a = buildEngagementState(events)
      const b = buildEngagementState(events)
      expect(a.statusByKey).toEqual(b.statusByKey)
    })

    it("applies events in chronological order", () => {
      const early = createEvent({ eventType: "ACTION_CREATED", payload: { actionKey: "k1" } })
      early.created_at = "2026-01-01T00:00:00.000Z"
      const late = createEvent({ eventType: "ACTION_COMPLETED", payload: { actionKey: "k1" } })
      late.created_at = "2026-06-01T00:00:00.000Z"
      const events = [late, early]
      const projection = buildEngagementState(events)
      expect(projection.statusByKey.get("k1")).toBe("completed")
    })
  })

  describe("filterByProjection", () => {
    it("filters out completed actions", () => {
      const events = [
        createEvent({ eventType: "ACTION_COMPLETED", payload: { actionKey: "t1:c1:message:check-in" }, clientId: "c1" }),
      ]
      const projection = buildEngagementState(events)
      const actions = [
        { clientId: "c1", type: "message", reason: "check-in" },
      ]
      const filtered = filterByProjection(actions, projection, "t1")
      expect(filtered).toHaveLength(0)
    })

    it("returns all actions when projection is empty", () => {
      const projection = buildEngagementState([])
      const actions = [
        { clientId: "c1", type: "message", reason: "check-in" },
        { clientId: "c2", type: "check_in", reason: "overdue" },
      ]
      const filtered = filterByProjection(actions, projection, "t1")
      expect(filtered).toHaveLength(2)
    })

    it("matches by trainerId:clientId:type:reason key", () => {
      const events = [
        createEvent({ eventType: "ACTION_COMPLETED", payload: { actionKey: "t1:c1:message:check-in" }, clientId: "c1" }),
      ]
      const projection = buildEngagementState(events)
      const actions = [
        { clientId: "c1", type: "message", reason: "check-in" },
        { clientId: "c2", type: "message", reason: "check-in" },
      ]
      const filtered = filterByProjection(actions, projection, "t1")
      expect(filtered).toHaveLength(1)
      expect(filtered[0].clientId).toBe("c2")
    })
  })
})
