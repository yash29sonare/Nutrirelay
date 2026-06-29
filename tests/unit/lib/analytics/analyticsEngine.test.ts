import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildAnalyticsDTO } from "@/lib/analytics/analyticsEngine"
import type { DashboardDataDTO } from "@/types/dashboard"
import type { EngagementEvent } from "@/types/engagement-events"

const mockDTO: DashboardDataDTO = {
  version: "v1",
  trainer: {
    id: "t1", auth_user_id: "au1", onboarding_status: "complete",
    business_name: "Test Gym", timezone: "Asia/Kolkata", country: "IN",
  },
  clients: [
    { client_id: "c1", client_name: "Alice", trainer_id: "t1", total_meals_logged_today: 3, active_strike_count: 0, total_calories_today: 1800, total_protein_today: 120, total_carbs_today: 200, total_fat_today: 60 },
    { client_id: "c2", client_name: "Bob", trainer_id: "t1", total_meals_logged_today: 0, active_strike_count: 2, total_calories_today: 0, total_protein_today: 0, total_carbs_today: 0, total_fat_today: 0 },
  ],
  metrics: { activeClients: 2, complianceRate: 50, weeklyProgress: -3, atRiskClients: 1 },
  trends: {
    complianceOverTime: [{ date: "2026-06-28", compliance_rate: 50 }],
    clientActivity: [
      { client_id: "c1", client_name: "Alice", meals_logged: 10, last_logged_at: "2026-06-29T10:00:00Z", total_calories: 6000, total_protein: 400 },
      { client_id: "c2", client_name: "Bob", meals_logged: 2, last_logged_at: "2026-06-27T10:00:00Z", total_calories: 1200, total_protein: 80 },
    ],
  },
}

const mockEvents: EngagementEvent[] = [
  { event_id: "e1", event_type: "MEAL_RECORDED", created_at: "2026-06-29T10:00:00Z", client_id: "c1", payload: null },
  { event_id: "e2", event_type: "MEAL_REVIEWED", created_at: "2026-06-29T11:00:00Z", client_id: "c1", payload: null },
  { event_id: "e3", event_type: "COMMUNICATION_SENT", created_at: "2026-06-29T09:00:00Z", client_id: "c1", payload: null },
]

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-06-29T12:00:00Z"))
})

afterAll(() => {
  vi.useRealTimers()
})

describe("buildAnalyticsDTO", () => {
  it("returns a complete TrainerAnalyticsDTO", () => {
    const result = buildAnalyticsDTO(mockDTO, mockEvents)
    expect(result.version).toBe("v1")
    expect(result.businessKPIs).toBeDefined()
    expect(result.clientHealth).toBeDefined()
    expect(result.mealAnalytics).toBeDefined()
    expect(result.communicationAnalytics).toBeDefined()
    expect(result.performanceTrends).toBeDefined()
    expect(result.timelineActivity).toBeDefined()
    expect(result.topAttentionClients).toBeDefined()
  })

  it("computes business KPIs correctly", () => {
    const result = buildAnalyticsDTO(mockDTO, mockEvents)
    expect(result.businessKPIs.mealsToday).toBe(3)
    expect(result.businessKPIs.mealsReviewedToday).toBe(1)
    expect(result.businessKPIs.pendingReviews).toBe(0)
  })

  it("computes client health correctly", () => {
    const result = buildAnalyticsDTO(mockDTO, mockEvents)
    expect(result.clientHealth.riskDistribution.high).toBe(1)
    expect(result.clientHealth.riskDistribution.low).toBe(1)
    expect(result.clientHealth.compliantClients).toBe(1)
    expect(result.clientHealth.nonCompliantClients).toBe(1)
  })

  it("computes meal analytics correctly", () => {
    const result = buildAnalyticsDTO(mockDTO, mockEvents)
    expect(result.mealAnalytics.mealsToday).toBe(3)
    expect(result.mealAnalytics.meals7Days).toBe(12)
    expect(result.mealAnalytics.totalCaloriesWeek).toBe(7200)
    expect(result.mealAnalytics.totalProteinWeek).toBe(480)
  })

  it("ranks top attention clients", () => {
    const result = buildAnalyticsDTO(mockDTO, mockEvents)
    expect(result.topAttentionClients).toHaveLength(2)
    expect(result.topAttentionClients[0].riskLevel).toBe("high")
    expect(result.topAttentionClients[1].riskLevel).toBe("low")
  })

  it("maps timeline activity", () => {
    const result = buildAnalyticsDTO(mockDTO, mockEvents)
    const totalEvents = result.timelineActivity.reduce((s, g) => s + g.events.length, 0)
    expect(totalEvents).toBeGreaterThan(0)
  })
})
