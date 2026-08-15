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
      ok: true,
      clientId: input.clientId,
      message: "Client saved. Onboarding template not sent because template is not ready.",
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
      message: "Client added and onboarding template sent.",
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
      ok: true,
      clientId: input.clientId,
      message: "Client saved. Onboarding template not sent because template is not ready.",
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
