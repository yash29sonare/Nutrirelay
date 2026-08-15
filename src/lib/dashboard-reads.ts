import { createClient } from "@supabase/supabase-js"
import { classifyImageMessage } from "@/lib/whatsapp/media-classification"

const MS_PER_DAY = 24 * 60 * 60 * 1000

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface ClientSummaryCard {
  client_id: string
  client_name: string | null
  goal_type: string | null
  compliance_score: number | null
  status_color: string
  meals_today: number
  last_logged: string | null
  last_activity_at: string | null
  last_activity_label: string | null
  active_strikes: number
  pending_food_reviews: number
  pending_photo_reviews: number
  pending_voice_reviews: number
  pending_reply_reviews: number
  pending_updates: number
  check_in_status: string
}

export interface ClientDetail {
  client_id: string
  full_name: string | null
  phone_number: string | null
  client_kind?: "legacy" | "whatsapp"
  onboarding: {
    status: string
    current_step: string
    missing_fields: string[]
    last_question_sent_at: string | null
    last_answer_received_at: string | null
    skipped_meals: string[]
  } | null
  goal: Record<string, any> | null
  health: Record<string, any> | null
  preferences: Record<string, any> | null
  workout: Record<string, any> | null
  compliance: Record<string, any> | null
  media: Array<{
    id: string
    wam_id: string | null
    message_timestamp: string
    media_url: string | null
    media_kind: string | null
    caption: string | null
  }>
  latestStructuredResponse: {
    wam_id: string | null
    message_timestamp: string
    reply_id: string | null
    reply_label: string | null
    selected_option: string | null
    interactive_type: string | null
    context_wam_id: string | null
    adherence_status: string | null
    outcome: string | null
    needs_review: boolean
    follow_up_message: string | null
    prompt: string | null
    automation_state: string | null
  } | null
}

export interface ClientWhatsAppStatus {
  status: string
  timestamp: string | null
  error: string | null
}

export interface ClientWhatsAppFoodContext {
  id: string
  notes: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  review_state: string | null
}

export interface ClientWhatsAppMessage {
  id: string
  direction: string
  message_type: string
  message_timestamp: string
  wam_id: string | null
  delivery_status: string | null
  display_text: string
  latest_status: string
  status_history: ClientWhatsAppStatus[]
  food_log: ClientWhatsAppFoodContext | null
  media_kind: string | null
  has_media_url: boolean
  has_transcript: boolean
  parser_status: string | null
  skip_reason: string | null
}

export interface DailyNutrition {
  date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meal_count: number
}

function readMetadataText(metadata: Record<string, any> | null, messageType: string, direction: string): string {
  if (typeof metadata?.original_text === "string" && metadata.original_text.trim()) {
    return metadata.original_text
  }
  if (typeof metadata?.message_preview === "string" && metadata.message_preview.trim()) {
    return metadata.message_preview
  }
  if (typeof metadata?.template_id === "string" && metadata.template_id.trim()) {
    return `Template: ${metadata.template_id}`
  }
  if (messageType === "TEMPLATE") return "Template message"
  return direction === "INBOUND" ? "Inbound WhatsApp message" : "Outbound WhatsApp message"
}

function metadataString(metadata: Record<string, any> | null, keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function metadataBoolean(metadata: Record<string, any> | null, keys: string[]): boolean {
  for (const key of keys) {
    if (metadata?.[key] === true) return true
  }
  return false
}

function needsTrainerReview(value: unknown): boolean {
  if (typeof value !== "string") return false
  return ["needs_review", "review_needed", "pending", "failed", "error"].includes(value.toLowerCase())
}

function metadataNeedsReview(metadata: Record<string, any> | null): boolean {
  if (!metadata) return false
  const structured = metadata.structured_response && typeof metadata.structured_response === "object"
    ? metadata.structured_response as Record<string, any>
    : null

  return metadataBoolean(metadata, ["needs_review", "requires_review", "trainer_review_required"])
    || metadataBoolean(structured, ["needs_review", "requires_review", "trainer_review_required"])
    || needsTrainerReview(metadataString(metadata, ["parser_status", "processing_status", "automation_state", "status"]))
}

function setLatestActivity(
  activities: Map<string, { at: string; label: string }>,
  clientId: string,
  at: string | null,
  label: string,
) {
  if (!at) return
  const current = activities.get(clientId)
  if (!current || at > current.at) {
    activities.set(clientId, { at, label })
  }
}

function incrementCount(counts: Map<string, number>, clientId: string, amount = 1) {
  counts.set(clientId, (counts.get(clientId) ?? 0) + amount)
}

function statusTimestamp(row: {
  meta_status_timestamp: string | null
  received_at: string | null
  created_at: string | null
}) {
  return row.meta_status_timestamp ?? row.received_at ?? row.created_at
}

export interface WeeklyNutrition {
  week_start: string
  avg_calories: number
  avg_protein: number
  avg_carbs: number
  avg_fat: number
  log_count: number
  streak_days: number
}

export interface ClientReport {
  report_date: string
  summary: string
  pdf_url: string | null
}

interface TrainerClientOwnershipLink {
  trainer_id: string
  client_id: string
  is_active: boolean
}

interface WeeklyReportRow {
  id: string
  client_id: string
  report_date: string
  summary: string
  pdf_storage_url: string | null
  created_at: string
  updated_at: string
}

export interface WeeklyReportHistoryItem {
  id: string
  client_id: string
  client_name: string
  report_date: string
  summary: string
  created_at: string
  updated_at: string
  has_document: boolean
}

export interface WeeklyReportHistoryResult {
  reports: WeeklyReportHistoryItem[]
  blocked_client_ids: string[]
}

export function getSafeWeeklyReportClientIds(
  trainerId: string,
  links: TrainerClientOwnershipLink[],
): {
  safeClientIds: string[]
  blockedClientIds: string[]
} {
  const activeLinks = links.filter((link) => link.is_active)
  const ownedClientIds = new Set(
    activeLinks
      .filter((link) => link.trainer_id === trainerId)
      .map((link) => link.client_id),
  )
  const trainerIdsByClient = new Map<string, Set<string>>()

  for (const link of activeLinks) {
    const trainerIds = trainerIdsByClient.get(link.client_id) ?? new Set<string>()
    trainerIds.add(link.trainer_id)
    trainerIdsByClient.set(link.client_id, trainerIds)
  }

  const blockedClientIds = [...ownedClientIds].filter((clientId) => (trainerIdsByClient.get(clientId)?.size ?? 0) > 1)
  const blockedSet = new Set(blockedClientIds)
  const safeClientIds = [...ownedClientIds].filter((clientId) => !blockedSet.has(clientId))

  return { safeClientIds, blockedClientIds }
}

export function buildWeeklyReportHistory(input: {
  reports: WeeklyReportRow[]
  clientNamesById: Map<string, string>
}): WeeklyReportHistoryItem[] {
  return input.reports
    .map((report) => ({
      id: report.id,
      client_id: report.client_id,
      client_name: input.clientNamesById.get(report.client_id) ?? "Client",
      report_date: report.report_date,
      summary: report.summary,
      created_at: report.created_at,
      updated_at: report.updated_at,
      has_document: Boolean(report.pdf_storage_url),
    }))
    .sort((a, b) => {
      const dateCompare = b.report_date.localeCompare(a.report_date)
      return dateCompare !== 0 ? dateCompare : b.created_at.localeCompare(a.created_at)
    })
}

export async function getTrainerClientSummaries(trainerId: string): Promise<ClientSummaryCard[]> {
  const db = getDb()

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("is_active", true)

  if (!tc || tc.length === 0) return []

  const clientIds = tc.map((r: Record<string, any>) => r.client_id)
  const today = new Date().toISOString().slice(0, 10)
  const lookbackIso = new Date(Date.now() - 14 * MS_PER_DAY).toISOString()
  const communicationLimit = Math.min(Math.max(clientIds.length * 20, 50), 500)

  const [profilesRes, goalsRes, complianceRes, todayMealsRes, recentFoodRes, communicationsRes, voiceNotesRes, strikesRes] = await Promise.all([
    db.from("profiles").select("id, full_name").in("id", clientIds),
    db.from("client_goals").select("client_id, goal_type").in("client_id", clientIds).eq("goal_status", "ACTIVE"),
    db.from("client_compliance_snapshots")
      .select("client_id, compliance_score, status_color")
      .in("client_id", clientIds)
      .order("calculated_at", { ascending: false }),
    db.from("food_logs")
      .select("client_id, logged_at")
      .eq("trainer_id", trainerId)
      .in("client_id", clientIds)
      .gte("logged_at", today),
    db.from("food_logs")
      .select("client_id, logged_at, review_state, verification_status, wam_id")
      .eq("trainer_id", trainerId)
      .in("client_id", clientIds)
      .gte("logged_at", lookbackIso),
    db.from("communication_logs")
      .select("client_id, direction, message_type, message_timestamp, wam_id, metadata")
      .eq("trainer_id", trainerId)
      .in("client_id", clientIds)
      .gte("message_timestamp", lookbackIso)
      .order("message_timestamp", { ascending: false })
      .limit(communicationLimit),
    db.from("voice_notes")
      .select("client_id, created_at, processing_status, transcript")
      .in("client_id", clientIds)
      .gte("created_at", lookbackIso)
      .order("created_at", { ascending: false })
      .limit(communicationLimit),
    db.from("strike_log").select("profile_id").in("profile_id", clientIds),
  ])

  const profiles = (profilesRes.data ?? []) as Array<{ id: string; full_name: string | null }>
  const goals = (goalsRes.data ?? []) as Array<{ client_id: string; goal_type: string }>
  const compliance = (complianceRes.data ?? []) as Array<{ client_id: string; compliance_score: number; status_color: string }>
  const todayMeals = (todayMealsRes.data ?? []) as Array<{ client_id: string; logged_at: string }>
  const recentFoodLogs = (recentFoodRes.data ?? []) as Array<{
    client_id: string
    logged_at: string
    review_state: string | null
    verification_status: string | null
    wam_id: string | null
  }>
  const communications = (communicationsRes.data ?? []) as Array<{
    client_id: string
    direction: string
    message_type: string
    message_timestamp: string
    wam_id: string | null
    metadata: Record<string, any> | null
  }>
  const voiceNotes = (voiceNotesRes.data ?? []) as Array<{
    client_id: string
    created_at: string
    processing_status: string | null
    transcript: string | null
  }>
  const strikes = (strikesRes.data ?? []) as Array<{ profile_id: string }>

  const goalMap = new Map(goals.map((g) => [g.client_id, g.goal_type]))
  const complianceMap = new Map(compliance.map((c) => [c.client_id, c]))
  const todayMealCount = new Map<string, number>()
  for (const m of todayMeals) {
    todayMealCount.set(m.client_id, (todayMealCount.get(m.client_id) ?? 0) + 1)
  }
  const lastLog = new Map<string, string>()
  const latestActivity = new Map<string, { at: string; label: string }>()
  for (const m of todayMeals) {
    if (!lastLog.has(m.client_id) || m.logged_at > lastLog.get(m.client_id)!) {
      lastLog.set(m.client_id, m.logged_at)
    }
    setLatestActivity(latestActivity, m.client_id, m.logged_at, "Meal log")
  }

  const pendingFoodReviews = new Map<string, number>()
  const pendingFoodWamIdsByClient = new Map<string, Set<string>>()
  for (const meal of recentFoodLogs) {
    setLatestActivity(latestActivity, meal.client_id, meal.logged_at, "Meal log")
    const needsReview = needsTrainerReview(meal.review_state) || needsTrainerReview(meal.verification_status)
    if (!needsReview) continue
    incrementCount(pendingFoodReviews, meal.client_id)
    if (meal.wam_id) {
      const wamIds = pendingFoodWamIdsByClient.get(meal.client_id) ?? new Set<string>()
      wamIds.add(meal.wam_id)
      pendingFoodWamIdsByClient.set(meal.client_id, wamIds)
    }
  }

  const pendingPhotoReviews = new Map<string, number>()
  const pendingReplyReviews = new Map<string, number>()
  for (const message of communications) {
    setLatestActivity(latestActivity, message.client_id, message.message_timestamp, "WhatsApp message")
    if (message.direction !== "INBOUND") continue

    const pendingFoodWamIds = pendingFoodWamIdsByClient.get(message.client_id)
    const linkedPendingImageFoodLog =
      message.message_type === "IMAGE" && Boolean(message.wam_id && pendingFoodWamIds?.has(message.wam_id))
    const metadataReview = metadataNeedsReview(message.metadata)

    if (message.message_type === "IMAGE" && (metadataReview || linkedPendingImageFoodLog)) {
      incrementCount(pendingPhotoReviews, message.client_id)
    }
    if (message.message_type !== "IMAGE" && metadataReview) {
      incrementCount(pendingReplyReviews, message.client_id)
    }
  }

  const pendingVoiceReviews = new Map<string, number>()
  for (const note of voiceNotes) {
    setLatestActivity(latestActivity, note.client_id, note.created_at, "Voice note")
    if (needsTrainerReview(note.processing_status)) {
      incrementCount(pendingVoiceReviews, note.client_id)
    }
  }

  const strikeCount = new Map<string, number>()
  for (const s of strikes) {
    strikeCount.set(s.profile_id, (strikeCount.get(s.profile_id) ?? 0) + 1)
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]))

  return clientIds.map((id) => {
    const comp = complianceMap.get(id)
    return {
      client_id: id,
      client_name: profileMap.get(id) ?? null,
      goal_type: goalMap.get(id) ?? null,
      compliance_score: comp?.compliance_score ?? null,
      status_color: comp?.status_color ?? "GREEN",
      meals_today: todayMealCount.get(id) ?? 0,
      last_logged: lastLog.get(id) ?? null,
      last_activity_at: latestActivity.get(id)?.at ?? null,
      last_activity_label: latestActivity.get(id)?.label ?? null,
      active_strikes: strikeCount.get(id) ?? 0,
      pending_food_reviews: pendingFoodReviews.get(id) ?? 0,
      pending_photo_reviews: pendingPhotoReviews.get(id) ?? 0,
      pending_voice_reviews: pendingVoiceReviews.get(id) ?? 0,
      pending_reply_reviews: pendingReplyReviews.get(id) ?? 0,
      pending_updates:
        (pendingFoodReviews.get(id) ?? 0)
        + (pendingPhotoReviews.get(id) ?? 0)
        + (pendingVoiceReviews.get(id) ?? 0)
        + (pendingReplyReviews.get(id) ?? 0),
      check_in_status: (todayMealCount.get(id) ?? 0) > 0 ? "Checked in today" : "No meal today",
    }
  })
}

export async function getClientDetail(clientId: string, trainerId: string): Promise<ClientDetail | null> {
  const db = getDb()

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (!tc) {
    const { data: whatsappClient } = await db
      .from("trainer_whatsapp_clients")
      .select("client_id, client_name, whatsapp_number, normalized_whatsapp_number, onboarding_message_status, goal, diet_notes, meal_reminder_times, workout_time, automation_enabled, status")
      .eq("client_id", clientId)
      .eq("trainer_id", trainerId)
      .neq("status", "archived")
      .limit(1)
      .maybeSingle()

    const row = whatsappClient as {
      client_id: string
      client_name: string | null
      whatsapp_number: string | null
      normalized_whatsapp_number: string | null
      onboarding_message_status: string | null
      goal: string | null
      diet_notes: string | null
      meal_reminder_times: unknown
      workout_time: string | null
      automation_enabled: boolean | null
      status: string | null
    } | null

    if (!row) return null

    const mealReminderTimes = Array.isArray(row.meal_reminder_times)
      ? row.meal_reminder_times.filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      : []

    return {
      client_id: row.client_id,
      full_name: row.client_name ?? "Client",
      phone_number: row.normalized_whatsapp_number ?? row.whatsapp_number,
      client_kind: "whatsapp",
      onboarding: {
        status: row.onboarding_message_status ?? "not_sent",
        current_step: row.onboarding_message_status ?? "not_sent",
        missing_fields: [],
        last_question_sent_at: null,
        last_answer_received_at: null,
        skipped_meals: [],
      },
      goal: row.goal ? { goal_type: row.goal, notes: row.goal, goal_status: "ACTIVE" } : null,
      health: null,
      preferences: row.diet_notes ? { notes: row.diet_notes } : null,
      workout: {
        meal_reminder_times: mealReminderTimes,
        workout_time: row.workout_time,
        automation_enabled: row.automation_enabled ?? false,
        client_status: row.status ?? "active",
      },
      compliance: null,
      media: [],
      latestStructuredResponse: null,
    }
  }

  const [profileRes, onboardingRes, goalRes, healthRes, prefRes, workoutRes, complianceRes, mediaRes, structuredResponseRes] = await Promise.all([
    db.from("profiles").select("full_name, phone_number").eq("id", clientId).single(),
    db.from("client_onboarding_states").select("*").eq("client_id", clientId).limit(1).maybeSingle(),
    db.from("client_goals").select("*").eq("client_id", clientId).eq("goal_status", "ACTIVE").limit(1).maybeSingle(),
    db.from("client_health_profiles").select("*").eq("client_id", clientId).limit(1).maybeSingle(),
    db.from("client_preferences").select("*").eq("client_id", clientId).limit(1).maybeSingle(),
    db.from("client_workout_schedules").select("*").eq("client_id", clientId).limit(1).maybeSingle(),
    db.from("client_compliance_snapshots").select("*").eq("client_id", clientId).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("communication_logs")
      .select("id, wam_id, message_timestamp, metadata")
      .eq("trainer_id", trainerId)
      .eq("client_id", clientId)
      .eq("direction", "INBOUND")
      .eq("message_type", "IMAGE")
      .order("message_timestamp", { ascending: false })
      .limit(12),
    db.from("communication_logs")
      .select("wam_id, message_timestamp, metadata")
      .eq("trainer_id", trainerId)
      .eq("client_id", clientId)
      .eq("direction", "INBOUND")
      .eq("message_type", "POLL")
      .order("message_timestamp", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const profile = profileRes.data as { full_name: string | null; phone_number: string | null } | null
  const onboarding = onboardingRes.data as Record<string, any> | null
  const goal = goalRes.data as Record<string, any> | null
  const health = healthRes.data as Record<string, any> | null
  const preferences = prefRes.data as Record<string, any> | null
  const workout = workoutRes.data as Record<string, any> | null
  const onboardingCollectedData = onboarding?.collected_data && typeof onboarding.collected_data === "object"
    ? onboarding.collected_data as Record<string, any>
    : null
  const skippedMeals = Array.isArray(onboardingCollectedData?.routine_times?.skippedMeals)
    ? onboardingCollectedData.routine_times.skippedMeals.filter((meal: unknown): meal is string => typeof meal === "string")
    : []
  const missingFields = [
    !health?.height_cm ? "height" : null,
    !health?.weight_kg ? "weight" : null,
    !goal?.goal_type ? "goal" : null,
    health?.allergies === undefined ? "allergies" : null,
    !health?.diet_type ? "food_preferences" : null,
    !workout?.breakfast_time && !workout?.lunch_time && !workout?.snack_time && !workout?.dinner_time ? "routine_times" : null,
    !workout?.workout_time ? "workout_schedule" : null,
    !workout?.preferred_checkin_time && !workout?.checkin_preference ? "checkin_preference" : null,
  ].filter((value): value is string => Boolean(value))

  return {
    client_id: clientId,
    full_name: profile?.full_name ?? null,
    phone_number: profile?.phone_number ?? null,
    client_kind: "legacy",
    onboarding: onboarding ? {
      status: typeof onboarding.onboarding_status === "string" ? onboarding.onboarding_status : "not_started",
      current_step: typeof onboarding.current_step === "string" ? onboarding.current_step : "height",
      missing_fields: missingFields,
      last_question_sent_at: typeof onboarding.last_question_sent_at === "string" ? onboarding.last_question_sent_at : null,
      last_answer_received_at: typeof onboarding.last_answer_received_at === "string" ? onboarding.last_answer_received_at : null,
      skipped_meals: skippedMeals,
    } : null,
    goal,
    health,
    preferences,
    workout,
    compliance: (complianceRes.data as Record<string, any> | null),
    media: ((mediaRes.data ?? []) as Array<{
      id: string
      wam_id: string | null
      message_timestamp: string
      metadata: Record<string, any> | null
    }>).map((row) => {
      const caption = typeof row.metadata?.original_text === "string" ? row.metadata.original_text : null
      const storedKind = typeof row.metadata?.media_kind === "string" ? row.metadata.media_kind : null

      return {
        id: row.id,
        wam_id: row.wam_id,
        message_timestamp: row.message_timestamp,
        media_url: typeof row.metadata?.media_url === "string" ? row.metadata.media_url : null,
        media_kind: storedKind && storedKind !== "unknown" ? storedKind : classifyImageMessage({ caption }),
        caption,
      }
    }),
    latestStructuredResponse: (() => {
      const row = structuredResponseRes.data as {
        wam_id: string | null
        message_timestamp: string
        metadata: Record<string, any> | null
      } | null

      if (!row) return null

      const structured = row.metadata?.structured_response as Record<string, unknown> | undefined
      return {
        wam_id: row.wam_id,
        message_timestamp: row.message_timestamp,
        reply_id: typeof structured?.reply_id === "string" ? structured.reply_id : null,
        reply_label: typeof structured?.reply_label === "string" ? structured.reply_label : null,
        selected_option: typeof structured?.selected_option === "string" ? structured.selected_option : null,
        interactive_type: typeof structured?.interactive_type === "string" ? structured.interactive_type : null,
        context_wam_id: typeof structured?.context_wam_id === "string" ? structured.context_wam_id : null,
        adherence_status: typeof structured?.adherence_status === "string" ? structured.adherence_status : null,
        outcome: typeof structured?.outcome === "string" ? structured.outcome : null,
        needs_review: structured?.needs_review === true,
        follow_up_message: typeof structured?.follow_up_message === "string" ? structured.follow_up_message : null,
        prompt: typeof row.metadata?.outbound_prompt?.prompt === "string" ? row.metadata.outbound_prompt.prompt : null,
        automation_state: typeof row.metadata?.automation_state === "string" ? row.metadata.automation_state : null,
      }
    })(),
  }
}

export async function getClientWhatsAppConversation(
  clientId: string,
  trainerId: string,
  limit = 20,
): Promise<ClientWhatsAppMessage[]> {
  const db = getDb()

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  const isLegacyClient = Boolean(tc)
  if (!isLegacyClient) {
    const { data: whatsappClient } = await db
      .from("trainer_whatsapp_clients")
      .select("client_id")
      .eq("client_id", clientId)
      .eq("trainer_id", trainerId)
      .neq("status", "archived")
      .limit(1)
      .maybeSingle()

    if (!whatsappClient) return []
  }

  let communicationQuery = db
    .from("communication_logs")
    .select("id, direction, message_type, wam_id, message_timestamp, delivery_status, metadata, created_at")
    .eq("trainer_id", trainerId)

  communicationQuery = isLegacyClient
    ? communicationQuery.eq("client_id", clientId)
    : communicationQuery.eq("whatsapp_client_id", clientId)

  const { data: communications, error: communicationsError } = await communicationQuery
    .order("message_timestamp", { ascending: false })
    .limit(limit)

  if (communicationsError) {
    throw new Error("Failed to load WhatsApp communication history")
  }

  const rows = (communications ?? []) as Array<{
    id: string
    direction: string
    message_type: string
    wam_id: string | null
    message_timestamp: string
    delivery_status: string | null
    metadata: Record<string, any> | null
    created_at: string
  }>

  const wamIds = rows.map((row) => row.wam_id).filter((wamId): wamId is string => Boolean(wamId))
  const [statusRes, foodRes] = wamIds.length > 0
    ? await Promise.all([
        db
          .from("whatsapp_message_statuses")
          .select("wam_id, status, meta_status_timestamp, received_at, created_at, error_payload")
          .eq("trainer_id", trainerId)
          .in("wam_id", wamIds)
          .order("meta_status_timestamp", { ascending: true, nullsFirst: false }),
        (() => {
          let foodQuery = db
          .from("food_logs")
          .select("id, wam_id, notes, calories, protein_g, carbs_g, fat_g, review_state")
          .eq("trainer_id", trainerId)
          foodQuery = isLegacyClient
            ? foodQuery.eq("client_id", clientId)
            : foodQuery.eq("whatsapp_client_id", clientId)
          return foodQuery.in("wam_id", wamIds)
        })(),
      ])
    : [{ data: [] }, { data: [] }]

  if ("error" in statusRes && statusRes.error) {
    throw new Error("Failed to load WhatsApp message statuses")
  }
  if ("error" in foodRes && foodRes.error) {
    throw new Error("Failed to load WhatsApp food-log context")
  }

  const statusesByWamId = new Map<string, ClientWhatsAppStatus[]>()
  for (const row of (statusRes.data ?? []) as Array<{
    wam_id: string
    status: string
    meta_status_timestamp: string | null
    received_at: string | null
    created_at: string | null
    error_payload: Record<string, any> | null
  }>) {
    const error = row.error_payload
      ? JSON.stringify(row.error_payload).slice(0, 180)
      : null
    const status: ClientWhatsAppStatus = {
      status: row.status,
      timestamp: statusTimestamp(row),
      error,
    }
    statusesByWamId.set(row.wam_id, [...(statusesByWamId.get(row.wam_id) ?? []), status])
  }

  const foodByWamId = new Map<string, ClientWhatsAppFoodContext>()
  for (const row of (foodRes.data ?? []) as Array<{
    id: string
    wam_id: string | null
    notes: string | null
    calories: number | string | null
    protein_g: number | string | null
    carbs_g: number | string | null
    fat_g: number | string | null
    review_state: string | null
  }>) {
    if (!row.wam_id) continue
    foodByWamId.set(row.wam_id, {
      id: row.id,
      notes: row.notes,
      calories: row.calories === null ? null : Number(row.calories),
      protein_g: row.protein_g === null ? null : Number(row.protein_g),
      carbs_g: row.carbs_g === null ? null : Number(row.carbs_g),
      fat_g: row.fat_g === null ? null : Number(row.fat_g),
      review_state: row.review_state,
    })
  }

  return rows.map((row) => {
    const statusHistory = row.wam_id ? statusesByWamId.get(row.wam_id) ?? [] : []
    const latestStatus = statusHistory.at(-1)?.status
      ?? row.delivery_status
      ?? (row.direction === "INBOUND" ? "received" : "unknown")

    return {
      id: row.id,
      direction: row.direction,
      message_type: row.message_type,
      message_timestamp: row.message_timestamp,
      wam_id: row.wam_id,
      delivery_status: row.delivery_status,
      display_text: readMetadataText(row.metadata, row.message_type, row.direction),
      latest_status: latestStatus,
      status_history: statusHistory,
      food_log: row.wam_id ? foodByWamId.get(row.wam_id) ?? null : null,
      media_kind: metadataString(row.metadata, ["media_kind", "media_type"]),
      has_media_url: Boolean(metadataString(row.metadata, ["media_url", "storage_path", "image_path"])),
      has_transcript: Boolean(metadataString(row.metadata, ["transcript", "transcription", "voice_transcript"])),
      parser_status: metadataString(row.metadata, ["parser_status", "processing_status", "automation_state", "intent"]),
      skip_reason: metadataString(row.metadata, ["skip_reason", "unsupported_reason", "media_skip_reason"]),
    }
  })
}

export async function getDailyNutrition(clientId: string, date: string, trainerId?: string): Promise<DailyNutrition[]> {
  const db = getDb()

  let query = db
    .from("food_logs")
    .select("logged_at, calories, protein_g, carbs_g, fat_g")
    .eq("client_id", clientId)
    .gte("logged_at", `${date}T00:00:00Z`)
    .lt("logged_at", `${date}T23:59:59Z`)

  if (trainerId) {
    query = query.eq("trainer_id", trainerId)
  }

  const { data: meals } = await query
    .order("logged_at", { ascending: true })

  const rows = (meals ?? []) as Array<{ logged_at: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }>

  if (rows.length === 0) {
    return [{
      date,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      meal_count: 0,
    }]
  }

  return [{
    date,
    calories: rows.reduce((s, r) => s + Number(r.calories ?? 0), 0),
    protein_g: Math.round(rows.reduce((s, r) => s + Number(r.protein_g ?? 0), 0) * 10) / 10,
    carbs_g: Math.round(rows.reduce((s, r) => s + Number(r.carbs_g ?? 0), 0) * 10) / 10,
    fat_g: Math.round(rows.reduce((s, r) => s + Number(r.fat_g ?? 0), 0) * 10) / 10,
    meal_count: rows.length,
  }]
}

export async function getWeeklyNutrition(clientId: string, trainerId?: string): Promise<WeeklyNutrition[]> {
  const db = getDb()
  const weekAgo = new Date(Date.now() - 7 * MS_PER_DAY).toISOString()

  let query = db
    .from("food_logs")
    .select("logged_at, calories, protein_g, carbs_g, fat_g")
    .eq("client_id", clientId)
    .gte("logged_at", weekAgo)

  if (trainerId) {
    query = query.eq("trainer_id", trainerId)
  }

  const { data: meals } = await query
    .order("logged_at", { ascending: true })

  const rows = (meals ?? []) as Array<{ logged_at: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }>

  const days = new Map<string, { cals: number[]; pro: number[]; car: number[]; fat: number[] }>()
  for (const r of rows) {
    const day = r.logged_at.slice(0, 10)
    if (!days.has(day)) days.set(day, { cals: [], pro: [], car: [], fat: [] })
    const d = days.get(day)!
    d.cals.push(Number(r.calories ?? 0))
    d.pro.push(Number(r.protein_g ?? 0))
    d.car.push(Number(r.carbs_g ?? 0))
    d.fat.push(Number(r.fat_g ?? 0))
  }

  const weekStart = new Date(Date.now() - 7 * MS_PER_DAY).toISOString().slice(0, 10)
  const totalCalories = rows.reduce((s, r) => s + Number(r.calories ?? 0), 0)

  return [{
    week_start: weekStart,
    avg_calories: rows.length > 0 ? Math.round(totalCalories / rows.length) : 0,
    avg_protein: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + Number(r.protein_g ?? 0), 0) / rows.length * 10) / 10 : 0,
    avg_carbs: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + Number(r.carbs_g ?? 0), 0) / rows.length * 10) / 10 : 0,
    avg_fat: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + Number(r.fat_g ?? 0), 0) / rows.length * 10) / 10 : 0,
    log_count: rows.length,
    streak_days: days.size,
  }]
}

export async function getMonthlyNutrition(clientId: string, trainerId?: string): Promise<WeeklyNutrition[]> {
  const db = getDb()
  const monthAgo = new Date(Date.now() - 30 * MS_PER_DAY).toISOString()

  let query = db
    .from("food_logs")
    .select("logged_at, calories, protein_g, carbs_g, fat_g")
    .eq("client_id", clientId)
    .gte("logged_at", monthAgo)

  if (trainerId) {
    query = query.eq("trainer_id", trainerId)
  }

  const { data: meals } = await query
    .order("logged_at", { ascending: true })

  const rows = (meals ?? []) as Array<{ logged_at: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }>

  const days = new Set(rows.map((r) => r.logged_at.slice(0, 10)))
  const totalCalories = rows.reduce((s, r) => s + Number(r.calories ?? 0), 0)

  const monthStart = new Date(Date.now() - 30 * MS_PER_DAY).toISOString().slice(0, 10)
  return [{
    week_start: monthStart,
    avg_calories: rows.length > 0 ? Math.round(totalCalories / rows.length) : 0,
    avg_protein: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + Number(r.protein_g ?? 0), 0) / rows.length * 10) / 10 : 0,
    avg_carbs: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + Number(r.carbs_g ?? 0), 0) / rows.length * 10) / 10 : 0,
    avg_fat: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + Number(r.fat_g ?? 0), 0) / rows.length * 10) / 10 : 0,
    log_count: rows.length,
    streak_days: days.size,
  }]
}

export async function getClientCompliance(clientId: string, trainerId: string): Promise<Record<string, any> | null> {
  const db = getDb()

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .limit(1)
    .maybeSingle()

  if (!tc) return null

  const { data } = await db
    .from("client_compliance_snapshots")
    .select("*")
    .eq("client_id", clientId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as Record<string, any> | null) ?? null
}

export async function getClientReports(clientId: string, trainerId: string): Promise<ClientReport[]> {
  const db = getDb()

  const { data: tc } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .limit(1)
    .maybeSingle()

  if (!tc) return []

  const { data: weekly } = await db
    .from("weekly_reports")
    .select("report_date, summary, pdf_storage_url")
    .eq("client_id", clientId)
    .order("report_date", { ascending: false })
    .limit(12)

  const { data: monthly } = await db
    .from("monthly_reports")
    .select("report_month, summary")
    .eq("client_id", clientId)
    .order("report_month", { ascending: false })
    .limit(12)

  const reports: ClientReport[] = []

  for (const r of (weekly ?? []) as Array<{ report_date: string; summary: string; pdf_storage_url: string | null }>) {
    reports.push({
      report_date: r.report_date,
      summary: r.summary,
      pdf_url: null,
    })
  }

  for (const r of (monthly ?? []) as Array<{ report_month: string; summary: string }>) {
    reports.push({
      report_date: r.report_month,
      summary: r.summary,
      pdf_url: null,
    })
  }

  reports.sort((a, b) => b.report_date.localeCompare(a.report_date))
  return reports
}

export async function getTrainerWeeklyReportHistory(trainerId: string): Promise<WeeklyReportHistoryResult> {
  const db = getDb()
  const { data: links } = await db
    .from("trainer_clients")
    .select("trainer_id, client_id, is_active")
    .eq("is_active", true)

  const ownershipLinks = (links ?? []) as TrainerClientOwnershipLink[]
  const { safeClientIds, blockedClientIds } = getSafeWeeklyReportClientIds(trainerId, ownershipLinks)

  if (safeClientIds.length === 0) {
    return { reports: [], blocked_client_ids: blockedClientIds }
  }

  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name")
    .in("id", safeClientIds)

  const clientNamesById = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string | null }>).map((profile) => [
      profile.id,
      profile.full_name ?? "Client",
    ]),
  )

  const { data: weeklyReports } = await db
    .from("weekly_reports")
    .select("id, client_id, report_date, summary, pdf_storage_url, created_at, updated_at")
    .in("client_id", safeClientIds)
    .order("report_date", { ascending: false })
    .limit(50)

  return {
    reports: buildWeeklyReportHistory({
      reports: (weeklyReports ?? []) as WeeklyReportRow[],
      clientNamesById,
    }),
    blocked_client_ids: blockedClientIds,
  }
}
