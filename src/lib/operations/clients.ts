/**
 * ════════════════════════════════════════════════════════════
 * Client Domain Operations Layer
 * ════════════════════════════════════════════════════════════
 *
 * Pure transformation functions only.
 * Accepts DashboardDataDTO — no data fetching, no Supabase.
 *
 * Data flow: RPC → DTO → clients.ts → UI
 * ════════════════════════════════════════════════════════════
 */

import type { DashboardDataDTO, ClientSummary } from "@/types/dashboard"
import {
  isClientAtRisk,
  getClientRiskLevel,
} from "@/lib/domain/dashboardSemantics"

// ── Filter contract ────────────────────────────────────

export interface ClientFilters {
  search?: string
  status?: "all" | "risk" | "compliant" | "inactive"
}

// ── 1. Filtered client list ────────────────────────────

export function getClientList(
  dto: DashboardDataDTO,
  filters?: ClientFilters,
): ClientSummary[] {
  const clients = dto.clients ?? []

  if (!filters || (!filters.search && (!filters.status || filters.status === "all"))) {
    return clients
  }

  const search = filters.search?.toLowerCase() ?? ""
  const status = filters.status ?? "all"

  return clients.filter((c) => {
    if (search && !c.client_name.toLowerCase().includes(search)) return false
    if (status === "risk" && !isClientAtRisk(c)) return false
    if (status === "compliant" && c.total_meals_logged_today === 0) return false
    if (status === "inactive" && c.total_meals_logged_today > 0) return false
    return true
  })
}

// ── 2. Single client lookup ────────────────────────────

export function getClientById(
  clientId: string,
  dto: DashboardDataDTO,
): ClientSummary | null {
  return (dto.clients ?? []).find((c) => c.client_id === clientId) ?? null
}

// ── 3. Client risk summary ─────────────────────────────

export interface ClientRiskSummary {
  isAtRisk: boolean
  riskLevel: ReturnType<typeof getClientRiskLevel>
  strikeCount: number
}

export function getClientRiskSummary(client: ClientSummary): ClientRiskSummary {
  return {
    isAtRisk: isClientAtRisk(client),
    riskLevel: getClientRiskLevel(client),
    strikeCount: client.active_strike_count,
  }
}
