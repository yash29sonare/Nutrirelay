import { describe, it, expect } from "vitest"
import { planClientReminders } from "@/lib/reminders/reminderPlanner"

describe("reminderPlanner", () => {
  describe("planClientReminders", () => {
    it("returns plans and events for overdue meal", () => {
      const oldTimestamp = new Date(Date.now() - 5 * 3600000).toISOString()
      const result = planClientReminders("c1", "t1", {
        meals: [],
        events: [],
        mealsToday: 0,
        lastMealTimestamp: oldTimestamp,
      })
      expect(result.plans.length).toBeGreaterThan(0)
      expect(result.events.length).toBeGreaterThan(0)
    })

    it("returns empty for recent activity", () => {
      const recent = new Date(Date.now() - 3600000).toISOString()
      const result = planClientReminders("c1", "t1", {
        meals: [],
        events: [],
        mealsToday: 2,
        lastMealTimestamp: recent,
      })
      expect(result.plans).toHaveLength(0)
    })
  })
})
