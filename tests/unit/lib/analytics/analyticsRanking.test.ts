import { describe, it, expect } from "vitest"
import { getTopAttentionClients } from "@/lib/analytics/analyticsRanking"
import type { ClientSummary } from "@/types/dashboard"

const clients: ClientSummary[] = [
  { client_id: "c1", client_name: "HighRisk", trainer_id: "t1", total_meals_logged_today: 0, active_strike_count: 3, total_calories_today: 0, total_protein_today: 0, total_carbs_today: 0, total_fat_today: 0 },
  { client_id: "c2", client_name: "MediumRisk", trainer_id: "t1", total_meals_logged_today: 2, active_strike_count: 1, total_calories_today: 1200, total_protein_today: 80, total_carbs_today: 150, total_fat_today: 40 },
  { client_id: "c3", client_name: "LowRisk", trainer_id: "t1", total_meals_logged_today: 3, active_strike_count: 0, total_calories_today: 1800, total_protein_today: 120, total_carbs_today: 200, total_fat_today: 60 },
  { client_id: "c4", client_name: "LowRisk2", trainer_id: "t1", total_meals_logged_today: 1, active_strike_count: 0, total_calories_today: 600, total_protein_today: 40, total_carbs_today: 80, total_fat_today: 20 },
]

describe("getTopAttentionClients", () => {
  it("ranks high risk first, then by meals ascending", () => {
    const result = getTopAttentionClients(clients)
    expect(result).toHaveLength(4)
    expect(result[0].riskLevel).toBe("high")
    expect(result[1].riskLevel).toBe("medium")
    expect(result[2].riskLevel).toBe("low")
    expect(result[3].riskLevel).toBe("low")
  })

  it("sorts low risk by meals ascending", () => {
    const result = getTopAttentionClients(clients)
    const lowRisk = result.filter((c) => c.riskLevel === "low")
    expect(lowRisk[0].mealsLoggedToday).toBe(1)
    expect(lowRisk[1].mealsLoggedToday).toBe(3)
  })

  it("respects limit parameter", () => {
    const result = getTopAttentionClients(clients, 2)
    expect(result).toHaveLength(2)
  })

  it("maps clientId and clientName", () => {
    const [first] = getTopAttentionClients(clients)
    expect(first.clientId).toBe("c1")
    expect(first.clientName).toBe("HighRisk")
    expect(first.activeStrikes).toBe(3)
  })
})
