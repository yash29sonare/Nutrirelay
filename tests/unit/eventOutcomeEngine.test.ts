import { describe, it, expect } from "vitest"
import {
  computeOutcomeFromEvents,
  buildTrainerBehaviorProfile,
  computeClientResponseRate,
  computeActionEffectiveness,
} from "@/lib/outcomes/eventOutcomeEngine"
import { createEvent } from "../builders/index"

describe("eventOutcomeEngine", () => {
  describe("computeOutcomeFromEvents", () => {
    it("returns zeroed outcomes for empty events", () => {
      const outcomes = computeOutcomeFromEvents([])
      expect(outcomes.totalActionsGenerated).toBe(0)
      expect(outcomes.totalActionsCompleted).toBe(0)
      expect(outcomes.totalActionsDismissed).toBe(0)
      expect(outcomes.completionRate).toBe(0)
    })

    it("counts generated and completed actions", () => {
      const events = [
        createEvent({ eventType: "ACTION_CREATED" }),
        createEvent({ eventType: "ACTION_COMPLETED" }),
      ]
      const outcomes = computeOutcomeFromEvents(events)
      expect(outcomes.totalActionsGenerated).toBe(1)
      expect(outcomes.totalActionsCompleted).toBe(1)
      expect(outcomes.completionRate).toBe(1)
    })

    it("counts dismissed actions", () => {
      const events = [
        createEvent({ eventType: "ACTION_CREATED" }),
        createEvent({ eventType: "ACTION_IGNORED" }),
      ]
      const outcomes = computeOutcomeFromEvents(events)
      expect(outcomes.totalActionsDismissed).toBe(1)
    })

    it("tracks unique client engagement", () => {
      const events = [
        createEvent({ eventType: "ACTION_CREATED", clientId: "c1" }),
        createEvent({ eventType: "ACTION_CREATED", clientId: "c2" }),
        createEvent({ eventType: "ACTION_COMPLETED", clientId: "c1" }),
      ]
      const outcomes = computeOutcomeFromEvents(events)
      expect(outcomes.uniqueClientsEngaged).toBe(2)
      expect(outcomes.uniqueClientsWithOutcome).toBe(1)
    })
  })

  describe("buildTrainerBehaviorProfile", () => {
    it("returns empty profile for no events", () => {
      const profile = buildTrainerBehaviorProfile([])
      expect(profile.completedActionTypes).toEqual({})
      expect(profile.dismissedActionTypes).toEqual({})
      expect(profile.averageCompletionTimeMs).toBeNull()
    })

    it("tracks completed action types", () => {
      const events = [
        createEvent({ eventType: "ACTION_COMPLETED", payload: { type: "message" } }),
        createEvent({ eventType: "ACTION_COMPLETED", payload: { type: "message" } }),
      ]
      const profile = buildTrainerBehaviorProfile(events)
      expect(profile.completedActionTypes.message).toBe(2)
    })
  })

  describe("computeClientResponseRate", () => {
    it("returns 0 for no events", () => {
      expect(computeClientResponseRate([])).toBe(0)
    })
  })

  describe("computeActionEffectiveness", () => {
    it("returns null for no events", () => {
      expect(computeActionEffectiveness([])).toBeNull()
    })

    it("returns effectiveness data for action events", () => {
      const events = [
        createEvent({ eventType: "ACTION_CREATED", payload: { type: "message", confidence: 0.8 } }),
        createEvent({ eventType: "ACTION_COMPLETED", payload: { type: "message" } }),
      ]
      const result = computeActionEffectiveness(events)
      expect(result).not.toBeNull()
      expect(result!).toHaveLength(1)
      expect(result![0].type).toBe("message")
    })
  })
})
