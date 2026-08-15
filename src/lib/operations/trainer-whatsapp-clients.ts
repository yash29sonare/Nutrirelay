import { getPlanClientLimit } from "@/lib/entitlements"
import { getWhatsAppServiceDb, normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db"
import { sendTemplateMessage, type TemplateId } from "@/lib/whatsapp/send"

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
}

export interface SendTrainerWhatsAppClientOnboardingResult {
  ok: boolean
  message: string
  clientId?: string
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

const DEFAULT_ONBOARDING_TEMPLATE_ID: TemplateId = "hello_world"

function getConfiguredOnboardingTemplate(): TemplateId | null {
  const configured = process.env.WHATSAPP_ONBOARDING_TEMPLATE_ID?.trim()
  if (!configured) return DEFAULT_ONBOARDING_TEMPLATE_ID
  if (configured === "hello_world") return "hello_world"
  return null
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

function isEditableStatus(value: string): value is "active" | "inactive" {
  return value === "active" || value === "inactive"
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

async function sendOnboardingTemplate(input: {
  authUserId: string
  clientId: string
  normalizedPhone: string
  successMessage?: string
  templateUnavailableMessage?: string
  sendFailureMessage?: string
  sendFailureOk?: boolean
}): Promise<AddTrainerWhatsAppClientResult> {
  const db = getWhatsAppServiceDb()
  const templateId = getConfiguredOnboardingTemplate()

  if (!templateId) {
    await db
      .from("trainer_whatsapp_clients")
      .update({ onboarding_message_status: "not_sent" })
      .eq("trainer_id", input.authUserId)
      .eq("client_id", input.clientId)

    return {
      ok: input.sendFailureOk ?? true,
      clientId: input.clientId,
      message: input.templateUnavailableMessage ?? "Client saved. Onboarding template not sent because template is not ready.",
    }
  }

  await db
    .from("trainer_whatsapp_clients")
    .update({ onboarding_message_status: "pending" })
    .eq("trainer_id", input.authUserId)
    .eq("client_id", input.clientId)

  try {
    const result = await sendTemplateMessage(input.authUserId, input.normalizedPhone, templateId, [])
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

  return sendOnboardingTemplate({
    authUserId: input.authUserId,
    clientId,
    normalizedPhone,
  })
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
    .select("client_id, normalized_whatsapp_number, whatsapp_number, status, onboarding_message_status")
    .eq("trainer_id", authUserId)
    .eq("client_id", clientId)
    .maybeSingle()

  if (error) {
    return { ok: false, message: error.message }
  }

  const row = client as {
    client_id: string
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
    normalizedPhone,
    successMessage: "Onboarding template sent.",
    templateUnavailableMessage: "Onboarding template is not ready.",
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

  const { error } = await db
    .from("trainer_whatsapp_clients")
    .update(updates)
    .eq("trainer_id", input.authUserId)
    .eq("client_id", input.clientId)
    .neq("status", "archived")

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true, message: "Client details updated." }
}
