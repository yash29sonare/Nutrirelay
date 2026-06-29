import { describe, it, expect } from "vitest"
import { ACTIVITY_EVENT_TYPES, EVENT_LABELS } from "@/lib/analytics/analyticsFormatting"

describe("analyticsFormatting", () => {
  describe("ACTIVITY_EVENT_TYPES", () => {
    it("includes all event types used in timeline", () => {
      expect(ACTIVITY_EVENT_TYPES.has("COMMUNICATION_QUEUED")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("COMMUNICATION_SENT")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("COMMUNICATION_FAILED")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("CONVERSATION_PLANNED")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("CONVERSATION_APPROVED")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("REMINDER_PLANNED")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("REMINDER_APPROVED")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("MEAL_RECORDED")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("MEAL_REVIEWED")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("AUTOMATION_STARTED")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("AUTOMATION_COMPLETED")).toBe(true)
      expect(ACTIVITY_EVENT_TYPES.has("AUTOMATION_FAILED")).toBe(true)
    })

    it("has correct size", () => {
      expect(ACTIVITY_EVENT_TYPES.size).toBe(12)
    })
  })

  describe("EVENT_LABELS", () => {
    it("provides labels for all activity event types", () => {
      for (const eventType of ACTIVITY_EVENT_TYPES) {
        expect(EVENT_LABELS[eventType]).toBeDefined()
      }
    })

    it("returns readable labels", () => {
      expect(EVENT_LABELS["MEAL_RECORDED"]).toBe("Meal recorded")
      expect(EVENT_LABELS["COMMUNICATION_FAILED"]).toBe("Failed")
    })
  })
})
