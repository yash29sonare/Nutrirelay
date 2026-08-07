"use client"

import { useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import { CheckCircle2, CircleAlert, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/Button"

type SignupState = "not_connected" | "connecting" | "connected" | "error"

interface EmbeddedSignupMessage {
  type?: string
  event?: string
  data?: {
    waba_id?: string
    business_id?: string
    business_account_id?: string
    phone_number_id?: string
    phone_number?: string
  }
}

interface CallbackResponse {
  ok?: boolean
  error?: string
  message?: string
  credential?: {
    waba_id: string | null
    business_account_id: string | null
    phone_number_id: string | null
    phone_number: string | null
    status: string
    updated_at: string
  }
}

declare global {
  interface Window {
    fbAsyncInit?: () => void
    FB?: {
      init: (options: {
        appId: string
        autoLogAppEvents?: boolean
        xfbml?: boolean
        version: string
      }) => void
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        options: Record<string, unknown>,
      ) => void
    }
  }
}

function isFacebookMessageOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname
    return hostname === "facebook.com" || hostname.endsWith(".facebook.com")
  } catch {
    return false
  }
}

function parseEmbeddedSignupMessage(data: unknown): EmbeddedSignupMessage | null {
  if (typeof data !== "string") return null

  try {
    const parsed = JSON.parse(data) as EmbeddedSignupMessage
    return parsed.type === "WA_EMBEDDED_SIGNUP" ? parsed : null
  } catch {
    return null
  }
}

async function waitForSignupData(ref: RefObject<EmbeddedSignupMessage["data"] | null>) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (ref.current?.phone_number_id && (ref.current.waba_id || ref.current.business_id || ref.current.business_account_id)) {
      return ref.current
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return ref.current
}

export function WhatsAppEmbeddedSignupButton({
  appId,
  configId,
  graphApiVersion,
  hasCredential,
}: {
  appId: string | null
  configId: string | null
  graphApiVersion: string
  hasCredential: boolean
}) {
  const [state, setState] = useState<SignupState>(hasCredential ? "connected" : "not_connected")
  const [message, setMessage] = useState<string | null>(null)
  const [credential, setCredential] = useState<CallbackResponse["credential"] | null>(null)
  const signupDataRef = useRef<EmbeddedSignupMessage["data"] | null>(null)
  const sdkReadyRef = useRef(false)

  const isConfigured = Boolean(appId && configId)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isFacebookMessageOrigin(event.origin)) return

      const parsed = parseEmbeddedSignupMessage(event.data)
      if (!parsed) return

      if (parsed.event === "FINISH") {
        signupDataRef.current = parsed.data ?? null
      }

      if (parsed.event === "CANCEL") {
        setState(hasCredential ? "connected" : "not_connected")
        setMessage("Embedded Signup was cancelled.")
      }

      if (parsed.event === "ERROR") {
        setState("error")
        setMessage("Meta Embedded Signup returned an error.")
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [hasCredential])

  useEffect(() => {
    if (!appId || sdkReadyRef.current) return

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: graphApiVersion,
      })
      sdkReadyRef.current = true
    }

    if (document.getElementById("facebook-jssdk")) return

    const script = document.createElement("script")
    script.id = "facebook-jssdk"
    script.async = true
    script.defer = true
    script.crossOrigin = "anonymous"
    script.src = "https://connect.facebook.net/en_US/sdk.js"
    document.body.appendChild(script)
  }, [appId, graphApiVersion])

  async function completeConnection(code: string) {
    const signupData = await waitForSignupData(signupDataRef)

    const response = await fetch("/api/meta/embedded-signup/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        waba_id: signupData?.waba_id ?? null,
        business_account_id:
          signupData?.business_account_id
          ?? signupData?.business_id
          ?? null,
        phone_number_id: signupData?.phone_number_id ?? null,
        phone_number: signupData?.phone_number ?? null,
      }),
    })

    const json = (await response.json().catch(() => ({}))) as CallbackResponse
    if (!response.ok || !json.ok) {
      throw new Error(json.message ?? json.error ?? "Unable to connect WhatsApp Business.")
    }

    setCredential(json.credential ?? null)
    setState("connected")
    setMessage("WhatsApp Business connected.")
  }

  function launchSignup() {
    if (!appId || !configId) {
      setState("error")
      setMessage("Meta Embedded Signup is not configured.")
      return
    }

    if (!window.FB || !sdkReadyRef.current) {
      setState("error")
      setMessage("Meta SDK is still loading. Try again in a moment.")
      return
    }

    setState("connecting")
    setMessage(null)
    signupDataRef.current = null

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code
        if (!code) {
          setState(hasCredential ? "connected" : "not_connected")
          setMessage("Meta did not return an authorization code.")
          return
        }

        void completeConnection(code).catch((error) => {
          setState("error")
          setMessage(error instanceof Error ? error.message : "Unable to connect WhatsApp Business.")
        })
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          sessionInfoVersion: "3",
        },
      },
    )
  }

  const statusLabel =
    state === "connecting"
      ? "Connecting"
      : state === "connected"
        ? "Connected"
        : state === "error"
          ? "Error"
          : "Not connected"
  const StatusIcon = state === "connected" ? CheckCircle2 : state === "connecting" ? Loader2 : CircleAlert

  return (
    <div className="space-y-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon
              size={16}
              className={
                state === "connected"
                  ? "text-[var(--success)]"
                  : state === "connecting"
                    ? "animate-spin text-[var(--info)]"
                  : state === "error"
                      ? "text-[var(--destructive)]"
                      : "text-[var(--warning)]"
              }
            />
            <p className="text-sm font-semibold text-[var(--foreground)]">{statusLabel}</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Launches Meta WhatsApp Embedded Signup and saves the connection to this authenticated trainer only.
          </p>
          {message ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{message}</p> : null}
          {!isConfigured ? (
            <p className="mt-2 text-xs leading-5 text-[var(--warning)]">
              Configure NEXT_PUBLIC_META_APP_ID and NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID to enable the browser launcher.
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="brand"
          icon={<MessageSquare size={15} />}
          loading={state === "connecting"}
          disabled={!isConfigured}
          onClick={launchSignup}
        >
          {hasCredential ? "Reconnect WhatsApp Business" : "Connect WhatsApp Business"}
        </Button>
      </div>

      {credential ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3">
            <p className="text-xs text-[var(--muted)]">WABA ID</p>
            <p className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">{credential.waba_id ?? "Not returned"}</p>
          </div>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3">
            <p className="text-xs text-[var(--muted)]">Phone Number ID</p>
            <p className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">{credential.phone_number_id ?? "Not returned"}</p>
          </div>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3">
            <p className="text-xs text-[var(--muted)]">Connection status</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{credential.status}</p>
          </div>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3">
            <p className="text-xs text-[var(--muted)]">Last updated</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
              {new Date(credential.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
