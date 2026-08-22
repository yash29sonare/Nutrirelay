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
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db"
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
  "id" | "full_name" | "phone_number"
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
  whatsapp_number: string | null
  normalized_whatsapp_number: string | null
  status: string | null
  onboarding_message_status: string | null
}

interface WhatsAppFoodLogDashboardRow {
  whatsapp_client_id: string | null
  logged_at: string
  calories: unknown
  protein_g: unknown
  carbs_g: unknown
  fat_g: unknown
  review_state: string | null
  verification_status: string | null
  wam_id: string | null
}

interface WhatsAppCommunicationDashboardRow {
  whatsapp_client_id: string | null
  direction: string | null
  message_type: string | null
  message_timestamp: string
  wam_id: string | null
  metadata: Record<string, unknown> | null
  delivery_status: string | null
}

interface WhatsAppVoiceDashboardRow {
  whatsapp_client_id: string | null
  created_at: string
  processing_status: string | null
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

function getTrainerTimezone(trainer: { timezone: string | null; country: string | null }): string {
  if (trainer.timezone?.trim()) return trainer.timezone.trim()
  return trainer.country === "IN" ? "Asia/Kolkata" : "Asia/Kolkata"
}

function dateKeyInTimezone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso))

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  return year && month && day ? `${year}-${month}-${day}` : toUtcDateKey(iso)
}

function todayKeyInTimezone(timeZone: string): string {
  return dateKeyInTimezone(new Date().toISOString(), timeZone)
}

function isPendingReviewStatus(value: string | null): boolean {
  if (!value) return false
  return ["needs_review", "review_needed", "pending", "failed", "error", "unverified"].includes(value.toLowerCase())
}

function metadataBoolean(metadata: Record<string, unknown> | null, keys: string[]): boolean {
  for (const key of keys) {
    if (metadata?.[key] === true) return true
  }
  return false
}

function metadataText(metadata: Record<string, unknown> | null, keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function metadataNeedsReview(metadata: Record<string, unknown> | null): boolean {
  if (!metadata) return false
  const structured = metadata.structured_response && typeof metadata.structured_response === "object"
    ? metadata.structured_response as Record<string, unknown>
    : null

  return metadataBoolean(metadata, ["needs_review", "requires_review", "trainer_review_required"])
    || metadataBoolean(structured, ["needs_review", "requires_review", "trainer_review_required"])
    || isPendingReviewStatus(metadataText(metadata, ["parser_status", "processing_status", "automation_state", "status"]))
}

function bump(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount)
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
  const dataWarnings = [...(dto.data_warnings ?? [])]
  const { data: whatsappClients, error: whatsappClientsError } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id, client_name, whatsapp_number, normalized_whatsapp_number, status, onboarding_message_status")
    .eq("trainer_id", authUserId)
    .neq("status", "archived")

  const legacyProfilesRes = dto.clients.length > 0
    ? await db
        .from("profiles")
        .select("id, phone_number")
        .in("id", dto.clients.map((client) => client.client_id))
    : { data: [], error: null }

  if (legacyProfilesRes.error) {
    dataWarnings.push("Legacy client phone metadata could not be loaded.")
  }

  const legacyPhonesByClientId = new Map(
    ((legacyProfilesRes.data ?? []) as Array<{ id: string; phone_number: string | null }>).map((row) => [
      row.id,
      normalizeWhatsAppPhone(row.phone_number),
    ]),
  )
  const legacyClientsWithPhone = dto.clients.map((client) => ({
    ...client,
    client_kind: client.client_kind ?? ("legacy" as const),
    normalized_phone: client.normalized_phone ?? legacyPhonesByClientId.get(client.client_id) ?? null,
  }))

  if (whatsappClientsError) {
    dataWarnings.push("WhatsApp-only clients could not be loaded.")
    return {
      ...dto,
      trainer: {
        ...dto.trainer,
        display_name: displayName,
      },
      clients: legacyClientsWithPhone,
      data_warnings: dataWarnings,
    }
  }

  const whatsappRows = (whatsappClients ?? []) as WhatsAppClientDashboardRow[]
  const activeWhatsAppRows = whatsappRows.filter((row) => row.status === "active")
  const activeWhatsAppPhoneSet = new Set(
    activeWhatsAppRows
      .map((row) => normalizeWhatsAppPhone(row.normalized_whatsapp_number ?? row.whatsapp_number))
      .filter((phone): phone is string => Boolean(phone)),
  )
  const canonicalLegacyClients = legacyClientsWithPhone.filter((client) =>
    !client.normalized_phone || !activeWhatsAppPhoneSet.has(client.normalized_phone),
  )

  if (activeWhatsAppRows.length === 0) {
    return {
      ...dto,
      trainer: {
        ...dto.trainer,
        display_name: displayName,
      },
      clients: canonicalLegacyClients,
      metrics: {
        ...dto.metrics,
        activeClients: canonicalLegacyClients.length,
        complianceRate: canonicalLegacyClients.length > 0
          ? Math.round((canonicalLegacyClients.filter((client) => client.total_meals_logged_today > 0).length / canonicalLegacyClients.length) * 100)
          : 0,
        atRiskClients: canonicalLegacyClients.filter((client) => isClientAtRisk(client)).length,
      },
      trends: {
        ...dto.trends,
        clientActivity: dto.trends.clientActivity.filter((activity) =>
          canonicalLegacyClients.some((client) => client.client_id === activity.client_id),
        ),
      },
      data_warnings: dataWarnings,
    }
  }

  const trainerTimezone = getTrainerTimezone(dto.trainer)
  const todayKey = todayKeyInTimezone(trainerTimezone)
  const legacyActiveClients = canonicalLegacyClients.length
  const activityWindowStart = startOfUtcDay(-7).toISOString()
  const whatsappClientIds = activeWhatsAppRows.map((row) => row.client_id)
  const [foodLogsResult, communicationsResult, voiceNotesResult] = await Promise.all([
    db
      .from("food_logs")
      .select("whatsapp_client_id, logged_at, calories, protein_g, carbs_g, fat_g, review_state, verification_status, wam_id")
      .eq("trainer_id", authUserId)
      .in("whatsapp_client_id", whatsappClientIds)
      .gte("logged_at", activityWindowStart),
    db
      .from("communication_logs")
      .select("whatsapp_client_id, direction, message_type, message_timestamp, wam_id, metadata, delivery_status")
      .eq("trainer_id", authUserId)
      .in("whatsapp_client_id", whatsappClientIds)
      .gte("message_timestamp", activityWindowStart)
      .order("message_timestamp", { ascending: false })
      .limit(Math.min(Math.max(whatsappClientIds.length * 20, 50), 500)),
    db
      .from("voice_notes")
      .select("whatsapp_client_id, created_at, processing_status")
      .in("whatsapp_client_id", whatsappClientIds)
      .gte("created_at", activityWindowStart)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(whatsappClientIds.length * 20, 50), 500)),
  ])

  if (foodLogsResult.error) dataWarnings.push("WhatsApp-only food logs could not be loaded.")
  if (communicationsResult.error) dataWarnings.push("WhatsApp-only communications could not be loaded.")
  if (voiceNotesResult.error) dataWarnings.push("WhatsApp-only voice notes could not be loaded.")

  const logs = foodLogsResult.error
    ? []
    : (foodLogsResult.data ?? []) as WhatsAppFoodLogDashboardRow[]
  const communications = communicationsResult.error
    ? []
    : (communicationsResult.data ?? []) as WhatsAppCommunicationDashboardRow[]
  const voiceNotes = voiceNotesResult.error
    ? []
    : (voiceNotesResult.data ?? []) as WhatsAppVoiceDashboardRow[]
  const summaries = new Map<string, ClientSummary>()
  const activities = new Map<string, ClientActivity>()
  const pendingFoodReviews = new Map<string, number>()
  const pendingPhotoReviews = new Map<string, number>()
  const pendingVoiceReviews = new Map<string, number>()
  const pendingReplyReviews = new Map<string, number>()
  const whatsappComplianceSets = new Map<string, Set<string>>()
  for (const entry of dto.trends.complianceOverTime) {
    whatsappComplianceSets.set(entry.date, new Set<string>())
  }

  for (const row of activeWhatsAppRows) {
    const clientName = safeNullableString(row.client_name) ?? "Client"
    summaries.set(row.client_id, {
      client_id: row.client_id,
      client_kind: "whatsapp",
      client_name: clientName,
      trainer_id: authUserId,
      normalized_phone: normalizeWhatsAppPhone(row.normalized_whatsapp_number ?? row.whatsapp_number),
      total_meals_logged_today: 0,
      total_calories_today: 0,
      total_protein_today: 0,
      total_carbs_today: 0,
      total_fat_today: 0,
      active_strike_count: 0,
      last_activity_at: null,
      pending_food_reviews: 0,
      pending_photo_reviews: 0,
      pending_voice_reviews: 0,
      pending_reply_reviews: 0,
      pending_updates: 0,
      onboarding_message_status: row.onboarding_message_status,
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

    if (dateKeyInTimezone(row.logged_at, trainerTimezone) === todayKey) {
      summary.total_meals_logged_today += 1
      summary.total_calories_today += safeNumber(row.calories)
      summary.total_protein_today += safeNumber(row.protein_g)
      summary.total_carbs_today += safeNumber(row.carbs_g)
      summary.total_fat_today += safeNumber(row.fat_g)
    }

    whatsappComplianceSets.get(dateKeyInTimezone(row.logged_at, trainerTimezone))?.add(row.whatsapp_client_id)

    activity.meals_logged += 1
    activity.total_calories += safeNumber(row.calories)
    activity.total_protein += safeNumber(row.protein_g)
    if (!activity.last_logged_at || row.logged_at > activity.last_logged_at) {
      activity.last_logged_at = row.logged_at
    }

    if (isPendingReviewStatus(row.review_state) || isPendingReviewStatus(row.verification_status)) {
      bump(pendingFoodReviews, row.whatsapp_client_id)
    }
  }

  for (const row of communications) {
    if (!row.whatsapp_client_id) continue
    const activity = activities.get(row.whatsapp_client_id)
    if (activity && (!activity.last_logged_at || row.message_timestamp > activity.last_logged_at)) {
      activity.last_logged_at = row.message_timestamp
    }
    const needsReview = metadataNeedsReview(row.metadata) || isPendingReviewStatus(row.delivery_status)
    if (!needsReview || row.direction !== "INBOUND") continue
    if (row.message_type === "IMAGE") {
      bump(pendingPhotoReviews, row.whatsapp_client_id)
    } else {
      bump(pendingReplyReviews, row.whatsapp_client_id)
    }
  }

  for (const row of voiceNotes) {
    if (!row.whatsapp_client_id) continue
    const activity = activities.get(row.whatsapp_client_id)
    if (activity && (!activity.last_logged_at || row.created_at > activity.last_logged_at)) {
      activity.last_logged_at = row.created_at
    }
    if (isPendingReviewStatus(row.processing_status)) {
      bump(pendingVoiceReviews, row.whatsapp_client_id)
    }
  }

  for (const [clientId, summary] of summaries.entries()) {
    const activity = activities.get(clientId)
    const pendingUpdates =
      (pendingFoodReviews.get(clientId) ?? 0)
      + (pendingPhotoReviews.get(clientId) ?? 0)
      + (pendingVoiceReviews.get(clientId) ?? 0)
      + (pendingReplyReviews.get(clientId) ?? 0)

    summaries.set(clientId, {
      ...summary,
      last_activity_at: activity?.last_logged_at ?? null,
      pending_food_reviews: pendingFoodReviews.get(clientId) ?? 0,
      pending_photo_reviews: pendingPhotoReviews.get(clientId) ?? 0,
      pending_voice_reviews: pendingVoiceReviews.get(clientId) ?? 0,
      pending_reply_reviews: pendingReplyReviews.get(clientId) ?? 0,
      pending_updates: pendingUpdates,
    })
  }

  const clientsById = new Map<string, ClientSummary>(canonicalLegacyClients.map((client) => [client.client_id, client]))
  for (const summary of summaries.values()) {
    clientsById.set(summary.client_id, summary)
  }
  const clients = [...clientsById.values()].sort((left, right) =>
    left.client_name.localeCompare(right.client_name),
  )

  const canonicalLegacyClientIds = new Set(canonicalLegacyClients.map((client) => client.client_id))
  const activityById = new Map(dto.trends.clientActivity
    .filter((activity) => canonicalLegacyClientIds.has(activity.client_id))
    .map((activity) => [activity.client_id, activity]))
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
  const complianceOverTime = dto.trends.complianceOverTime.map((entry) => {
    const legacyLoggerCount = legacyActiveClients > 0
      ? Math.round((entry.compliance_rate / 100) * legacyActiveClients)
      : 0
    const whatsappLoggerCount = whatsappComplianceSets.get(entry.date)?.size ?? 0

    return {
      date: entry.date,
      compliance_rate: activeClients > 0
        ? Math.round(((legacyLoggerCount + whatsappLoggerCount) / activeClients) * 100)
        : 0,
    }
  })
  const firstCompliance = complianceOverTime[0]?.compliance_rate ?? 0
  const lastCompliance = complianceOverTime[complianceOverTime.length - 1]?.compliance_rate ?? complianceRate
  const weeklyProgress = firstCompliance > 0
    ? Math.max(-100, Math.min(100, Math.round(((lastCompliance - firstCompliance) / firstCompliance) * 100)))
    : lastCompliance > 0 ? 100 : 0

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
      weeklyProgress,
      atRiskClients: clients.filter((client) => isClientAtRisk(client)).length,
    },
    trends: {
      ...dto.trends,
      complianceOverTime,
      clientActivity,
    },
    data_warnings: dataWarnings,
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
      client_kind:              "legacy",
      client_name:              safeString(row.client_name),
      trainer_id:               safeString(row.trainer_id),
      normalized_phone:         normalizeWhatsAppPhone(safeNullableString(row.normalized_phone) ?? safeNullableString(row.phone_number)),
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
    data_warnings: [],
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
  const trainerTimezone = getTrainerTimezone(trainer)
  const todayKey = todayKeyInTimezone(trainerTimezone)
  const lastWeekKey = dateKeyInTimezone(startOfUtcDay(-7).toISOString(), trainerTimezone)
  const complianceWindowStartKey = dateKeyInTimezone(startOfUtcDay(-6).toISOString(), trainerTimezone)
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
            date: dateKeyInTimezone(startOfUtcDay(index - 6).toISOString(), trainerTimezone),
            compliance_rate: 0,
          })),
          clientActivity: [],
        },
        data_warnings: [],
      },
    }
  }

  const [profilesRes, logsRes, strikesRes] = await Promise.all([
    db
      .from("profiles")
      .select("id, full_name, phone_number")
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
    const dateKey = dateKeyInTimezone(startOfUtcDay(index - 6).toISOString(), trainerTimezone)
    complianceSets.set(dateKey, new Set<string>())
  }

  const todayLoggers = new Set<string>()
  const lastWeekLoggers = new Set<string>()
  const clientSummaryMap = new Map<string, ClientSummary>()
  const activityMap = new Map<string, ClientActivity>()

  for (const clientId of clientIds) {
    clientSummaryMap.set(clientId, {
      client_id: clientId,
      client_kind: "legacy",
      client_name: profileMap.get(clientId) ?? "",
      trainer_id: authUserId,
      normalized_phone: normalizeWhatsAppPhone(profiles.find((profile) => profile.id === clientId)?.phone_number),
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
    const dateKey = dateKeyInTimezone(row.logged_at, trainerTimezone)

    if (dateKey >= complianceWindowStartKey) {
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
    const date = dateKeyInTimezone(startOfUtcDay(index - 6).toISOString(), trainerTimezone)
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
      data_warnings: [],
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
