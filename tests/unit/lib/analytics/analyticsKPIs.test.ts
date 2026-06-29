import { describe, it, expect, beforeAll, afterAll } from "vitest"
import {
  computeBusinessKPIs,
  computeClientHealth,
  computeMealAnalytics,
  computeCommunicationAnalytics,
  computePerformanceTrends,
} from "@/lib/analytics/analyticsKPIs"
import type { ClientSummary, DashboardDataDTO } from "@/types/dashboard"
import type { EngagementEvent } from "@/types/engagement-events"

const baseClients: ClientSummary[] = [
  { client_id: "c1", client_name: "Alice", trainer_id: "t1", total_meals_logged_today: 3, active_strike_count: 0, total_calories_today: 1800, total_protein_today: 120, total_carbs_today: 200, total_fat_today: 60 },
  { client_id: "c2", client_name: "Bob", trainer_id: "t1", total_meals_logged_today: 0, active_strike_count: 2, total_calories_today: 0, total_protein_today: 0, total_carbs_today: 0, total_fat_today: 0 },
  { client_id: "c3", client_name: "Charlie", trainer_id: "t1", total_meals_logged_today: 1, active_strike_count: 1, total_calories_today: 600, total_protein_today: 40, total_carbs_today: 80, total_fat_today: 20 },
]

const baseTrends: DashboardDataDTO["trends"] = {
  complianceOverTime: [
    { date: "2026-06-27", compliance_rate: 80 },
    { date: "2026-06-28", compliance_rate: 75 },
  ],
  clientActivity: [
    { client_id: "c1", client_name: "Alice", meals_logged: 14, last_logged_at: "2026-06-29T10:00:00Z", total_calories: 9000, total_protein: 600 },
    { client_id: "c2", client_name: "Bob", meals_logged: 3, last_logged_at: "2026-06-28T12:00:00Z", total_calories: 2000, total_protein: 120 },
  ],
}

const baseMetrics: DashboardDataDTO["metrics"] = {
  activeClients: 3,
  complianceRate: 66,
  weeklyProgress: 5,
  atRiskClients: 1,
}

function makeEvent(overrides: Partial<EngagementEvent>): EngagementEvent {
  return {
    event_id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    event_type: "MEAL_RECORDED",
    created_at: "2026-06-29T10:00:00Z",
    client_id: "c1",
    payload: null,
    ...overrides,
  }
}

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-06-29T12:00:00Z"))
})

afterAll(() => {
  vi.useRealTimers()
})

describe("computeBusinessKPIs", () => {
  it("sums meals across clients", () => {
    const result = computeBusinessKPIs(baseClients, [])
    expect(result.mealsToday).toBe(4)
  })

  it("counts today events correctly", () => {
    const events = [
      makeEvent({ event_type: "MEAL_RECORDED", created_at: "2026-06-29T08:00:00Z" }),
      makeEvent({ event_type: "MEAL_RECORDED", created_at: "2026-06-29T09:00:00Z", client_id: "c2" }),
      makeEvent({ event_type: "MEAL_RECORDED", created_at: "2026-06-28T23:00:00Z" }),
    ]
    const result = computeBusinessKPIs(baseClients, events)
    expect(result.pendingReviews).toBe(2)
  })

  it("computes comm success rate", () => {
    const events = [
      makeEvent({ event_type: "COMMUNICATION_SENT", created_at: "2026-06-29T08:00:00Z" }),
      makeEvent({ event_type: "COMMUNICATION_SENT", created_at: "2026-06-28T08:00:00Z" }),
      makeEvent({ event_type: "COMMUNICATION_FAILED", created_at: "2026-06-29T08:00:00Z" }),
    ]
    const result = computeBusinessKPIs(baseClients, events)
    expect(result.commSuccessRate).toBe(67)
  })
})

describe("computeClientHealth", () => {
  it("distributes risk correctly", () => {
    const result = computeClientHealth(baseClients, baseMetrics)
    expect(result.riskDistribution).toEqual({ high: 1, medium: 1, low: 1 })
    expect(result.compliantClients).toBe(2)
    expect(result.nonCompliantClients).toBe(1)
    expect(result.atRiskCount).toBe(1)
  })
})

describe("computeMealAnalytics", () => {
  it("computes meal aggregates", () => {
    const result = computeMealAnalytics(baseClients, baseTrends, [])
    expect(result.mealsToday).toBe(4)
    expect(result.meals7Days).toBe(17)
    expect(result.avgMealsPerClient).toBe("1.3")
    expect(result.totalCaloriesWeek).toBe(11000)
    expect(result.totalProteinWeek).toBe(720)
  })

  it("handles zero clients", () => {
    const result = computeMealAnalytics([], baseTrends, [])
    expect(result.avgMealsPerClient).toBe("0")
  })
})

describe("computeCommunicationAnalytics", () => {
  it("counts event types", () => {
    const events = [
      makeEvent({ event_type: "CONVERSATION_PLANNED", client_id: "c1" }),
      makeEvent({ event_type: "AUTOMATION_STARTED", client_id: "c1" }),
      makeEvent({ event_type: "AUTOMATION_COMPLETED", client_id: "c1" }),
      makeEvent({ event_type: "AUTOMATION_FAILED", client_id: "c1" }),
    ]
    const result = computeCommunicationAnalytics(events)
    expect(result.conversationPlansTotal).toBe(1)
    expect(result.automationStarts).toBe(1)
    expect(result.automationCompletions).toBe(1)
    expect(result.automationFailures).toBe(1)
  })

  it("computes comm success rate", () => {
    const events = [
      makeEvent({ event_type: "COMMUNICATION_SENT" }),
      makeEvent({ event_type: "COMMUNICATION_FAILED" }),
    ]
    const result = computeCommunicationAnalytics(events)
    expect(result.commSuccessRate).toBe(50)
  })

  it("defaults to 100 when no comm events", () => {
    const result = computeCommunicationAnalytics([])
    expect(result.commSuccessRate).toBe(100)
  })
})

describe("computePerformanceTrends", () => {
  it("maps compliance entries", () => {
    const result = computePerformanceTrends(baseTrends)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ date: "2026-06-27", complianceRate: 80 })
  })
})
