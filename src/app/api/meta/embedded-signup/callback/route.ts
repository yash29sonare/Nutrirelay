import { NextRequest, NextResponse } from "next/server"
import { requireTrainerContext, unauthorized } from "@/lib/api-auth"
import { getWhatsAppServiceDb, normalizeWhatsAppPhone } from "@/lib/whatsapp/service-db"

export const dynamic = "force-dynamic"

const DEFAULT_GRAPH_API_VERSION = "v20.0"
const EMBEDDED_SIGNUP_FINISH_EVENTS = new Set([
  "FINISH",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
])
const EMBEDDED_SIGNUP_MODES = new Set([
  "cloud_api",
  "business_app_onboarding",
])

interface EmbeddedSignupCallbackBody {
  code?: string
  waba_id?: string | null
  business_account_id?: string | null
  phone_number_id?: string | null
  phone_number?: string | null
  embedded_signup_event?: string | null
  embedded_signup_mode?: string | null
}

interface MetaTokenResponse {
  access_token?: string
  token_type?: string
  expires_in?: number
  error?: {
    message?: string
    type?: string
    code?: number
    fbtrace_id?: string
  }
}

function getMetaAppId(): string | null {
  return process.env.META_APP_ID?.trim()
    || process.env.NEXT_PUBLIC_META_APP_ID?.trim()
    || null
}

function getGraphApiVersion(): string {
  const configured = process.env.META_GRAPH_API_VERSION?.trim()
  return configured || DEFAULT_GRAPH_API_VERSION
}

function getConfigStatus() {
  return {
    appId: getMetaAppId(),
    appSecret: process.env.META_APP_SECRET?.trim() || null,
    configId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || null,
    graphApiVersion: getGraphApiVersion(),
  }
}

function notEnabledResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "EMBEDDED_SIGNUP_NOT_ENABLED",
      message: "Meta Embedded Signup callback is not enabled yet.",
    },
    {
      status: 501,
      headers: { "Cache-Control": "no-store" },
    },
  )
}

function safeId(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return /^[A-Za-z0-9_.:-]{3,128}$/.test(trimmed) ? trimmed : null
}

async function exchangeCodeForAccessToken(input: {
  code: string
  appId: string
  appSecret: string
  graphApiVersion: string
}): Promise<string> {
  const params = new URLSearchParams({
    client_id: input.appId,
    client_secret: input.appSecret,
    code: input.code,
  })

  const response = await fetch(
    `https://graph.facebook.com/${input.graphApiVersion}/oauth/access_token?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  )

  const json = (await response.json().catch(() => ({}))) as MetaTokenResponse
  if (!response.ok || !json.access_token) {
    throw new Error(json.error?.message || `Meta token exchange failed with HTTP ${response.status}`)
  }

  return json.access_token
}

export async function GET(): Promise<NextResponse> {
  const config = getConfigStatus()
  if (!config.appId || !config.appSecret || !config.configId) {
    return notEnabledResponse()
  }

  return NextResponse.json(
    {
      ok: true,
      configured: true,
      graph_api_version: config.graphApiVersion,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const config = getConfigStatus()
  if (!config.appId || !config.appSecret || !config.configId) {
    return notEnabledResponse()
  }

  let body: EmbeddedSignupCallbackBody
  try {
    body = (await req.json()) as EmbeddedSignupCallbackBody
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 })
  }

  const code = body.code?.trim()
  if (!code) {
    return NextResponse.json({ ok: false, error: "MISSING_CODE" }, { status: 400 })
  }

  const embeddedSignupEvent = safeId(body.embedded_signup_event)
  if (embeddedSignupEvent && !EMBEDDED_SIGNUP_FINISH_EVENTS.has(embeddedSignupEvent)) {
    return NextResponse.json({ ok: false, error: "INVALID_EMBEDDED_SIGNUP_EVENT" }, { status: 400 })
  }

  const embeddedSignupMode = safeId(body.embedded_signup_mode)
  if (embeddedSignupMode && !EMBEDDED_SIGNUP_MODES.has(embeddedSignupMode)) {
    return NextResponse.json({ ok: false, error: "INVALID_EMBEDDED_SIGNUP_MODE" }, { status: 400 })
  }

  const wabaId = safeId(body.waba_id)
  const businessAccountId = safeId(body.business_account_id)
  const phoneNumberId = safeId(body.phone_number_id)
  const phoneNumber = normalizeWhatsAppPhone(body.phone_number ?? null)

  if (!wabaId && !businessAccountId) {
    return NextResponse.json(
      { ok: false, error: "MISSING_WABA_ID" },
      { status: 400 },
    )
  }

  if (!phoneNumberId) {
    return NextResponse.json(
      { ok: false, error: "MISSING_PHONE_NUMBER_ID" },
      { status: 400 },
    )
  }

  try {
    const trainer = await requireTrainerContext()
    const accessToken = await exchangeCodeForAccessToken({
      code,
      appId: config.appId,
      appSecret: config.appSecret,
      graphApiVersion: config.graphApiVersion,
    })

    const db = getWhatsAppServiceDb()
    const now = new Date().toISOString()

    const { data: existing, error: existingError } = await db
      .from("trainer_waba_credentials")
      .select("id")
      .eq("trainer_id", trainer.authUserId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingError) {
      throw existingError
    }

    const credentialPayload = {
      trainer_id: trainer.authUserId,
      access_token: accessToken,
      waba_id: wabaId,
      business_account_id: businessAccountId ?? wabaId,
      phone_number_id: phoneNumberId,
      phone_number: phoneNumber,
      status: "connected",
      connected_at: now,
      updated_at: now,
    }

    const credentialQuery = existing?.id
      ? db
        .from("trainer_waba_credentials")
        .update(credentialPayload)
        .eq("id", existing.id)
        .eq("trainer_id", trainer.authUserId)
        .select("waba_id, business_account_id, phone_number_id, phone_number, status, updated_at")
        .maybeSingle()
      : db
        .from("trainer_waba_credentials")
        .insert({ ...credentialPayload, created_at: now })
        .select("waba_id, business_account_id, phone_number_id, phone_number, status, updated_at")
        .maybeSingle()

    const { data: credential, error: credentialError } = await credentialQuery
    if (credentialError) {
      throw credentialError
    }

    return NextResponse.json({
      ok: true,
      credential,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized — no active session") {
      return unauthorized()
    }

    return NextResponse.json(
      {
        ok: false,
        error: "EMBEDDED_SIGNUP_CALLBACK_FAILED",
        message: error instanceof Error ? error.message : "Unable to complete Embedded Signup.",
      },
      { status: 502 },
    )
  }
}
