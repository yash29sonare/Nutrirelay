import { describe, it, expect, vi } from "vitest"
import {
  checkMealOverdue,
  checkMealReviewPending,
  checkFollowUpOverdue,
  checkUnansweredClarification,
  checkDailyCheckIn,
} from "@/lib/reminders/reminderRules"
import { createEvent } from "../builders/index"

describe("reminderRules", () => {
  describe("checkMealOverdue", () => {
    it("returns null for recent meal", () => {
      const recent = new Date(Date.now() - 3600000).toISOString()
      expect(checkMealOverdue(recent)).toBeNull()
    })

    it("triggers for old meal timestamp", () => {
      const old = new Date(Date.now() - 5 * 3600000).toISOString()
      const result = checkMealOverdue(old)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
      expect(result!.reason).toBe("meal_overdue")
    })

    it("triggers for null timestamp", () => {
      const result = checkMealOverdue(null)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
    })
  })

  describe("checkMealReviewPending", () => {
    it("returns null when no meals need review", () => {
      expect(checkMealReviewPending([])).toBeNull()
    })

    it("triggers when meals are pending review beyond the threshold", () => {
      const meals = [
        { id: "m1", review: { status: "recorded" as const }, mealTimestamp: new Date(Date.now() - 13 * 3600000).toISOString() },
      ] as any
      const result = checkMealReviewPending(meals)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
    })
  })

  describe("checkFollowUpOverdue", () => {
    it("returns null with no approved conversations", () => {
      expect(checkFollowUpOverdue([])).toBeNull()
    })
  })

  describe("checkUnansweredClarification", () => {
    it("returns null with no clarification events", () => {
      expect(checkUnansweredClarification([])).toBeNull()
    })

    it("triggers for old clarification", () => {
      const events = [
        createEvent({
          eventType: "CONVERSATION_PLANNED",
          clientId: "c1",
          payload: { reason: "missing_attachment" },
        }),
      ]
      events[0].created_at = new Date(Date.now() - 48 * 3600000).toISOString()
      const result = checkUnansweredClarification(events)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
    })
  })

  describe("checkDailyCheckIn", () => {
    it("returns null when meals logged today", () => {
      expect(checkDailyCheckIn(1)).toBeNull()
      expect(checkDailyCheckIn(3)).toBeNull()
    })

    it("triggers when no meals logged today", () => {
      const result = checkDailyCheckIn(0)
      expect(result).not.toBeNull()
      expect(result!.triggered).toBe(true)
      expect(result!.reason).toBe("daily_check_in")
    })
  })
})
