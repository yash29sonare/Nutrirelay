/**
 * Strict TypeScript data contracts for the trainer dashboard.
 * Maps 1-to-1 against the `dashboard_client_summaries` Postgres view.
 */

export interface ClientSummary {
  client_id:                string;
  client_name:              string;
  trainer_id:               string;
  total_meals_logged_today: number;
  total_calories_today:     number;
  total_protein_today:      number;
  total_carbs_today:        number;
  total_fat_today:          number;
  active_strike_count:      number;
}

export interface DashboardMetrics {
  totalClients:          number;
  atRiskClients:         number;
  globalComplianceRate:  number;
}

/**
 * Derives DashboardMetrics from a set of ClientSummary rows.
 * atRiskClients  = clients with ≥ 1 active strike.
 * globalComplianceRate = % of clients who logged ≥ 1 meal today.
 */
export function deriveDashboardMetrics(clients: ClientSummary[]): DashboardMetrics {
  const total               = clients.length;
  const atRisk              = clients.filter((c) => c.active_strike_count > 0).length;
  const loggedToday         = clients.filter((c) => c.total_meals_logged_today > 0).length;
  const globalComplianceRate = total > 0 ? Math.round((loggedToday / total) * 100) : 0;

  return {
    totalClients:         total,
    atRiskClients:        atRisk,
    globalComplianceRate,
  };
}
