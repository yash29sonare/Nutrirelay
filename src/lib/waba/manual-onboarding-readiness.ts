import { getWhatsAppServiceDb, normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db"

export type ManualWabaCredentialState = "missing" | "connected" | "disconnected" | "invalid" | "unknown"

export interface SafeWabaCredentialStatus {
  state: ManualWabaCredentialState
  status: string
  phoneNumberId: string | null
  wabaId: string | null
  businessAccountId: string | null
  phoneNumber: string | null
  updatedAt: string | null
  connectedAt: string | null
}

export interface ManualWabaClientReadiness {
  totalLinks: number
  activeLinks: number
  activeClients: number
  activeClientsWithPhone: number
  inactiveLinks: number
  readyClient: {
    id: string
    name: string
    phoneNumber: string
  } | null
}

export interface ManualWabaPilotSignals {
  hasCommunicationHistory: boolean
  hasFoodLogs: boolean
  hasStatusHistory: boolean
}

export interface ManualWabaOnboardingReadiness {
  trainerAccountExists: boolean
  trainerProfileExists: boolean
  credential: SafeWabaCredentialStatus
  clientReadiness: ManualWabaClientReadiness
  pilotSignals: ManualWabaPilotSignals
}

interface CredentialRow {
  phone_number_id: string | null
  waba_id: string | null
  business_account_id: string | null
  phone_number: string | null
  status: string | null
  updated_at: string | null
  connected_at: string | null
}

interface ClientProfileRow {
  id: string
  full_name: string | null
  phone_number: string | null
}

function normalizeCredentialState(status: string | null | undefined): ManualWabaCredentialState {
  const normalized = status?.trim().toLowerCase()
  if (!normalized) return "unknown"
  if (normalized === "connected") return "connected"
  if (normalized === "disconnected") return "disconnected"
  if (normalized === "invalid") return "invalid"
  return "unknown"
}

function missingCredential(): SafeWabaCredentialStatus {
  return {
    state: "missing",
    status: "missing",
    phoneNumberId: null,
    wabaId: null,
    businessAccountId: null,
    phoneNumber: null,
    updatedAt: null,
    connectedAt: null,
  }
}

export async function getManualWabaOnboardingReadiness(
  trainerId: string,
): Promise<ManualWabaOnboardingReadiness> {
  const db = getWhatsAppServiceDb()

  const [
    trainerProfileRes,
    credentialRes,
    trainerClientsRes,
  ] = await Promise.all([
    db
      .from("trainers")
      .select("auth_user_id")
      .eq("auth_user_id", trainerId)
      .limit(1)
      .maybeSingle(),
    db
      .from("trainer_waba_credentials")
      .select("phone_number_id, waba_id, business_account_id, phone_number, status, updated_at, connected_at")
      .eq("trainer_id", trainerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("trainer_clients")
      .select("client_id, is_active")
      .eq("trainer_id", trainerId),
  ])

  const trainerClientLinks = (trainerClientsRes.data ?? []) as Array<{
    client_id: string
    is_active: boolean | null
  }>
  const clientIds = [...new Set(trainerClientLinks.map((link) => link.client_id))]

  const { data: profiles } = clientIds.length > 0
    ? await db
      .from("profiles")
      .select("id, full_name, phone_number")
      .in("id", clientIds)
    : { data: [] as ClientProfileRow[] }

  const profileById = new Map(
    ((profiles ?? []) as ClientProfileRow[]).map((profile) => [profile.id, profile]),
  )

  const activeLinks = trainerClientLinks.filter((link) => link.is_active === true)
  const inactiveLinks = trainerClientLinks.filter((link) => link.is_active !== true)
  const activeClientProfiles = activeLinks
    .map((link) => profileById.get(link.client_id) ?? null)
    .filter((profile): profile is ClientProfileRow => Boolean(profile))
  const activeClientsWithPhone = activeClientProfiles.filter((profile) => Boolean(normalizeWhatsAppPhone(profile.phone_number)))
  const readyProfile = activeClientsWithPhone[0] ?? null

  const activeClientIds = activeLinks.map((link) => link.client_id)
  const [communicationRes, foodRes, statusRes] = await Promise.all([
    activeClientIds.length > 0
      ? db
        .from("communication_logs")
        .select("id")
        .eq("trainer_id", trainerId)
        .in("client_id", activeClientIds)
        .limit(1)
      : Promise.resolve({ data: [] }),
    activeClientIds.length > 0
      ? db
        .from("food_logs")
        .select("id")
        .eq("trainer_id", trainerId)
        .in("client_id", activeClientIds)
        .limit(1)
      : Promise.resolve({ data: [] }),
    db
      .from("whatsapp_message_statuses")
      .select("id")
      .eq("trainer_id", trainerId)
      .limit(1),
  ])

  const credentialRow = (credentialRes.data as CredentialRow | null) ?? null
  const credential = credentialRow
    ? {
      state: normalizeCredentialState(credentialRow.status),
      status: credentialRow.status ?? "unknown",
      phoneNumberId: credentialRow.phone_number_id,
      wabaId: credentialRow.waba_id,
      businessAccountId: credentialRow.business_account_id,
      phoneNumber: credentialRow.phone_number,
      updatedAt: credentialRow.updated_at,
      connectedAt: credentialRow.connected_at,
    }
    : missingCredential()

  return {
    trainerAccountExists: true,
    trainerProfileExists: Boolean(trainerProfileRes.data),
    credential,
    clientReadiness: {
      totalLinks: trainerClientLinks.length,
      activeLinks: activeLinks.length,
      activeClients: activeClientProfiles.length,
      activeClientsWithPhone: activeClientsWithPhone.length,
      inactiveLinks: inactiveLinks.length,
      readyClient: readyProfile
        ? {
          id: readyProfile.id,
          name: readyProfile.full_name?.trim() || `Client ${readyProfile.id.slice(0, 8)}`,
          phoneNumber: normalizeWhatsAppPhone(readyProfile.phone_number) ?? readyProfile.phone_number ?? "Not set",
        }
        : null,
    },
    pilotSignals: {
      hasCommunicationHistory: Boolean(communicationRes.data?.length),
      hasFoodLogs: Boolean(foodRes.data?.length),
      hasStatusHistory: Boolean(statusRes.data?.length),
    },
  }
}
