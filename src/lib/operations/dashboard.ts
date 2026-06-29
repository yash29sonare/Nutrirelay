/**
 * ════════════════════════════════════════════════════════════
 * Dashboard Operations Layer
 * ════════════════════════════════════════════════════════════
 *
 * RPC → mapDashboardData() → DashboardDataDTO → UI
 *
 * One mapping function only — no layered engines, no intermediate DTOs.
 * ════════════════════════════════════════════════════════════
 */

import { createClient } from "@supabase/supabase-js"
import { isClientAtRisk } from "@/lib/domain/dashboardSemantics"
import type {
  ClientSummary,
  ClientActivity,
  DashboardDataDTO,
  DashboardResult,
  DashboardErrorCode,
} from "@/types/dashboard"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

// ── Safety helpers ─────────────────────────────────────────────────

function safeString(v: unknown): string {
  if (v === null || v === undefined) return ""
  return String(v)
}

function safeNumber(v: unknown): number {
  if (v === null || v === undefined) return 0
  return Number(v)
}

function makeError(code: DashboardErrorCode, message: string): DashboardResult {
  return {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
    },
  }
}

// ── Raw RPC response shape (private, not exported) ────────────────

interface RpcResponse {
  trainer?: Record<string, unknown> | null
  metrics?: Record<string, unknown> | null
  trends?: Record<string, unknown> | null
  clients?: Record<string, unknown> | null
}

// ── Single mapping function ────────────────────────────────────────

function mapDashboardData(raw: unknown): DashboardDataDTO {
  const r = raw as RpcResponse

  // ── Trainer ──────────────────────────────────────────────────────
  const t = r.trainer ?? {}
  const trainer = {
    id:                safeString(t.id),
    auth_user_id:      safeString(t.auth_user_id),
    onboarding_status: safeString(t.onboarding_status) || "missing",
    business_name:     (t.business_name as string | null) ?? null,
    timezone:          (t.timezone as string | null) ?? null,
    country:           (t.country as string | null) ?? null,
  }

  // ── Raw counts ───────────────────────────────────────────────────
  const m = r.metrics ?? {}
  const activeClients  = safeNumber(m.activeClients)
  const todayLoggers   = safeNumber(m.todayLoggers)
  const lastWeekLoggers = safeNumber(m.lastWeekLoggers)

  // ── Clients ──────────────────────────────────────────────────────
  const clientsRaw = (
    (r.clients as Record<string, unknown> | null)?.recent ?? []
  ) as Array<Record<string, unknown> | null>
  const clients: ClientSummary[] = clientsRaw.map((c) => {
    const row = c ?? {}
    return {
      client_id:                safeString(row.client_id),
      client_name:              safeString(row.client_name),
      trainer_id:               safeString(row.trainer_id),
      total_meals_logged_today: safeNumber(row.total_meals_logged_today),
      total_calories_today:     safeNumber(row.total_calories_today),
      total_protein_today:      safeNumber(row.total_protein_today),
      total_carbs_today:        safeNumber(row.total_carbs_today),
      total_fat_today:          safeNumber(row.total_fat_today),
      active_strike_count:      safeNumber(row.active_strike_count),
    }
  })

  // ── Trends — compliance over time (raw logger_count → rate) ─────
  const trendsRaw = r.trends ?? {}
  const complianceRaw = (
    (trendsRaw.complianceOverTime as Array<Record<string, unknown> | null>) ?? []
  )
  const complianceOverTime = complianceRaw.map((e) => ({
    date: safeString(e?.date),
    compliance_rate: activeClients > 0
      ? Math.round((safeNumber(e?.logger_count) / activeClients) * 100)
      : 0,
  }))

  // ── Trends — client activity ─────────────────────────────────────
  const activityRaw = (
    (trendsRaw.clientActivity as Array<Record<string, unknown> | null>) ?? []
  )
  const clientActivity: ClientActivity[] = activityRaw.map((a) => ({
    client_id:      safeString(a?.client_id),
    client_name:    safeString(a?.client_name),
    meals_logged:   safeNumber(a?.meals_logged),
    last_logged_at: (a?.last_logged_at as string | null) ?? null,
    total_calories: safeNumber(a?.total_calories),
    total_protein:  safeNumber(a?.total_protein),
  }))

  // ── Metrics (computed inline — no separate engine) ──────────────
  const complianceRate = activeClients > 0
    ? Math.round((todayLoggers / activeClients) * 100)
    : 0

  const atRiskClients = clients.filter(
    (c) => isClientAtRisk(c),
  ).length

  const todayRatio    = activeClients > 0 ? todayLoggers / activeClients : 0
  const lastWeekRatio = activeClients > 0 ? lastWeekLoggers / activeClients : 0

  let weeklyProgress = 0
  if (lastWeekRatio > 0) {
    weeklyProgress = Math.round(
      ((todayRatio - lastWeekRatio) / lastWeekRatio) * 100,
    )
    weeklyProgress = Math.max(-100, Math.min(100, weeklyProgress))
  } else if (todayRatio > 0) {
    weeklyProgress = 100
  }

  // ── Assemble ─────────────────────────────────────────────────────
  return {
    version: 'v1',
    trainer,
    clients,
    metrics: {
      activeClients,
      complianceRate,
      weeklyProgress,
      atRiskClients,
    },
    trends: {
      complianceOverTime,
      clientActivity,
    },
  }
}

// ── Public API ──────────────────────────────────────────────────────

export async function getDashboardData(
  authUserId: string,
): Promise<DashboardResult> {
  const db = getDb()

  const { data, error } = await db.rpc("get_dashboard_data", {
    p_auth_user_id: authUserId,
  })

  if (error) {
    return makeError(
      "TEMPORARY_DB_FAILURE",
      `Dashboard RPC error: ${error.message}`,
    )
  }

  if (!data) {
    return makeError(
      "TRAINER_NOT_FOUND",
      "No trainer row exists for this user. The onboarding trigger may not have fired.",
    )
  }

  const dto = mapDashboardData(data)

  return { success: true, data: dto }
}
