import type { ClientSummary } from "@/types/dashboard"
import type { AttentionClient } from "@/types/analytics"
import { getClientRiskLevel } from "@/lib/domain/dashboardSemantics"

export function getTopAttentionClients(
  clients: ClientSummary[],
  limit = 8,
): AttentionClient[] {
  return [...clients]
    .sort((a, b) => {
      const aRisk = getClientRiskLevel(a)
      const bRisk = getClientRiskLevel(b)
      const riskOrder = { high: 0, medium: 1, low: 2 }
      const riskDiff = riskOrder[aRisk] - riskOrder[bRisk]
      if (riskDiff !== 0) return riskDiff
      return a.total_meals_logged_today - b.total_meals_logged_today
    })
    .slice(0, limit)
    .map((client) => ({
      clientId: client.client_id,
      clientName: client.client_name,
      riskLevel: getClientRiskLevel(client),
      mealsLoggedToday: client.total_meals_logged_today,
      activeStrikes: client.active_strike_count,
    }))
}
