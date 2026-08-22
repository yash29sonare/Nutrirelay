import { getPlanClientLimit } from "@/lib/entitlements"
import { getWhatsAppServiceDb, normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db"
import {
  getWhatsAppTemplateLanguage,
  getWhatsAppTemplateName,
  sendFreeMessage,
  sendTemplateMessage,
  WindowClosedError,
  type TemplateId,
} from "@/lib/whatsapp/send"

export type WhatsAppClientStatus = "active" | "inactive" | "archived" | string
export type OnboardingMessageStatus = "not_sent" | "pending" | "sent" | "failed" | string

export interface TrainerWhatsAppClientRow {
  client_id: string
  trainer_id: string
  client_name: string
  whatsapp_number: string | null
  normalized_whatsapp_number: string | null
  status: WhatsAppClientStatus
  onboarding_message_status: OnboardingMessageStatus
  created_at: string
  updated_at: string
  onboarding_failure_reason: string | null
}

export interface TrainerWhatsAppClientDetail {
  client_id: string
  trainer_id: string
  client_name: string
  whatsapp_number: string | null
  normalized_whatsapp_number: string | null
  status: WhatsAppClientStatus
  onboarding_message_status: OnboardingMessageStatus
  goal: string | null
  diet_notes: string | null
  meal_reminder_times: string[]
  workout_time: string | null
  automation_enabled: boolean
  created_at: string
  updated_at: string
  phone_edit_locked: boolean
  phone_edit_lock_reason: string | null
}

export interface TrainerWhatsAppClientMeal {
  id: string
  logged_at: string
  notes: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  review_state: string | null
  verification_status: string | null
}

export interface TrainerWhatsAppClientMedia {
  id: string
  message_timestamp: string
  message_type: string
  media_kind: string | null
  caption: string | null
  has_media_url: boolean
}

export interface TrainerWhatsAppClientVoiceNote {
  id: string
  created_at: string
  processing_status: string | null
  transcript: string | null
}

export interface TrainerWhatsAppClientDashboard {
  meals: TrainerWhatsAppClientMeal[]
  todaysMeals: TrainerWhatsAppClientMeal[]
  media: TrainerWhatsAppClientMedia[]
  voiceNotes: TrainerWhatsAppClientVoiceNote[]
  weeklyReportsCount: number
  monthlyReportsCount: number
  communicationCount: number
  pendingReviewCount: number
  lastActivityAt: string | null
  dataSourceWarnings: string[]
}

export interface TrainerWhatsAppWindowStatus {
  isOpen: boolean
  openUntilIso: string | null
  openUntilLabel: string | null
  message: string
}

export interface DailyCheckInReadiness {
  ready: boolean
  reasons: string[]
  template: WhatsAppTemplatePreview
  trainerLocalDate: string
  alreadySentToday: boolean
}

export interface AddTrainerWhatsAppClientInput {
  authUserId: string
  clientName: string
  whatsappNumber: string
  goal: string
  dietNotes: string | null
}

export interface AddTrainerWhatsAppClientResult {
  ok: boolean
  message: string
  clientId?: string
  wamId?: string | null
}

export interface SendTrainerWhatsAppClientOnboardingResult {
  ok: boolean
  message: string
  clientId?: string
  wamId?: string | null
}

export interface UpdateTrainerWhatsAppClientInput {
  authUserId: string
  clientId: string
  clientName: string
  whatsappNumber: string | null
  goal: string | null
  dietNotes: string | null
  mealReminderTimes: string[]
  workoutTime: string | null
  automationEnabled: boolean
  status: "active" | "inactive"
}

export interface UpdateTrainerWhatsAppClientResult {
  ok: boolean
  message: string
}

export interface TrainerClientMessageDraft {
  id: string | null
  trainer_id: string
  whatsapp_client_id: string
  title: string | null
  body: string
  purpose: "diet_followup"
  updated_at: string | null
}

export interface SaveTrainerClientMessageDraftInput {
  authUserId: string
  clientId: string
  title: string | null
  body: string
}

export type SendTrainerClientCustomMessageInput = SaveTrainerClientMessageDraftInput

export interface TrainerClientMessageResult {
  ok: boolean
  message: string
  draft?: TrainerClientMessageDraft | null
  wamId?: string | null
}

const DEFAULT_TEMPLATE_VALUE = "there"
const DEFAULT_BUSINESS_NAME = "NutriRelay"
const CUSTOM_MESSAGE_WINDOW_CLOSED_MESSAGE = "The 24-hour WhatsApp window is closed. Send an approved template first."

export interface WhatsAppTemplatePreview {
  available: boolean
  templateId: TemplateId | null
  templateName: string | null
  language: string | null
  components: Array<{
    type: "body" | "header"
    parameters: Array<{
      placeholder: string
      valueKey: "client_name" | "trainer_name" | "business_name"
      value: string
    }>
  }>
  finalPreviewText: string
  source: "env" | "default"
  exactMetaRenderedTextAvailable: boolean
  editGuidance: string
}

export type OnboardingTemplatePreview = WhatsAppTemplatePreview

function hasEnvValue(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

function templateValue(value: string | null | undefined, fallback = DEFAULT_TEMPLATE_VALUE): string {
  return value?.trim() || fallback
}

function buildTemplateComponents(input: {
  clientName: string
  trainerName: string
  businessName: string
}): WhatsAppTemplatePreview["components"] {
  return [{
    type: "body",
    parameters: [
      { placeholder: "{{1}}", valueKey: "client_name", value: input.clientName },
      { placeholder: "{{2}}", valueKey: "trainer_name", value: input.trainerName },
      { placeholder: "{{3}}", valueKey: "business_name", value: input.businessName },
    ],
  }]
}

export function getOnboardingTemplatePreview(input: {
  clientName?: string | null
  trainerName?: string | null
  businessName?: string | null
} = {}): OnboardingTemplatePreview {
  const clientName = templateValue(input.clientName)
  const trainerName = templateValue(input.trainerName, "your trainer")
  const businessName = templateValue(input.businessName, DEFAULT_BUSINESS_NAME)
  const templateName = getWhatsAppTemplateName("onboarding")

  return {
    available: true,
    templateId: templateName,
    templateName,
    language: getWhatsAppTemplateLanguage("onboarding"),
    components: buildTemplateComponents({ clientName, trainerName, businessName }),
    finalPreviewText: [
      `Hi ${clientName}, this is ${trainerName} from ${businessName}.`,
      "Welcome to NutriRelay. Reply here with your meals, photos, and voice notes so your trainer can track your daily nutrition.",
    ].join("\n"),
    source: hasEnvValue("WHATSAPP_ONBOARDING_TEMPLATE_NAME") || hasEnvValue("WHATSAPP_ONBOARDING_TEMPLATE_LANGUAGE")
      ? "env"
      : "default",
    exactMetaRenderedTextAvailable: false,
    editGuidance: "To change the actual WhatsApp message, update the approved template in Meta and wait for approval.",
  }
}

export function getDailyCheckInTemplatePreview(input: {
  clientName?: string | null
  trainerName?: string | null
  businessName?: string | null
} = {}): WhatsAppTemplatePreview {
  const clientName = templateValue(input.clientName)
  const trainerName = templateValue(input.trainerName, "your trainer")
  const businessName = templateValue(input.businessName, DEFAULT_BUSINESS_NAME)
  const templateName = getWhatsAppTemplateName("daily_checkin")

  return {
    available: true,
    templateId: templateName,
    templateName,
    language: getWhatsAppTemplateLanguage("daily_checkin"),
    components: buildTemplateComponents({ clientName, trainerName, businessName }),
    finalPreviewText: [
      `Good morning ${clientName}. ${trainerName} from ${businessName} is ready for today's updates.`,
      "Reply here with your first meal, food photos, or a voice note when you start logging today.",
    ].join("\n"),
    source: hasEnvValue("WHATSAPP_DAILY_CHECKIN_TEMPLATE_NAME") || hasEnvValue("WHATSAPP_DAILY_CHECKIN_TEMPLATE_LANGUAGE")
      ? "env"
      : "default",
    exactMetaRenderedTextAvailable: false,
    editGuidance: "To change the actual WhatsApp message, update the approved template in Meta and wait for approval.",
  }
}

function safeFailureReason(error: unknown): string {
  if (!(error instanceof Error)) return "Onboarding template send failed."
  if (error.name === "WhatsAppDeliveryError") return "Meta rejected the onboarding template send."
  return error.message.slice(0, 180)
}

function maskWhatsAppNumber(phone: string | null): string | null {
  const normalized = normalizeWhatsAppPhone(phone)
  if (!normalized) return null
  if (normalized.length <= 4) return normalized
  return `${normalized.slice(0, 2)}${"*".repeat(Math.max(2, normalized.length - 6))}${normalized.slice(-4)}`
}

function normalizeReminderTimes(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
}

function numericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function formatInTimeZone(value: Date, timeZone: string): string {
  return value.toLocaleString("en-IN", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function dateKeyInTimeZone(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value)
}

function addHours(value: string, hours: number): Date | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getTime() + hours * 60 * 60 * 1000)
}

function latestIso(values: Array<string | null | undefined>): string | null {
  const valid = values
    .filter((value): value is string => Boolean(value))
    .filter((value) => !Number.isNaN(new Date(value).getTime()))
    .sort((a, b) => b.localeCompare(a))
  return valid[0] ?? null
}

function isMissingDraftTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || Boolean(error?.message?.toLowerCase().includes("trainer_client_message_drafts"))
}

function normalizeDraftInput(input: {
  title: string | null
  body: string
}): { title: string | null; body: string; error: string | null } {
  const title = input.title?.trim() || null
  const body = input.body.trim()
  if (title && title.length > 120) {
    return { title, body, error: "Message title must be 120 characters or fewer." }
  }
  if (!body) {
    return { title, body, error: "Message body is required." }
  }
  if (body.length > 4000) {
    return { title, body, error: "Message body must be 4000 characters or fewer." }
  }
  return { title, body, error: null }
}

function metadataText(metadata: Record<string, unknown> | null, keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function metadataHasMediaUrl(metadata: Record<string, unknown> | null): boolean {
  return Boolean(metadataText(metadata, ["media_url", "storage_path", "image_path", "audio_url"]))
}

function isPendingReviewStatus(value: string | null): boolean {
  if (!value) return false
  return ["needs_review", "review_needed", "pending", "failed", "error", "unverified"].includes(value.toLowerCase())
}

function resultWarning(
  result: PromiseSettledResult<{ error?: { message?: string } | null }>,
  label: string,
): string | null {
  if (result.status === "rejected") return `${label} could not be loaded.`
  if (result.value.error) return `${label} could not be loaded.`
  return null
}

function isEditableStatus(value: string): value is "active" | "inactive" {
  return value === "active" || value === "inactive"
}

async function countWhatsAppReports(input: {
  table: "weekly_reports" | "monthly_reports"
  clientId: string
}): Promise<{ count: number; error: { message?: string } | null }> {
  const db = getWhatsAppServiceDb()
  const result = await db
    .from(input.table)
    .select("id", { count: "exact", head: true })
    .eq("whatsapp_client_id", input.clientId)

  return {
    count: result.count ?? 0,
    error: result.error ? { message: result.error.message } : null,
  }
}

async function hasActivityRows(input: {
  authUserId: string
  clientId: string
  normalizedPhone: string | null
}): Promise<boolean> {
  const db = getWhatsAppServiceDb()
  const [communications, foodLogs, voiceNotes, webhookEvents, incomingLogs] = await Promise.all([
    db
      .from("communication_logs")
      .select("id", { count: "exact", head: true })
      .eq("trainer_id", input.authUserId)
      .eq("whatsapp_client_id", input.clientId),
    db
      .from("food_logs")
      .select("id", { count: "exact", head: true })
      .eq("trainer_id", input.authUserId)
      .eq("whatsapp_client_id", input.clientId),
    db
      .from("voice_notes")
      .select("id", { count: "exact", head: true })
      .eq("whatsapp_client_id", input.clientId),
    input.normalizedPhone
      ? db
          .from("whatsapp_webhook_events")
          .select("id", { count: "exact", head: true })
          .eq("trainer_id", input.authUserId)
          .eq("client_phone", input.normalizedPhone)
          .eq("event_category", "message")
      : Promise.resolve({ count: 0 }),
    input.normalizedPhone
      ? db
          .from("incoming_webhook_logs")
          .select("id", { count: "exact", head: true })
          .eq("client_phone", input.normalizedPhone)
      : Promise.resolve({ count: 0 }),
  ])

  const checks = [communications, foodLogs, voiceNotes, webhookEvents, incomingLogs]
  if (checks.some((check) => "error" in check && check.error)) {
    return true
  }

  return checks.some((check) => (check.count ?? 0) > 0)
}

async function getPhoneEditLock(input: {
  authUserId: string
  clientId: string
  normalizedPhone: string | null
  onboardingStatus: string
}): Promise<{ locked: boolean; reason: string | null }> {
  const lockedMessage = "Phone number is locked after onboarding or client activity. Archive this client and add a new one if the number is wrong."

  if (input.onboardingStatus !== "not_sent") {
    return { locked: true, reason: lockedMessage }
  }

  const hasActivity = await hasActivityRows(input)
  return hasActivity
    ? { locked: true, reason: lockedMessage }
    : { locked: false, reason: null }
}

export async function getTrainerWhatsAppClientWindowStatus(
  authUserId: string,
  clientId: string,
  timeZone: string,
): Promise<TrainerWhatsAppWindowStatus> {
  const db = getWhatsAppServiceDb()
  const { data: client, error } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id, normalized_whatsapp_number, whatsapp_number")
    .eq("trainer_id", authUserId)
    .eq("client_id", clientId)
    .neq("status", "archived")
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to verify WhatsApp client access: ${error.message}`)
  }

  const row = client as {
    client_id: string
    normalized_whatsapp_number: string | null
    whatsapp_number: string | null
  } | null

  if (!row) {
    return {
      isOpen: false,
      openUntilIso: null,
      openUntilLabel: null,
      message: "WhatsApp window closed. Send an approved template first.",
    }
  }

  const normalizedPhone = normalizeWhatsAppPhone(row.normalized_whatsapp_number ?? row.whatsapp_number)
  const [communication, incomingWebhook, webhookEvent] = await Promise.all([
    db
      .from("communication_logs")
      .select("message_timestamp")
      .eq("trainer_id", authUserId)
      .eq("whatsapp_client_id", clientId)
      .eq("direction", "INBOUND")
      .order("message_timestamp", { ascending: false })
      .limit(1)
      .maybeSingle(),
    normalizedPhone
      ? db
          .from("incoming_webhook_logs")
          .select("received_at")
          .eq("client_phone", normalizedPhone)
          .order("received_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    normalizedPhone
      ? db
          .from("whatsapp_webhook_events")
          .select("received_at")
          .eq("trainer_id", authUserId)
          .eq("client_phone", normalizedPhone)
          .eq("event_category", "message")
          .order("received_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const latestInboundAt = latestIso([
    (communication.data as { message_timestamp?: string } | null)?.message_timestamp,
    (incomingWebhook.data as { received_at?: string } | null)?.received_at,
    (webhookEvent.data as { received_at?: string } | null)?.received_at,
  ])
  const openUntil = latestInboundAt ? addHours(latestInboundAt, 24) : null
  const isOpen = Boolean(openUntil && openUntil.getTime() > Date.now())

  if (!isOpen || !openUntil) {
    return {
      isOpen: false,
      openUntilIso: null,
      openUntilLabel: null,
      message: "WhatsApp window closed. Send an approved template first.",
    }
  }

  const openUntilLabel = formatInTimeZone(openUntil, timeZone)
  return {
    isOpen: true,
    openUntilIso: openUntil.toISOString(),
    openUntilLabel,
    message: `WhatsApp window open until ${openUntilLabel}`,
  }
}

export async function getDailyCheckInReadiness(input: {
  authUserId: string
  clientId: string
  timeZone: string
  trainerName?: string | null
  businessName?: string | null
}): Promise<DailyCheckInReadiness> {
  const db = getWhatsAppServiceDb()
  const todayKey = dateKeyInTimeZone(new Date(), input.timeZone)
  const reasons: string[] = []

  const [{ data: profile }, { data: trainer }, { data: credential }, { data: client }, { data: recentTemplates }] =
    await Promise.all([
      db
        .from("profiles")
        .select("role, status")
        .eq("id", input.authUserId)
        .maybeSingle(),
      db
        .from("trainers")
        .select("account_status, onboarding_status, business_name")
        .eq("auth_user_id", input.authUserId)
        .maybeSingle(),
      db
        .from("trainer_waba_credentials")
        .select("id")
        .eq("trainer_id", input.authUserId)
        .eq("status", "connected")
        .not("phone_number_id", "is", null)
        .not("waba_id", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("trainer_whatsapp_clients")
        .select("client_id, client_name, status, normalized_whatsapp_number, whatsapp_number")
        .eq("trainer_id", input.authUserId)
        .eq("client_id", input.clientId)
        .neq("status", "archived")
        .maybeSingle(),
      db
        .from("communication_logs")
        .select("message_timestamp, metadata")
        .eq("trainer_id", input.authUserId)
        .eq("whatsapp_client_id", input.clientId)
        .eq("direction", "OUTBOUND")
        .eq("message_type", "TEMPLATE")
        .order("message_timestamp", { ascending: false })
        .limit(50),
    ])

  const trainerRow = trainer as { account_status?: string | null; onboarding_status?: string | null; business_name?: string | null } | null
  const clientRow = client as {
    client_id: string
    client_name: string
    status: string
    normalized_whatsapp_number: string | null
    whatsapp_number: string | null
  } | null
  const templateName = getWhatsAppTemplateName("daily_checkin")
  const logs = (recentTemplates ?? []) as Array<{ message_timestamp: string | null; metadata: Record<string, unknown> | null }>
  const alreadySentToday = logs.some((log) => {
    const metadata = log.metadata ?? {}
    const loggedTemplate = metadata.template_id ?? metadata.template_name
    if (loggedTemplate !== templateName) return false
    if (metadata.daily_checkin_date === todayKey) return true
    return log.message_timestamp ? dateKeyInTimeZone(new Date(log.message_timestamp), input.timeZone) === todayKey : false
  })

  if ((profile as { role?: string | null } | null)?.role !== "trainer" || (profile as { status?: string | null } | null)?.status !== "active") {
    reasons.push("Trainer account is not active.")
  }
  if (!trainerRow || trainerRow.account_status !== "active" || trainerRow.onboarding_status !== "active") {
    reasons.push("Trainer onboarding/account status is not active.")
  }
  if (!credential) {
    reasons.push("WhatsApp sender is not connected.")
  }
  if (!clientRow || clientRow.status !== "active") {
    reasons.push("Client is not an active WhatsApp-only client.")
  }
  if (clientRow && !normalizeWhatsAppPhone(clientRow.normalized_whatsapp_number ?? clientRow.whatsapp_number)) {
    reasons.push("Client WhatsApp number is invalid.")
  }
  if (alreadySentToday) {
    reasons.push("Daily restart template already logged for this trainer-local date.")
  }

  return {
    ready: reasons.length === 0,
    reasons,
    template: getDailyCheckInTemplatePreview({
      clientName: clientRow?.client_name,
      trainerName: input.trainerName,
      businessName: input.businessName ?? trainerRow?.business_name,
    }),
    trainerLocalDate: todayKey,
    alreadySentToday,
  }
}

async function getOwnedActiveWhatsAppClient(input: {
  authUserId: string
  clientId: string
}): Promise<{
  client_id: string
  trainer_id: string
  client_name: string
  normalized_whatsapp_number: string | null
  whatsapp_number: string | null
  status: string
} | null> {
  const db = getWhatsAppServiceDb()
  const { data, error } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id, trainer_id, client_name, normalized_whatsapp_number, whatsapp_number, status")
    .eq("trainer_id", input.authUserId)
    .eq("client_id", input.clientId)
    .neq("status", "archived")
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to verify WhatsApp client access: ${error.message}`)
  }

  return (data as {
    client_id: string
    trainer_id: string
    client_name: string
    normalized_whatsapp_number: string | null
    whatsapp_number: string | null
    status: string
  } | null) ?? null
}

function mapMessageDraft(row: {
  id: string
  trainer_id: string
  whatsapp_client_id: string
  title: string | null
  body: string
  purpose: string | null
  updated_at: string | null
} | null): TrainerClientMessageDraft | null {
  if (!row) return null
  return {
    id: row.id,
    trainer_id: row.trainer_id,
    whatsapp_client_id: row.whatsapp_client_id,
    title: row.title,
    body: row.body,
    purpose: "diet_followup",
    updated_at: row.updated_at,
  }
}

export async function getTrainerClientMessageDraft(
  authUserId: string,
  clientId: string,
): Promise<TrainerClientMessageDraft | null> {
  const ownedClient = await getOwnedActiveWhatsAppClient({ authUserId, clientId })
  if (!ownedClient) return null

  const db = getWhatsAppServiceDb()
  const { data, error } = await db
    .from("trainer_client_message_drafts")
    .select("id, trainer_id, whatsapp_client_id, title, body, purpose, updated_at")
    .eq("trainer_id", authUserId)
    .eq("whatsapp_client_id", clientId)
    .eq("purpose", "diet_followup")
    .maybeSingle()

  if (isMissingDraftTableError(error)) return null
  if (error) {
    throw new Error(`Failed to load client message draft: ${error.message}`)
  }

  return mapMessageDraft(data as Parameters<typeof mapMessageDraft>[0])
}

export async function saveTrainerClientMessageDraft(
  input: SaveTrainerClientMessageDraftInput,
): Promise<TrainerClientMessageResult> {
  const normalized = normalizeDraftInput(input)
  if (normalized.error) return { ok: false, message: normalized.error }

  const ownedClient = await getOwnedActiveWhatsAppClient({ authUserId: input.authUserId, clientId: input.clientId })
  if (!ownedClient) return { ok: false, message: "Client not found." }

  const db = getWhatsAppServiceDb()
  const { data, error } = await db
    .from("trainer_client_message_drafts")
    .upsert({
      trainer_id: input.authUserId,
      whatsapp_client_id: input.clientId,
      title: normalized.title,
      body: normalized.body,
      purpose: "diet_followup",
      updated_at: new Date().toISOString(),
    }, { onConflict: "trainer_id,whatsapp_client_id,purpose" })
    .select("id, trainer_id, whatsapp_client_id, title, body, purpose, updated_at")
    .maybeSingle()

  if (isMissingDraftTableError(error)) {
    return { ok: false, message: "Draft storage migration is not applied yet." }
  }
  if (error) {
    return { ok: false, message: error.message }
  }

  return {
    ok: true,
    message: "Draft saved.",
    draft: mapMessageDraft(data as Parameters<typeof mapMessageDraft>[0]),
  }
}

async function verifyTrainerConnectedSender(authUserId: string): Promise<boolean> {
  const db = getWhatsAppServiceDb()
  const { data } = await db
    .from("trainer_waba_credentials")
    .select("id")
    .eq("trainer_id", authUserId)
    .eq("status", "connected")
    .not("phone_number_id", "is", null)
    .not("waba_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return Boolean(data)
}

export async function sendTrainerClientCustomMessage(
  input: SendTrainerClientCustomMessageInput,
): Promise<TrainerClientMessageResult> {
  const normalized = normalizeDraftInput(input)
  if (normalized.error) return { ok: false, message: normalized.error }

  const ownedClient = await getOwnedActiveWhatsAppClient({ authUserId: input.authUserId, clientId: input.clientId })
  if (!ownedClient) return { ok: false, message: "Client not found." }
  if (ownedClient.status !== "active") return { ok: false, message: "Only active WhatsApp clients can receive custom messages." }

  const normalizedPhone = normalizeWhatsAppPhone(ownedClient.normalized_whatsapp_number ?? ownedClient.whatsapp_number)
  if (!normalizedPhone) return { ok: false, message: "Client WhatsApp number is invalid." }

  const hasConnectedSender = await verifyTrainerConnectedSender(input.authUserId)
  if (!hasConnectedSender) return { ok: false, message: "Connect your WhatsApp sender before sending custom messages." }

  const windowStatus = await getTrainerWhatsAppClientWindowStatus(input.authUserId, input.clientId, "Asia/Kolkata")
  if (!windowStatus.isOpen) {
    return { ok: false, message: CUSTOM_MESSAGE_WINDOW_CLOSED_MESSAGE }
  }

  const saveResult = await saveTrainerClientMessageDraft(input)
  if (!saveResult.ok) return saveResult

  const text = normalized.title ? `${normalized.title}\n\n${normalized.body}` : normalized.body
  try {
    const result = await sendFreeMessage(input.authUserId, normalizedPhone, text)
    const db = getWhatsAppServiceDb()
    await db
      .from("communication_logs")
      .insert({
        trainer_id: input.authUserId,
        client_id: null,
        whatsapp_client_id: input.clientId,
        direction: "OUTBOUND",
        message_type: "TEXT",
        wam_id: result.wamId,
        message_timestamp: new Date().toISOString(),
        delivery_status: "sent",
        metadata: {
          custom_message: true,
          purpose: "diet_followup",
          title: normalized.title,
          message_preview: normalized.body.slice(0, 280),
        },
      })

    return {
      ok: true,
      message: "Custom message sent.",
      draft: saveResult.draft ?? null,
      wamId: result.wamId,
    }
  } catch (error) {
    if (error instanceof WindowClosedError) {
      return { ok: false, message: CUSTOM_MESSAGE_WINDOW_CLOSED_MESSAGE, draft: saveResult.draft ?? null }
    }
    if (error instanceof Error) {
      return { ok: false, message: error.message, draft: saveResult.draft ?? null }
    }
    return { ok: false, message: "Custom message could not be sent.", draft: saveResult.draft ?? null }
  }
}

export async function listTrainerWhatsAppClients(authUserId: string): Promise<TrainerWhatsAppClientRow[]> {
  const db = getWhatsAppServiceDb()
  const { data: clients, error } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id, trainer_id, client_name, whatsapp_number, normalized_whatsapp_number, status, onboarding_message_status, created_at, updated_at")
    .eq("trainer_id", authUserId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Failed to load WhatsApp clients: ${error.message}`)
  }

  const rows = (clients ?? []) as Array<Omit<TrainerWhatsAppClientRow, "onboarding_failure_reason">>
  const failedClientIds = rows
    .filter((row) => row.onboarding_message_status === "failed")
    .map((row) => row.client_id)

  const failureReasons = new Map<string, string>()
  if (failedClientIds.length > 0) {
    const { data: logs } = await db
      .from("communication_logs")
      .select("whatsapp_client_id, metadata, created_at")
      .eq("trainer_id", authUserId)
      .in("whatsapp_client_id", failedClientIds)
      .eq("message_type", "TEMPLATE")
      .order("created_at", { ascending: false })

    for (const log of (logs ?? []) as Array<{ whatsapp_client_id: string | null; metadata: Record<string, unknown> | null }>) {
      if (!log.whatsapp_client_id || failureReasons.has(log.whatsapp_client_id)) continue
      const reason = log.metadata?.onboarding_error
      if (typeof reason === "string" && reason.trim()) {
        failureReasons.set(log.whatsapp_client_id, reason.trim())
      }
    }
  }

  return rows.map((row) => ({
    ...row,
    whatsapp_number: maskWhatsAppNumber(row.whatsapp_number ?? row.normalized_whatsapp_number),
    onboarding_failure_reason: failureReasons.get(row.client_id) ?? null,
  }))
}

export async function getTrainerWhatsAppClientDetail(
  authUserId: string,
  clientId: string,
): Promise<TrainerWhatsAppClientDetail | null> {
  const db = getWhatsAppServiceDb()
  const { data, error } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id, trainer_id, client_name, whatsapp_number, normalized_whatsapp_number, status, onboarding_message_status, goal, diet_notes, meal_reminder_times, workout_time, automation_enabled, created_at, updated_at")
    .eq("trainer_id", authUserId)
    .eq("client_id", clientId)
    .neq("status", "archived")
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load WhatsApp client: ${error.message}`)
  }

  const row = data as {
    client_id: string
    trainer_id: string
    client_name: string
    whatsapp_number: string | null
    normalized_whatsapp_number: string | null
    status: string
    onboarding_message_status: string
    goal: string | null
    diet_notes: string | null
    meal_reminder_times: unknown
    workout_time: string | null
    automation_enabled: boolean | null
    created_at: string
    updated_at: string
  } | null

  if (!row) return null

  const normalizedPhone = normalizeWhatsAppPhone(row.normalized_whatsapp_number ?? row.whatsapp_number)
  const phoneLock = await getPhoneEditLock({
    authUserId,
    clientId: row.client_id,
    normalizedPhone,
    onboardingStatus: row.onboarding_message_status,
  })

  return {
    client_id: row.client_id,
    trainer_id: row.trainer_id,
    client_name: row.client_name,
    whatsapp_number: row.whatsapp_number,
    normalized_whatsapp_number: row.normalized_whatsapp_number,
    status: row.status,
    onboarding_message_status: row.onboarding_message_status,
    goal: row.goal,
    diet_notes: row.diet_notes,
    meal_reminder_times: normalizeReminderTimes(row.meal_reminder_times),
    workout_time: row.workout_time,
    automation_enabled: row.automation_enabled ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    phone_edit_locked: phoneLock.locked,
    phone_edit_lock_reason: phoneLock.reason,
  }
}

export async function getTrainerWhatsAppClientDashboard(
  authUserId: string,
  clientId: string,
): Promise<TrainerWhatsAppClientDashboard> {
  const emptyDashboard: TrainerWhatsAppClientDashboard = {
    meals: [],
    todaysMeals: [],
    media: [],
    voiceNotes: [],
    weeklyReportsCount: 0,
    monthlyReportsCount: 0,
    communicationCount: 0,
    pendingReviewCount: 0,
    lastActivityAt: null,
    dataSourceWarnings: [],
  }

  const db = getWhatsAppServiceDb()
  const { data: ownedClient, error: ownedClientError } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id")
    .eq("trainer_id", authUserId)
    .eq("client_id", clientId)
    .neq("status", "archived")
    .maybeSingle()

  if (ownedClientError) {
    throw new Error(`Failed to verify WhatsApp client access: ${ownedClientError.message}`)
  }

  if (!ownedClient) {
    return emptyDashboard
  }

  const [
    mealsResult,
    mediaResult,
    voiceNotesResult,
    weeklyReportsResult,
    monthlyReportsResult,
    communicationsCountResult,
  ] = await Promise.allSettled([
    db
      .from("food_logs")
      .select("id, logged_at, notes, calories, protein_g, carbs_g, fat_g, review_state, verification_status")
      .eq("trainer_id", authUserId)
      .eq("whatsapp_client_id", clientId)
      .order("logged_at", { ascending: false })
      .limit(40),
    db
      .from("communication_logs")
      .select("id, message_timestamp, message_type, metadata")
      .eq("trainer_id", authUserId)
      .eq("whatsapp_client_id", clientId)
      .in("message_type", ["IMAGE", "AUDIO", "VOICE", "VIDEO", "DOCUMENT", "MEDIA"])
      .order("message_timestamp", { ascending: false })
      .limit(30),
    db
      .from("voice_notes")
      .select("id, created_at, processing_status, transcript")
      .eq("whatsapp_client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(20),
    countWhatsAppReports({ table: "weekly_reports", clientId }),
    countWhatsAppReports({ table: "monthly_reports", clientId }),
    db
      .from("communication_logs")
      .select("id", { count: "exact", head: true })
      .eq("trainer_id", authUserId)
      .eq("whatsapp_client_id", clientId),
  ])

  const dataSourceWarnings = [
    resultWarning(mealsResult, "Food logs"),
    resultWarning(mediaResult, "Media messages"),
    resultWarning(voiceNotesResult, "Voice notes"),
    resultWarning(weeklyReportsResult, "Weekly reports"),
    resultWarning(monthlyReportsResult, "Monthly reports"),
    resultWarning(communicationsCountResult, "Message count"),
  ].filter((warning): warning is string => Boolean(warning))

  const meals = mealsResult.status === "fulfilled" && !mealsResult.value.error
    ? ((mealsResult.value.data ?? []) as Array<{
        id: string
        logged_at: string
        notes: string | null
        calories: unknown
        protein_g: unknown
        carbs_g: unknown
        fat_g: unknown
        review_state: string | null
        verification_status: string | null
      }>).map((meal) => ({
        id: meal.id,
        logged_at: meal.logged_at,
        notes: meal.notes,
        calories: numericValue(meal.calories),
        protein_g: numericValue(meal.protein_g),
        carbs_g: numericValue(meal.carbs_g),
        fat_g: numericValue(meal.fat_g),
        review_state: meal.review_state,
        verification_status: meal.verification_status,
      }))
    : []

  const media = mediaResult.status === "fulfilled" && !mediaResult.value.error
    ? ((mediaResult.value.data ?? []) as Array<{
        id: string
        message_timestamp: string
        message_type: string
        metadata: Record<string, unknown> | null
      }>).map((message) => ({
        id: message.id,
        message_timestamp: message.message_timestamp,
        message_type: message.message_type,
        media_kind: metadataText(message.metadata, ["media_kind", "classification", "kind"]),
        caption: metadataText(message.metadata, ["caption", "text", "transcript"]),
        has_media_url: metadataHasMediaUrl(message.metadata),
      }))
    : []

  const voiceNotes = voiceNotesResult.status === "fulfilled" && !voiceNotesResult.value.error
    ? ((voiceNotesResult.value.data ?? []) as Array<{
        id: string
        created_at: string
        processing_status: string | null
        transcript: string | null
      }>).map((note) => ({
        id: note.id,
        created_at: note.created_at,
        processing_status: note.processing_status,
        transcript: note.transcript,
      }))
    : []

  const todayKey = new Date().toISOString().slice(0, 10)
  const todaysMeals = meals.filter((meal) => meal.logged_at.slice(0, 10) === todayKey)
  const pendingReviewCount = meals.filter(
    (meal) => isPendingReviewStatus(meal.review_state) || isPendingReviewStatus(meal.verification_status),
  ).length + voiceNotes.filter((note) => isPendingReviewStatus(note.processing_status)).length

  const timestamps = [
    ...meals.map((meal) => meal.logged_at),
    ...media.map((item) => item.message_timestamp),
    ...voiceNotes.map((note) => note.created_at),
  ].filter(Boolean)

  return {
    meals,
    todaysMeals,
    media,
    voiceNotes,
    weeklyReportsCount: weeklyReportsResult.status === "fulfilled" && !weeklyReportsResult.value.error
      ? weeklyReportsResult.value.count ?? 0
      : 0,
    monthlyReportsCount: monthlyReportsResult.status === "fulfilled" && !monthlyReportsResult.value.error
      ? monthlyReportsResult.value.count ?? 0
      : 0,
    communicationCount: communicationsCountResult.status === "fulfilled" && !communicationsCountResult.value.error
      ? communicationsCountResult.value.count ?? 0
      : 0,
    pendingReviewCount,
    lastActivityAt: timestamps.sort((a, b) => b.localeCompare(a))[0] ?? null,
    dataSourceWarnings,
  }
}

export async function getTrainerWhatsAppClientCount(authUserId: string): Promise<number> {
  const db = getWhatsAppServiceDb()
  const { count, error } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id", { count: "exact", head: true })
    .eq("trainer_id", authUserId)
    .eq("status", "active")

  if (error) {
    throw new Error(`Failed to count WhatsApp clients: ${error.message}`)
  }

  return count ?? 0
}

async function verifyAddClientEligibility(authUserId: string, normalizedPhone: string): Promise<AddTrainerWhatsAppClientResult> {
  const db = getWhatsAppServiceDb()
  const [{ data: profile }, { data: trainer }, { data: credential }] = await Promise.all([
    db
      .from("profiles")
      .select("role, status")
      .eq("id", authUserId)
      .maybeSingle(),
    db
      .from("trainers")
      .select("account_status, onboarding_status, subscription_plan, max_clients")
      .eq("auth_user_id", authUserId)
      .maybeSingle(),
    db
      .from("trainer_waba_credentials")
      .select("id")
      .eq("trainer_id", authUserId)
      .eq("status", "connected")
      .not("phone_number_id", "is", null)
      .not("waba_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (profile?.role !== "trainer") {
    return { ok: false, message: "Only trainer accounts can add WhatsApp clients." }
  }

  if (profile?.status !== "active") {
    return { ok: false, message: "Your trainer account is not active." }
  }

  if (!trainer) {
    return { ok: false, message: "Trainer profile not found." }
  }

  if (trainer.account_status !== "active") {
    return { ok: false, message: "Your trainer account is restricted. Contact NutriRelay support." }
  }

  if (trainer.onboarding_status !== "active") {
    return { ok: false, message: "Complete trainer onboarding before adding clients." }
  }

  if (!credential) {
    return { ok: false, message: "Connect your WhatsApp sender before adding clients." }
  }

  const activeClientCount = await getTrainerWhatsAppClientCount(authUserId)
  const planLimit = getPlanClientLimit(trainer.subscription_plan)
  const explicitLimit = Number(trainer.max_clients)
  const clientLimit = explicitLimit > 0 ? explicitLimit : planLimit

  if (clientLimit !== null && activeClientCount >= clientLimit) {
    return { ok: false, message: "You have reached your plan's active client limit." }
  }

  const { data: duplicate } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id")
    .eq("trainer_id", authUserId)
    .eq("normalized_whatsapp_number", normalizedPhone)
    .neq("status", "archived")
    .limit(1)
    .maybeSingle()

  if (duplicate) {
    return { ok: false, message: "A client with this WhatsApp number already exists." }
  }

  return { ok: true, message: "Eligible." }
}

async function verifyTrainerCanSendOnboarding(authUserId: string): Promise<SendTrainerWhatsAppClientOnboardingResult> {
  const db = getWhatsAppServiceDb()
  const [{ data: profile }, { data: trainer }, { data: credential }] = await Promise.all([
    db
      .from("profiles")
      .select("role, status")
      .eq("id", authUserId)
      .maybeSingle(),
    db
      .from("trainers")
      .select("account_status, onboarding_status")
      .eq("auth_user_id", authUserId)
      .maybeSingle(),
    db
      .from("trainer_waba_credentials")
      .select("id")
      .eq("trainer_id", authUserId)
      .eq("status", "connected")
      .not("phone_number_id", "is", null)
      .not("waba_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (profile?.role !== "trainer") {
    return { ok: false, message: "Only trainer accounts can send onboarding templates." }
  }

  if (profile?.status !== "active") {
    return { ok: false, message: "Your trainer account is not active." }
  }

  if (!trainer) {
    return { ok: false, message: "Trainer profile not found." }
  }

  if (trainer.account_status !== "active") {
    return { ok: false, message: "Your trainer account is restricted. Contact NutriRelay support." }
  }

  if (trainer.onboarding_status !== "active") {
    return { ok: false, message: "Complete trainer onboarding before sending onboarding templates." }
  }

  if (!credential) {
    return { ok: false, message: "Connect your WhatsApp sender before sending onboarding templates." }
  }

  return { ok: true, message: "Eligible." }
}

async function logOnboardingTemplate(input: {
  authUserId: string
  clientId: string
  wamId: string | null
  deliveryStatus: "sent" | "failed"
  templateId: TemplateId
  error?: string
}) {
  const db = getWhatsAppServiceDb()
  await db
    .from("communication_logs")
    .insert({
      trainer_id: input.authUserId,
      client_id: null,
      whatsapp_client_id: input.clientId,
      direction: "OUTBOUND",
      message_type: "TEMPLATE",
      wam_id: input.wamId,
      message_timestamp: new Date().toISOString(),
      delivery_status: input.deliveryStatus,
      metadata: {
        template_id: input.templateId,
        onboarding: true,
        ...(input.error ? { onboarding_error: input.error } : {}),
      },
    })
}

async function getTrainerTemplateIdentity(authUserId: string): Promise<{
  trainerName: string
  businessName: string
}> {
  const db = getWhatsAppServiceDb()
  const [{ data: trainer }, { data: profile }] = await Promise.all([
    db
      .from("trainers")
      .select("business_name")
      .eq("auth_user_id", authUserId)
      .maybeSingle(),
    db
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", authUserId)
      .maybeSingle(),
  ])

  const businessName = templateValue(
    (trainer as { business_name?: string | null } | null)?.business_name,
    DEFAULT_BUSINESS_NAME,
  )
  const profileRow = profile as { display_name?: string | null; full_name?: string | null } | null

  return {
    trainerName: templateValue(profileRow?.display_name ?? profileRow?.full_name, businessName),
    businessName,
  }
}

async function sendOnboardingTemplate(input: {
  authUserId: string
  clientId: string
  clientName: string
  normalizedPhone: string
  successMessage?: string
  sendFailureMessage?: string
  sendFailureOk?: boolean
}): Promise<AddTrainerWhatsAppClientResult> {
  const db = getWhatsAppServiceDb()
  const templateId = getWhatsAppTemplateName("onboarding")
  const identity = await getTrainerTemplateIdentity(input.authUserId)
  const templateParams = [
    templateValue(input.clientName),
    identity.trainerName,
    identity.businessName,
  ] satisfies [string, string, string]

  await db
    .from("trainer_whatsapp_clients")
    .update({ onboarding_message_status: "pending" })
    .eq("trainer_id", input.authUserId)
    .eq("client_id", input.clientId)

  try {
    const result = await sendTemplateMessage(input.authUserId, input.normalizedPhone, templateId, templateParams)
    await db
      .from("trainer_whatsapp_clients")
      .update({ onboarding_message_status: "sent" })
      .eq("trainer_id", input.authUserId)
      .eq("client_id", input.clientId)
    await logOnboardingTemplate({
      authUserId: input.authUserId,
      clientId: input.clientId,
      wamId: result.wamId,
      deliveryStatus: "sent",
      templateId,
    })

    return {
      ok: true,
      clientId: input.clientId,
      wamId: result.wamId,
      message: input.successMessage ?? "Client added and onboarding template sent.",
    }
  } catch (error) {
    const failureReason = safeFailureReason(error)
    await db
      .from("trainer_whatsapp_clients")
      .update({ onboarding_message_status: "failed" })
      .eq("trainer_id", input.authUserId)
      .eq("client_id", input.clientId)
    await logOnboardingTemplate({
      authUserId: input.authUserId,
      clientId: input.clientId,
      wamId: null,
      deliveryStatus: "failed",
      templateId,
      error: failureReason,
    })

    return {
      ok: input.sendFailureOk ?? true,
      clientId: input.clientId,
      message: input.sendFailureMessage ?? "Client saved. Onboarding template not sent because template is not ready.",
    }
  }
}

export async function addTrainerWhatsAppClient(input: AddTrainerWhatsAppClientInput): Promise<AddTrainerWhatsAppClientResult> {
  const normalizedPhone = normalizeWhatsAppPhone(input.whatsappNumber)
  if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 15) {
    return { ok: false, message: "Enter a valid WhatsApp phone number with country code." }
  }

  const eligibility = await verifyAddClientEligibility(input.authUserId, normalizedPhone)
  if (!eligibility.ok) return eligibility

  const db = getWhatsAppServiceDb()
  const { data: inserted, error: insertError } = await db
    .from("trainer_whatsapp_clients")
    .insert({
      trainer_id: input.authUserId,
      client_name: input.clientName,
      whatsapp_number: input.whatsappNumber,
      normalized_whatsapp_number: normalizedPhone,
      goal: input.goal,
      diet_notes: input.dietNotes,
      automation_enabled: true,
      status: "active",
      onboarding_message_status: "not_sent",
    })
    .select("client_id")
    .maybeSingle()

  if (insertError) {
    return { ok: false, message: insertError.message }
  }

  const clientId = (inserted as { client_id: string } | null)?.client_id
  if (!clientId) {
    return { ok: false, message: "Client could not be saved." }
  }

  return {
    ok: true,
    clientId,
    message: "Client saved. Review the onboarding template preview before sending.",
  }
}

export async function sendTrainerWhatsAppClientOnboarding(
  authUserId: string,
  clientId: string,
): Promise<SendTrainerWhatsAppClientOnboardingResult> {
  const eligibility = await verifyTrainerCanSendOnboarding(authUserId)
  if (!eligibility.ok) return eligibility

  const db = getWhatsAppServiceDb()
  const { data: client, error } = await db
    .from("trainer_whatsapp_clients")
    .select("client_id, client_name, normalized_whatsapp_number, whatsapp_number, status, onboarding_message_status")
    .eq("trainer_id", authUserId)
    .eq("client_id", clientId)
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message }
  }

  const row = client as {
    client_id: string
    client_name: string
    normalized_whatsapp_number: string | null
    whatsapp_number: string | null
    status: string
    onboarding_message_status: string
  } | null

  if (!row) {
    return { ok: false, message: "Client not found." }
  }

  if (row.status !== "active") {
    return { ok: false, message: "Only active clients can receive onboarding templates." }
  }

  if (row.onboarding_message_status !== "not_sent" && row.onboarding_message_status !== "failed") {
    return { ok: false, message: "Onboarding template has already been sent or is pending." }
  }

  const normalizedPhone = normalizeWhatsAppPhone(row.normalized_whatsapp_number ?? row.whatsapp_number)
  if (!normalizedPhone) {
    return { ok: false, message: "Client WhatsApp number is invalid." }
  }

  const result = await sendOnboardingTemplate({
    authUserId,
    clientId: row.client_id,
    clientName: row.client_name,
    normalizedPhone,
    successMessage: "Onboarding template sent.",
    sendFailureMessage: "Onboarding template failed to send. No free-form message was sent.",
    sendFailureOk: false,
  })

  return result
}

export async function updateTrainerWhatsAppClient(
  input: UpdateTrainerWhatsAppClientInput,
): Promise<UpdateTrainerWhatsAppClientResult> {
  const db = getWhatsAppServiceDb()
  const detail = await getTrainerWhatsAppClientDetail(input.authUserId, input.clientId)
  if (!detail) {
    return { ok: false, message: "Client not found." }
  }

  const clientName = input.clientName.trim()
  if (clientName.length < 2) {
    return { ok: false, message: "Client name must be at least 2 characters." }
  }
  if (clientName.length > 120) {
    return { ok: false, message: "Client name is too long." }
  }
  if (!isEditableStatus(input.status)) {
    return { ok: false, message: "Client status is invalid." }
  }

  const goal = input.goal?.trim() || null
  const dietNotes = input.dietNotes?.trim() || null
  if (goal && goal.length > 500) {
    return { ok: false, message: "Goal is too long." }
  }
  if (dietNotes && dietNotes.length > 1000) {
    return { ok: false, message: "Diet notes are too long." }
  }

  const updates: Record<string, unknown> = {
    client_name: clientName,
    goal,
    diet_notes: dietNotes,
    meal_reminder_times: input.mealReminderTimes,
    workout_time: input.workoutTime,
    automation_enabled: input.automationEnabled,
    status: input.status,
  }

  const currentPhone = normalizeWhatsAppPhone(detail.normalized_whatsapp_number ?? detail.whatsapp_number)
  const nextPhone = normalizeWhatsAppPhone(input.whatsappNumber)
  const phoneChanged = nextPhone !== currentPhone

  if (phoneChanged) {
    if (detail.phone_edit_locked) {
      return {
        ok: false,
        message: detail.phone_edit_lock_reason ?? "Phone number is locked after onboarding or client activity.",
      }
    }

    if (!nextPhone || nextPhone.length < 10 || nextPhone.length > 15) {
      return { ok: false, message: "Enter a valid WhatsApp phone number with country code." }
    }

    const { data: duplicate } = await db
      .from("trainer_whatsapp_clients")
      .select("client_id")
      .eq("trainer_id", input.authUserId)
      .eq("normalized_whatsapp_number", nextPhone)
      .neq("status", "archived")
      .neq("client_id", input.clientId)
      .limit(1)
      .maybeSingle()

    if (duplicate) {
      return { ok: false, message: "A client with this WhatsApp number already exists." }
    }

    updates.whatsapp_number = input.whatsappNumber
    updates.normalized_whatsapp_number = nextPhone
  }

  const { data: updated, error } = await db
    .from("trainer_whatsapp_clients")
    .update(updates)
    .eq("trainer_id", input.authUserId)
    .eq("client_id", input.clientId)
    .neq("status", "archived")
    .select("client_id")
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message }
  }

  if (!updated) {
    return { ok: false, message: "Client details could not be updated." }
  }

  return { ok: true, message: "Client details updated." }
}
