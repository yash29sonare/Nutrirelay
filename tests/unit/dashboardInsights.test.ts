import { describe, it, expect } from "vitest"
import { generateDashboardInsights } from "@/lib/insights/dashboardInsights"
import { createDashboardData } from "../builders/index"

describe("dashboardInsights", () => {
  it("generates insights for a dashboard with clients", () => {
    const data = createDashboardData()
    const insights = generateDashboardInsights(data)
    expect(insights).toHaveProperty("risk")
    expect(insights).toHaveProperty("actions")
    expect(insights).toHaveProperty("performance")
    expect(insights).toHaveProperty("segmentation")
  })

  it("handles dashboard with zero clients", () => {
    const data = createDashboardData({ clients: [] })
    const insights = generateDashboardInsights(data)
    expect(insights.segmentation.atRisk).toHaveLength(0)
    expect(insights.segmentation.highPerforming).toHaveLength(0)
    expect(insights.segmentation.average).toHaveLength(0)
    expect(insights.risk.riskLevel).toBe("low")
  })

  it("identifies at-risk clients", () => {
    const data = createDashboardData()
    data.clients[0].active_strike_count = 3
    const insights = generateDashboardInsights(data)
    expect(insights.risk.riskLevel).toBe("high")
    expect(insights.segmentation.atRisk).toHaveLength(1)
  })

  it("generates trainer actions when clients are at risk", () => {
    const data = createDashboardData()
    data.metrics.atRiskClients = 1
    const insights = generateDashboardInsights(data)
    const highActions = insights.actions.actions.filter((a) => a.priority === "high")
    expect(highActions.length).toBeGreaterThan(0)
  })

  it("is deterministic for same input", () => {
    const data = createDashboardData()
    const a = generateDashboardInsights(data)
    const b = generateDashboardInsights(data)
    expect(a).toEqual(b)
  })
})
