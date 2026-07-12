import { createClient } from "@supabase/supabase-js"

export const NO_RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000

export type ClientAutomationState =
  | "active"
  | "paused_no_response"
  | "resumed_on_inbound"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

interface ClientIdentity {
  clientId: string
  phoneNumber: string | null
}

async function resolveClientIdentity(clientId: string): Promise<ClientIdentity | null> {
  const db = getDb()
  const { data } = await db
    .from("profiles")
    .select("id, phone_number")
    .eq("id", clientId)
    .limit(1)
    .maybeSingle()

  if (!data?.id) {
    return null
  }

  return {
    clientId: data.id,
    phoneNumber: data.phone_number ?? null,
  }
}

export async function getLatestInboundAtForPhone(phoneNumber: string | null): Promise<string | null> {
  if (!phoneNumber) return null

  const db = getDb()
  const { data } = await db
    .from("incoming_webhook_logs")
    .select("received_at")
    .eq("client_phone", phoneNumber)
    .eq("status", "SUCCESS")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.received_at ?? null
}

export async function getLatestPauseMarkerAt(clientId: string): Promise<string | null> {
  const db = getDb()
  const { data } = await db
    .from("strike_log")
    .select("issued_at")
    .eq("profile_id", clientId)
    .ilike("reason", "%ghosting threshold exceeded%")
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.issued_at ?? null
}

export function deriveClientAutomationState(input: {
  lastInboundAt: string | null
  lastPauseMarkerAt: string | null
  now?: Date
}): ClientAutomationState {
  const now = input.now ?? new Date()

  if (!input.lastInboundAt) {
    return "paused_no_response"
  }

  const lastInboundTime = new Date(input.lastInboundAt).getTime()
  if (!Number.isFinite(lastInboundTime)) {
    return "paused_no_response"
  }

  if (now.getTime() - lastInboundTime >= NO_RESPONSE_WINDOW_MS) {
    return "paused_no_response"
  }

  if (input.lastPauseMarkerAt) {
    const lastPauseTime = new Date(input.lastPauseMarkerAt).getTime()
    if (Number.isFinite(lastPauseTime) && lastInboundTime > lastPauseTime) {
      return "resumed_on_inbound"
    }
  }

  return "active"
}

export async function getClientAutomationState(clientId: string): Promise<ClientAutomationState> {
  const identity = await resolveClientIdentity(clientId)
  if (!identity) {
    return "paused_no_response"
  }

  const [lastInboundAt, lastPauseMarkerAt] = await Promise.all([
    getLatestInboundAtForPhone(identity.phoneNumber),
    getLatestPauseMarkerAt(clientId),
  ])

  return deriveClientAutomationState({
    lastInboundAt,
    lastPauseMarkerAt,
  })
}

export async function isAutomationPausedForClient(clientId: string): Promise<boolean> {
  return (await getClientAutomationState(clientId)) === "paused_no_response"
}
