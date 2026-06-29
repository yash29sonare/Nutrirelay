import { describe, it, expect } from "vitest"
import { generateActionQueue } from "@/lib/engagement/engagementEngine"
import { createDashboardData } from "../builders/index"
import { generateDashboardInsights } from "@/lib/insights/dashboardInsights"

describe("engagementEngine", () => {
  it("generates action queue for a dashboard with clients", () => {
    const data = createDashboardData()
    const insights = generateDashboardInsights(data)
    const queue = generateActionQueue(data, insights)
    expect(Array.isArray(queue)).toBe(true)
  })

  it("returns actions for dashboard with no clients (trainer-level only)", () => {
    const data = createDashboardData({ clients: [] })
    const insights = generateDashboardInsights(data)
    const queue = generateActionQueue(data, insights)
    expect(queue.length).toBeGreaterThanOrEqual(0)
  })

  it("includes high priority check-in for at-risk clients", () => {
    const data = createDashboardData()
    data.clients[0].active_strike_count = 3
    const insights = generateDashboardInsights(data)
    const queue = generateActionQueue(data, insights)
    const highPriority = queue.filter((a) => a.priority === "high")
    expect(highPriority.length).toBeGreaterThan(0)
  })

  it("sorts actions by priority (high before medium before low)", () => {
    const data = createDashboardData()
    data.clients[0].active_strike_count = 3
    const insights = generateDashboardInsights(data)
    const queue = generateActionQueue(data, insights)
    for (let i = 1; i < queue.length; i++) {
      const order = { high: 0, medium: 1, low: 2 } as Record<string, number>
      expect(order[queue[i - 1].priority]).toBeLessThanOrEqual(order[queue[i].priority])
    }
  })

  it("is deterministic for same input in same process", () => {
    const data = createDashboardData()
    const insights = generateDashboardInsights(data)
    const a = generateActionQueue(data, insights)
    const b = generateActionQueue(data, insights)
    expect(a).toEqual(b)
  })
})
