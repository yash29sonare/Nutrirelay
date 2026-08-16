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
import type { Database } from "@/shared/types/supabase"
import type {
  ClientSummary,
  ClientActivity,
  DashboardDataDTO,
  DashboardResult,
  DashboardErrorCode,
} from "@/types/dashboard"

function getDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

function getDynamicDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

type TrainerRow = Pick<
  Database["public"]["Tables"]["trainers"]["Row"],
  "trainer_id" | "auth_user_id" | "onboarding_status" | "business_name" | "timezone" | "country"
>

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name"
>

type FoodLogRow = Pick<
  Database["public"]["Tables"]["food_logs"]["Row"],
  "client_id" | "logged_at" | "calories" | "protein_g" | "carbs_g" | "fat_g"
>

type StrikeRow = Pick<
  Database["public"]["Tables"]["strike_log"]["Row"],
  "profile_id"
>

interface WhatsAppClientDashboardRow {
  client_id: string
  client_name: string | null
  status: string | null
}

interface WhatsAppFoodLogDashboardRow {
  whatsapp_client_id: string | null
  logged_at: string
  calories: unknown
  protein_g: unknown
  carbs_g: unknown
  fat_g: unknown
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

function safeNullableString(v: unknown): string | null {
  if (typeof v !== "string") return null
  const trimmed = v.trim()
  return trimmed ? trimmed : null
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

function startOfUtcDay(daysOffset = 0): Date {
  const now = new Date()
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysOffset,
    0,
    0,
    0,
    0,
  ))
}

function toUtcDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

async function readTrainerDisplayName(
  db: ReturnType<typeof getDynamicDb>,
  authUserId: string,
): Promise<string | null> {
  const trainerNameRes = await db
    .from("trainers")
    .select("name")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  const trainerName = safeNullableString((trainerNameRes.data as { name?: unknown } | null)?.name)
  if (trainerName) return trainerName

  const profileFullNameRes = await db
    .from("profiles")
    .select("full_name")
    .eq("id", authUserId)
    .maybeSingle()

  const fullName = safeNullableString((profileFullNameRes.data as { full_name?: unknown } | null)?.full_name)
  if (fullName) return fullName

  const profileDisplayNameRes = await db
    .from("profiles")
    .select("display_name")
    .eq("id", authUserId)
    .maybeSingle()

  return safeNullableString((profileDisplayNameRes.data as { display_name?: unknown } | null)?.display_name)
}

async function augmentDashboardWithWhatsAppClients(
  authUserId: string,
  dto: DashboardDataDTO,
): Promise<DashboardDataDTO> {
  const db = getDynamicDb()
  const displayName = dto.trainer.display_name ?? await readTrainerDisplayName(db, authUserId)
  const { data: whatsappClients, error: whatsappClientsError } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id, client_name, status")
    .eq("trainer_id", authUserId)
    .eq("status", "active")

  if (whatsappClientsError) {
    return {
      ...dto,
      trainer: {
        ...dto.trainer,
        display_name: displayName,
      },
    }
  }

  const whatsappRows = (whatsappClients ?? []) as WhatsAppClientDashboardRow[]
  if (whatsappRows.length === 0) {
    return {
      ...dto,
      trainer: {
        ...dto.trainer,
        display_name: displayName,
      },
    }
  }

  const todayKey = startOfUtcDay().toISOString().slice(0, 10)
  const activityWindowStart = startOfUtcDay(-7).toISOString()
  const whatsappClientIds = whatsappRows.map((row) => row.client_id)
  const { data: whatsappLogs, error: whatsappLogsError } = await db
    .from("food_logs")
    .select("whatsapp_client_id, logged_at, calories, protein_g, carbs_g, fat_g")
    .eq("trainer_id", authUserId)
    .in("whatsapp_client_id", whatsappClientIds)
    .gte("logged_at", activityWindowStart)

  const logs = whatsappLogsError
    ? []
    : (whatsappLogs ?? []) as WhatsAppFoodLogDashboardRow[]
  const summaries = new Map<string, ClientSummary>()
  const activities = new Map<string, ClientActivity>()

  for (const row of whatsappRows) {
    const clientName = safeNullableString(row.client_name) ?? "Client"
    summaries.set(row.client_id, {
      client_id: row.client_id,
      client_name: clientName,
      trainer_id: authUserId,
      total_meals_logged_today: 0,
      total_calories_today: 0,
      total_protein_today: 0,
      total_carbs_today: 0,
      total_fat_today: 0,
      active_strike_count: 0,
    })
    activities.set(row.client_id, {
      client_id: row.client_id,
      client_name: clientName,
      meals_logged: 0,
      last_logged_at: null,
      total_calories: 0,
      total_protein: 0,
    })
  }

  for (const row of logs) {
    if (!row.whatsapp_client_id) continue
    const summary = summaries.get(row.whatsapp_client_id)
    const activity = activities.get(row.whatsapp_client_id)
    if (!summary || !activity) continue

    if (toUtcDateKey(row.logged_at) === todayKey) {
      summary.total_meals_logged_today += 1
      summary.total_calories_today += safeNumber(row.calories)
      summary.total_protein_today += safeNumber(row.protein_g)
      summary.total_carbs_today += safeNumber(row.carbs_g)
      summary.total_fat_today += safeNumber(row.fat_g)
    }

    activity.meals_logged += 1
    activity.total_calories += safeNumber(row.calories)
    activity.total_protein += safeNumber(row.protein_g)
    if (!activity.last_logged_at || row.logged_at > activity.last_logged_at) {
      activity.last_logged_at = row.logged_at
    }
  }

  const clientsById = new Map(dto.clients.map((client) => [client.client_id, client]))
  for (const summary of summaries.values()) {
    clientsById.set(summary.client_id, summary)
  }
  const clients = [...clientsById.values()].sort((left, right) =>
    left.client_name.localeCompare(right.client_name),
  )

  const activityById = new Map(dto.trends.clientActivity.map((activity) => [activity.client_id, activity]))
  for (const activity of activities.values()) {
    activityById.set(activity.client_id, activity)
  }
  const clientActivity = [...activityById.values()]
    .sort((left, right) => {
      if (left.last_logged_at === right.last_logged_at) {
        return left.client_name.localeCompare(right.client_name)
      }
      if (!left.last_logged_at) return 1
      if (!right.last_logged_at) return -1
      return right.last_logged_at.localeCompare(left.last_logged_at)
    })
    .slice(0, 50)

  const activeClients = clients.length
  const todayLoggers = clients.filter((client) => client.total_meals_logged_today > 0).length
  const complianceRate = activeClients > 0
    ? Math.round((todayLoggers / activeClients) * 100)
    : 0

  return {
    ...dto,
    trainer: {
      ...dto.trainer,
      display_name: displayName,
    },
    clients,
    metrics: {
      ...dto.metrics,
      activeClients,
      complianceRate,
      atRiskClients: clients.filter((client) => isClientAtRisk(client)).length,
    },
    trends: {
      ...dto.trends,
      clientActivity,
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
    display_name:      safeNullableString(t.name) ?? safeNullableString(t.full_name) ?? safeNullableString(t.display_name),
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

async function readDashboardDataDirect(authUserId: string): Promise<DashboardResult> {
  const db = getDb()

  const trainerQuery = await db
    .from("trainers")
    .select("trainer_id, auth_user_id, onboarding_status, business_name, timezone, country")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  const trainer = trainerQuery.data as TrainerRow | null
  const trainerError = trainerQuery.error

  if (trainerError) {
    return makeError(
      "PERMANENT_DB_ERROR",
      `Dashboard fallback trainer query error: ${trainerError.message}`,
    )
  }

  if (!trainer) {
    return makeError(
      "TRAINER_NOT_FOUND",
      "No trainer row exists for this user. The onboarding trigger may not have fired.",
    )
  }

  const { data: trainerClients, error: trainerClientsError } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", authUserId)
    .eq("is_active", true)

  if (trainerClientsError) {
    return makeError(
      "PERMANENT_DB_ERROR",
      `Dashboard fallback trainer_clients query error: ${trainerClientsError.message}`,
    )
  }

  const clientIds = (trainerClients ?? []).map((row) => row.client_id)
  const activeClients = clientIds.length
  const todayKey = startOfUtcDay().toISOString().slice(0, 10)
  const lastWeekKey = startOfUtcDay(-7).toISOString().slice(0, 10)
  const complianceWindowStart = startOfUtcDay(-6).toISOString()
  const activityWindowStart = startOfUtcDay(-7).toISOString()

  if (clientIds.length === 0) {
    return {
      success: true,
      data: {
        version: "v1",
        trainer: {
          id: trainer.trainer_id,
          auth_user_id: trainer.auth_user_id,
          onboarding_status: trainer.onboarding_status,
          business_name: trainer.business_name,
          display_name: null,
          timezone: trainer.timezone,
          country: trainer.country,
        },
        clients: [],
        metrics: {
          activeClients: 0,
          complianceRate: 0,
          weeklyProgress: 0,
          atRiskClients: 0,
        },
        trends: {
          complianceOverTime: Array.from({ length: 7 }, (_, index) => ({
            date: startOfUtcDay(index - 6).toISOString().slice(0, 10),
            compliance_rate: 0,
          })),
          clientActivity: [],
        },
      },
    }
  }

  const [profilesRes, logsRes, strikesRes] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name")
      .in("id", clientIds),
    db
      .from("food_logs")
      .select("client_id, logged_at, calories, protein_g, carbs_g, fat_g")
      .eq("trainer_id", authUserId)
      .in("client_id", clientIds)
      .gte("logged_at", activityWindowStart),
    db
      .from("strike_log")
      .select("profile_id")
      .in("profile_id", clientIds),
  ])

  if (profilesRes.error) {
    return makeError(
      "PERMANENT_DB_ERROR",
      `Dashboard fallback profiles query error: ${profilesRes.error.message}`,
    )
  }

  if (logsRes.error) {
    return makeError(
      "PERMANENT_DB_ERROR",
      `Dashboard fallback food_logs query error: ${logsRes.error.message}`,
    )
  }

  if (strikesRes.error) {
    return makeError(
      "PERMANENT_DB_ERROR",
      `Dashboard fallback strike_log query error: ${strikesRes.error.message}`,
    )
  }

  const profiles = (profilesRes.data ?? []) as ProfileRow[]
  const logs = (logsRes.data ?? []) as FoodLogRow[]
  const strikes = (strikesRes.data ?? []) as StrikeRow[]

  const profileMap = new Map(profiles.map((row) => [row.id, row.full_name ?? ""]))
  const strikeCountMap = new Map<string, number>()
  for (const row of strikes) {
    strikeCountMap.set(row.profile_id, (strikeCountMap.get(row.profile_id) ?? 0) + 1)
  }

  const complianceSets = new Map<string, Set<string>>()
  for (let index = 0; index < 7; index += 1) {
    const dateKey = startOfUtcDay(index - 6).toISOString().slice(0, 10)
    complianceSets.set(dateKey, new Set<string>())
  }

  const todayLoggers = new Set<string>()
  const lastWeekLoggers = new Set<string>()
  const clientSummaryMap = new Map<string, ClientSummary>()
  const activityMap = new Map<string, ClientActivity>()

  for (const clientId of clientIds) {
    clientSummaryMap.set(clientId, {
      client_id: clientId,
      client_name: profileMap.get(clientId) ?? "",
      trainer_id: authUserId,
      total_meals_logged_today: 0,
      total_calories_today: 0,
      total_protein_today: 0,
      total_carbs_today: 0,
      total_fat_today: 0,
      active_strike_count: strikeCountMap.get(clientId) ?? 0,
    })

    activityMap.set(clientId, {
      client_id: clientId,
      client_name: profileMap.get(clientId) ?? "",
      meals_logged: 0,
      last_logged_at: null,
      total_calories: 0,
      total_protein: 0,
    })
  }

  for (const row of logs) {
    const dateKey = toUtcDateKey(row.logged_at)

    if (dateKey >= complianceWindowStart.slice(0, 10)) {
      complianceSets.get(dateKey)?.add(row.client_id)
    }

    if (dateKey === todayKey) {
      todayLoggers.add(row.client_id)
      const summary = clientSummaryMap.get(row.client_id)
      if (summary) {
        summary.total_meals_logged_today += 1
        summary.total_calories_today += safeNumber(row.calories)
        summary.total_protein_today += safeNumber(row.protein_g)
        summary.total_carbs_today += safeNumber(row.carbs_g)
        summary.total_fat_today += safeNumber(row.fat_g)
      }
    }

    if (dateKey === lastWeekKey) {
      lastWeekLoggers.add(row.client_id)
    }

    const activity = activityMap.get(row.client_id)
    if (activity) {
      activity.meals_logged += 1
      activity.total_calories += safeNumber(row.calories)
      activity.total_protein += safeNumber(row.protein_g)
      if (!activity.last_logged_at || row.logged_at > activity.last_logged_at) {
        activity.last_logged_at = row.logged_at
      }
    }
  }

  const clients = [...clientSummaryMap.values()].sort((left, right) =>
    left.client_name.localeCompare(right.client_name),
  )

  const complianceOverTime = Array.from({ length: 7 }, (_, index) => {
    const date = startOfUtcDay(index - 6).toISOString().slice(0, 10)
    const loggerCount = complianceSets.get(date)?.size ?? 0

    return {
      date,
      compliance_rate: activeClients > 0 ? Math.round((loggerCount / activeClients) * 100) : 0,
    }
  })

  const clientActivity = [...activityMap.values()]
    .sort((left, right) => {
      if (left.last_logged_at === right.last_logged_at) {
        return left.client_name.localeCompare(right.client_name)
      }
      if (!left.last_logged_at) return 1
      if (!right.last_logged_at) return -1
      return right.last_logged_at.localeCompare(left.last_logged_at)
    })
    .slice(0, 50)

  const complianceRate = activeClients > 0
    ? Math.round((todayLoggers.size / activeClients) * 100)
    : 0

  const atRiskClients = clients.filter((client) => isClientAtRisk(client)).length
  const todayRatio = activeClients > 0 ? todayLoggers.size / activeClients : 0
  const lastWeekRatio = activeClients > 0 ? lastWeekLoggers.size / activeClients : 0

  let weeklyProgress = 0
  if (lastWeekRatio > 0) {
    weeklyProgress = Math.round(((todayRatio - lastWeekRatio) / lastWeekRatio) * 100)
    weeklyProgress = Math.max(-100, Math.min(100, weeklyProgress))
  } else if (todayRatio > 0) {
    weeklyProgress = 100
  }

  return {
    success: true,
    data: {
      version: "v1",
      trainer: {
        id: trainer.trainer_id,
        auth_user_id: trainer.auth_user_id,
        onboarding_status: trainer.onboarding_status,
        business_name: trainer.business_name,
        display_name: null,
        timezone: trainer.timezone,
        country: trainer.country,
      },
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
    const fallback = await readDashboardDataDirect(authUserId)
    if (fallback.success || fallback.error.code === "TRAINER_NOT_FOUND") {
      if (!fallback.success) return fallback
      return {
        success: true,
        data: await augmentDashboardWithWhatsAppClients(authUserId, fallback.data),
      }
    }

    return makeError(
      "PERMANENT_DB_ERROR",
      `Dashboard RPC error: ${error.message}. ${fallback.error.message}`,
    )
  }

  if (!data) {
    const fallback = await readDashboardDataDirect(authUserId)
    if (!fallback.success) return fallback
    return {
      success: true,
      data: await augmentDashboardWithWhatsAppClients(authUserId, fallback.data),
    }
  }

  const dto = mapDashboardData(data)

  return {
    success: true,
    data: await augmentDashboardWithWhatsAppClients(authUserId, dto),
  }
}
