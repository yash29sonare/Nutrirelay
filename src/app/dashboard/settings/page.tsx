import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Activity, ArrowUpRight, Bot, CheckCircle2, CircleAlert, ClipboardCheck, Clock, CreditCard, LifeBuoy, MessageSquare, QrCode, Shield } from "lucide-react"
import { SettingsAccountSection } from "./SettingsAccountSection"
import { SettingsProfileForm } from "./SettingsProfileForm"
import { WhatsAppEmbeddedSignupButton } from "./WhatsAppEmbeddedSignupButton"
import { getManualWabaOnboardingReadiness, type ManualWabaCredentialState } from "@/lib/waba/manual-onboarding-readiness"
import { formatDateTime } from "@/lib/format"
import { BILLING_PLAN_ORDER, BILLING_PLANS, formatBillingPrice, getBillingPlan } from "@/lib/billing/plans"
import { BorderGlow, ShinyText, SpotlightCard } from "@/components/react-bits"

const AUTOMATION_GROUPS = [
  {
    title: "Meal reminder preparation",
    description:
      "Prepares a reminder for trainer review when a client misses an expected meal log.",
    icon: MessageSquare,
  },
  {
    title: "Missed-check-in follow-up preparation",
    description:
      "Prepares a follow-up when client logging or check-in activity stalls.",
    icon: Clock,
  },
  {
    title: "Weekly report preparation",
    description:
      "Builds weekly nutrition summaries from trainer-owned food logs and goals.",
    icon: Bot,
  },
  {
    title: "Monthly report preparation",
    description:
      "Builds a monthly progress view with compact weekly breakdowns.",
    icon: Bot,
  },
  {
    title: "Photo / voice review queue",
    description:
      "Surfaces image review items and failed voice-note transcriptions in Inbox.",
    icon: Shield,
  },
] as const

function connectionVariant(state: ManualWabaCredentialState): "success" | "warning" | "danger" | "outline" {
  switch (state) {
    case "connected":
      return "success"
    case "disconnected":
    case "missing":
      return "warning"
    case "invalid":
      return "danger"
    default:
      return "outline"
  }
}

function connectionMessage(state: ManualWabaCredentialState) {
  switch (state) {
    case "connected":
      return "WhatsApp is connected for this trainer."
    case "disconnected":
      return "Reconnect or update this trainer's WABA credential."
    case "missing":
      return "WhatsApp is not connected for this trainer."
    case "invalid":
      return "This trainer's WABA credential is marked invalid."
    default:
      return "WhatsApp connection status is unknown for this trainer."
  }
}

function FieldValue({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">{value ?? "Not set"}</p>
    </div>
  )
}

function ChecklistItem({ label, done, detail }: { label: string; done: boolean; detail?: string }) {
  const Icon = done ? CheckCircle2 : CircleAlert
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-3">
      <Icon
        size={16}
        className={done ? "mt-0.5 shrink-0 text-[var(--success)]" : "mt-0.5 shrink-0 text-[var(--warning)]"}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
        {detail ? <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p> : null}
      </div>
    </div>
  )
}

const SUPPORT_LINKS = [
  {
    title: "Events",
    description: "Inspect background jobs, delivery activity, and operational history.",
    href: "/dashboard/events",
    icon: Activity,
  },
  {
    title: "Inbox",
    description: "Review client replies, media, voice notes, follow-ups, and delivery failures.",
    href: "/dashboard/communications",
    icon: MessageSquare,
  },
] as const

const DEFAULT_GRAPH_API_VERSION = "v20.0"

function PlanFeatureList({ features }: { features: readonly string[] }) {
  return (
    <ul className="space-y-1.5 text-xs leading-5 text-[var(--muted)]">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2">
          <CheckCircle2 size={13} className="mt-1 shrink-0 text-[var(--success)]" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const authUserId = user?.id ?? null

  let profile: Record<string, unknown> | null = null
  const readiness = authUserId ? await getManualWabaOnboardingReadiness(authUserId) : null
  if (authUserId) {
    const { data } = await supabase
      .from("trainers")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle()
    profile = data as Record<string, unknown> | null
  }

  const displayName = (user?.user_metadata?.display_name as string) ?? (profile?.name as string) ?? "Trainer"
  const businessName = (profile?.business_name as string) ?? null
  const email = user?.email ?? (profile?.email as string) ?? ""
  const subscriptionPlan = (profile?.subscription_plan as string) ?? "STARTER"
  const currentBillingPlan = getBillingPlan(subscriptionPlan)
  const currentBillingPlanLabel = currentBillingPlan?.name ?? "Plan not assigned"
  const currentBillingPlanDetail = currentBillingPlan
    ? `${currentBillingPlan.name} · ${currentBillingPlan.clientLimitLabel}`
    : "No mapped billing plan has been assigned."
  const credential = readiness?.credential ?? null
  const isCredentialConnected = credential?.state === "connected"
  const hasCredential = Boolean(credential && credential.state !== "missing")
  const hasStoredPhoneNumberId = Boolean(credential?.phoneNumberId)
  const hasStoredWabaId = Boolean(credential?.wabaId ?? credential?.businessAccountId)
  const clientReadiness = readiness?.clientReadiness ?? null
  const hasReadyClient = Boolean(clientReadiness?.readyClient)
  const pilotSignals = readiness?.pilotSignals ?? null
  const metaAppId = process.env.META_APP_ID?.trim() || process.env.NEXT_PUBLIC_META_APP_ID?.trim() || null
  const embeddedSignupConfigId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || null
  const graphApiVersion = process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <div className="space-y-6">
        {/* ACCOUNT */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your profile and billing information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Profile photo + name */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-semibold text-brand-600 dark:text-brand-400">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">{displayName}</p>
                {businessName && (
                  <p className="text-xs text-[var(--muted)]">{businessName}</p>
                )}
                <p className="text-xs text-[var(--muted)]">{email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--muted)]">Subscription Plan</p>
                <p className="text-sm text-[var(--foreground)]">{currentBillingPlanLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--muted)]">Account Status</p>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--muted)]">WhatsApp Business</p>
                <Badge variant={credential ? connectionVariant(credential.state) : "warning"}>
                  {credential?.status ?? "missing"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <QrCode size={16} />
              </div>
              <div>
                <CardTitle>Billing</CardTitle>
                <CardDescription>
                  Manual QR/UPI payment model for trainer pilots. No online payment gateway is connected.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
              <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-6 text-center">
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-[var(--muted)]">
                    <QrCode size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Payment QR placeholder</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      Payment QR will be added by the operator before launch.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <FieldValue label="Saved plan" value={currentBillingPlanDetail} />
                <FieldValue label="Payment method" value="Manual QR/UPI only" />
                <FieldValue label="Verification status" value="Operator verified manually after payment proof is reviewed" />
                <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-4 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-medium text-[var(--foreground)]">Manual payment instructions</p>
                  <p className="mt-2">No Razorpay, Stripe, card collection, or automatic payment success is active in NutriRelay.</p>
                  <p>Do not enter a UPI PIN in NutriRelay. Complete payment only inside the trainer&apos;s UPI app, then wait for operator verification.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
              {BILLING_PLAN_ORDER.map((planKey) => {
                const plan = BILLING_PLANS[planKey]
                const isCurrent = currentBillingPlan?.key === plan.key
                const featureLabels = [
                  plan.clientLimitLabel,
                  plan.trialDays ? `${plan.trialDays}-day trial access` : "Monthly manual verification",
                  plan.key === "agency" ? "Custom operator approval" : "No card collection in app",
                ]

                const card = (
                  <SpotlightCard
                    key={plan.key}
                    className={`h-full rounded-xl border p-4 ${
                      isCurrent
                        ? "border-[var(--success)] bg-[var(--success)]/10"
                        : plan.key === "pro"
                          ? "border-brand-500/35 bg-brand-500/10"
                          : "border-[var(--surface-border)] bg-[var(--surface-overlay)]/40"
                    }`}
                    color={plan.key === "pro" ? "rgba(34, 197, 94, 0.2)" : "rgba(59, 130, 246, 0.12)"}
                  >
                    <div className="flex min-h-16 items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{plan.name}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{plan.headline}</p>
                      </div>
                      {"badgeLabel" in plan && plan.badgeLabel ? (
                        <Badge variant="brand">
                          <ShinyText base="#dcfce7" highlight="#ffffff">{plan.badgeLabel}</ShinyText>
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">{formatBillingPrice(plan)}</p>
                    <p className="mt-1 min-h-10 text-xs leading-5 text-[var(--muted)]">{plan.helperText}</p>
                    <div className="mt-4 border-t border-[var(--surface-border)] pt-3">
                      <PlanFeatureList features={featureLabels} />
                    </div>
                  </SpotlightCard>
                )

                return isCurrent || plan.key === "pro" ? (
                  <BorderGlow key={plan.key} className="block rounded-xl p-px" glowOpacity={isCurrent ? 0.44 : 0.34}>
                    {card}
                  </BorderGlow>
                ) : (
                  card
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>WhatsApp Connection</CardTitle>
                <CardDescription>
                  Connect or review this trainer&apos;s WhatsApp Business connection.
                </CardDescription>
              </div>
              <Badge variant={isCredentialConnected ? "success" : "warning"}>
                {isCredentialConnected ? "Connected" : "Not connected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <WhatsAppEmbeddedSignupButton
              appId={metaAppId}
              configId={embeddedSignupConfigId}
              graphApiVersion={graphApiVersion}
              hasCredential={hasCredential}
            />

            <div className="flex flex-col gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Connection health</h3>
                  <Badge variant={credential ? connectionVariant(credential.state) : "warning"}>
                    {credential?.state ?? "missing"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {credential ? connectionMessage(credential.state) : "No WhatsApp credential is connected for this trainer."}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  Saved credential status is shown from NutriRelay. Access tokens and app secrets are never rendered in this browser UI.
                </p>
              </div>
              {!isCredentialConnected ? (
                <div className="rounded-lg border border-[var(--warning)]/20 bg-[var(--warning)]/10 px-3 py-2 text-xs text-[var(--warning)]">
                  Add or update the trainer&apos;s WABA credential manually before running a pilot.
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Reconnect lifecycle</h3>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Use Reconnect WhatsApp Business if a saved credential becomes expired, disconnected, or invalid.
                  </p>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    The callback updates only this authenticated trainer&apos;s `trainer_waba_credentials` row.
                  </p>
                </div>
                <Badge variant={hasCredential ? "success" : "warning"}>
                  {hasCredential ? "Reconnect available" : "Connect required"}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--info)]/10 text-[var(--info)]">
                  <ClipboardCheck size={16} />
                </div>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Meta Connect readiness</h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      Meta Embedded Signup is available when the Meta app ID, app secret, and Embedded Signup configuration ID are configured.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <ChecklistItem done={Boolean(metaAppId)} label="Meta app ID configured" detail={metaAppId ? "Public app ID is available to launch the Meta SDK." : "Set META_APP_ID."} />
                    <ChecklistItem done={Boolean(embeddedSignupConfigId)} label="Embedded Signup configuration ID configured" detail={embeddedSignupConfigId ? "Configuration ID is available." : "Set META_EMBEDDED_SIGNUP_CONFIG_ID."} />
                    <ChecklistItem done={Boolean(process.env.META_APP_SECRET?.trim())} label="Meta app secret configured server-side" detail="Required only on the callback route for code exchange." />
                    <ChecklistItem done label="Callback stores trainer-scoped credentials" detail="/api/meta/embedded-signup/callback uses the authenticated trainer context." />
                  </div>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Safe config boundary: Meta app ID and config ID are public launch values; `META_APP_SECRET` and access tokens remain server-side.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FieldValue label="Phone number ID" value={credential?.phoneNumberId ?? null} />
              <FieldValue label="WABA / business account ID" value={credential?.wabaId ?? credential?.businessAccountId ?? null} />
              <FieldValue label="Updated at" value={credential?.updatedAt ? formatDateTime(credential.updatedAt) : null} />
              <FieldValue label="Connected at" value={credential?.connectedAt ? formatDateTime(credential.connectedAt) : null} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--info)]/10 text-[var(--info)]">
                <CreditCard size={16} />
              </div>
              <div>
                <CardTitle>Subscription / Payment Gating</CardTitle>
                <CardDescription>
                  Billing foundation for paid SaaS access without connecting a payment provider in this milestone.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ChecklistItem done label="Current plan is visible" detail={`Saved plan: ${currentBillingPlanDetail}`} />
            <ChecklistItem done label="Manual pilot remains available" detail="Current manual trainer WABA pilot is not blocked by billing until payment enforcement is enabled." />
            <ChecklistItem done={false} label="Billing provider not connected" detail="No fake paid state is shown. WhatsApp connection can require an active plan when billing is enabled." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual WABA Pilot Readiness</CardTitle>
            <CardDescription>
              Operator checklist for onboarding the first trainer with saved NutriRelay data only. Live Meta testing is run later during the pilot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Trainer readiness</h3>
                <ChecklistItem done={Boolean(authUserId)} label="Trainer account exists" detail={authUserId ? "Authenticated trainer session is active." : "Sign in before checking readiness."} />
                <ChecklistItem done={Boolean(readiness?.trainerProfileExists)} label="Trainer profile exists" detail={readiness?.trainerProfileExists ? "Trainer profile row is available." : "Create the trainer profile before pilot onboarding."} />
                <ChecklistItem done label="Dashboard loads" detail="Settings is rendering inside the authenticated dashboard shell." />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Credential readiness</h3>
                <ChecklistItem done={hasCredential} label="WABA credential row exists" detail={hasCredential ? "Safe credential metadata is available." : "No WhatsApp credential is connected for this trainer."} />
                <ChecklistItem done={hasStoredPhoneNumberId} label="phone_number_id stored" detail={hasStoredPhoneNumberId ? credential?.phoneNumberId ?? undefined : "Store the trainer's Meta phone_number_id manually."} />
                <ChecklistItem done={hasStoredWabaId} label="WABA/business_account_id stored" detail={hasStoredWabaId ? credential?.wabaId ?? credential?.businessAccountId ?? undefined : "Store the trainer's WABA or business account ID manually."} />
                <ChecklistItem done={isCredentialConnected} label="Credential status connected" detail={isCredentialConnected ? "Status is connected." : connectionMessage(credential?.state ?? "missing")} />
                <ChecklistItem done label="Token stored server-side only" detail="This page does not select or render credential secrets." />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Client readiness</h3>
                <ChecklistItem done={Boolean(clientReadiness && clientReadiness.totalLinks > 0)} label="trainer_clients link exists" detail={`${clientReadiness?.totalLinks ?? 0} trainer-client link(s) found.`} />
                <ChecklistItem done={Boolean(clientReadiness && clientReadiness.activeLinks > 0)} label="Active client link exists" detail={`${clientReadiness?.activeLinks ?? 0} active link(s), ${clientReadiness?.inactiveLinks ?? 0} inactive link(s).`} />
                <ChecklistItem done={Boolean(clientReadiness && clientReadiness.activeClients > 0)} label="At least one client exists" detail={`${clientReadiness?.activeClients ?? 0} active client profile(s) found.`} />
                <ChecklistItem done={hasReadyClient} label="Client has WhatsApp phone number" detail={hasReadyClient ? `${clientReadiness?.readyClient?.name} · ${clientReadiness?.readyClient?.phoneNumber}` : "No active client with a WhatsApp phone number is ready for testing."} />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">WhatsApp pilot test readiness</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <ChecklistItem done={Boolean(pilotSignals?.hasCommunicationHistory)} label="Conversation history available" detail={pilotSignals?.hasCommunicationHistory ? "Saved WhatsApp communication history exists." : "Conversation history will appear after the first WhatsApp pilot flow."} />
                <ChecklistItem done={Boolean(pilotSignals?.hasStatusHistory)} label="Status history available" detail={pilotSignals?.hasStatusHistory ? "Saved delivery/read status history exists." : "Status rows will appear after Meta status webhooks are received."} />
                <ChecklistItem done={Boolean(pilotSignals?.hasFoodLogs)} label="Food logs available" detail={pilotSignals?.hasFoodLogs ? "Saved nutrition logs exist for active clients." : "Food logs will appear after the first food message is processed."} />
                <ChecklistItem done={isCredentialConnected && hasReadyClient} label="Ready to run manual pilot sequence" detail="Outbound template, status webhook, greeting inbound, food inbound, and dashboard/review visibility are tested during the live pilot." />
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-4 text-xs leading-5 text-[var(--muted)]">
              <p>Embedded Signup connection is launched from the WhatsApp Connection section above.</p>
              <p>Manual onboarding remains available for operator-assisted testing.</p>
              <p>No live WhatsApp send is required for this readiness screen.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/dashboard/whatsapp-dev"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-overlay)]"
                >
                  Open internal WhatsApp console
                </Link>
                <Link
                  href="/dashboard/communications"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-overlay)]"
                >
                  Open communications
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>External Trainer Onboarding Readiness</CardTitle>
            <CardDescription>
              Operator-assisted path for the first trainer before self-serve WhatsApp connection is available.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ChecklistItem done={Boolean(authUserId && readiness?.trainerProfileExists)} label="Trainer account and profile" detail="Create the trainer account, confirm profile details, then keep the trainer scoped to their own clients." />
            <ChecklistItem done={false} label="Manual QR/UPI billing step" detail="Trainer pays through the operator-provided QR/UPI details and payment is verified manually." />
            <ChecklistItem done={false} label="WABA details collected later" detail="phone_number_id, WABA/business account ID, approved template, and token are handled securely by the operator." />
            <ChecklistItem done={Boolean(clientReadiness && clientReadiness.activeLinks > 0)} label="Client mapping ready" detail="Client phone numbers must be linked through active trainer_clients rows before live smoke testing." />
            <ChecklistItem done={false} label="Live smoke checklist" detail="One outbound message, status webhook, greeting inbound, food inbound, dashboard/review visibility, and report inclusion." />
            <ChecklistItem done label="Token handling warning" detail="Trainers must not paste Meta tokens into public browser UI; credential handling remains server-side/operator-assisted." />
          </CardContent>
        </Card>

        <div id="automation-preferences" className="scroll-mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation preferences</CardTitle>
              <CardDescription>
                See which preparation workflows support your client work. Live WhatsApp sending still requires operator approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {AUTOMATION_GROUPS.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                      <Icon size={16} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
                      <p className="text-xs leading-5 text-[var(--muted)]">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardContent className="pt-0">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                Preparation only. Live WhatsApp sending requires operator approval.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Help & Support</CardTitle>
            <CardDescription>
              Support guidance now lives in Settings instead of the main navigation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {SUPPORT_LINKS.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-[var(--surface-border)] px-4 py-3 transition-colors hover:bg-[var(--surface-overlay)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-overlay)] text-[var(--muted)]">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
                  <p className="text-xs text-[var(--muted)]">{description}</p>
                </div>
                <ArrowUpRight size={15} className="shrink-0 text-[var(--muted)]" />
              </Link>
            ))}

            <div className="rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <LifeBuoy size={16} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--foreground)]">What to check first</p>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Use Events for internal job history, Inbox for client replies and failed outreach, and the account section above for plan and WhatsApp connection status.
                  </p>
                </div>
              </div>
            </div>

            {authUserId && (
              <div className="border-t border-[var(--surface-border)] pt-5">
                <SettingsProfileForm initialDisplayName={displayName} initialBusinessName={businessName ?? ""} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* LOGOUT */}
        <SettingsAccountSection />
      </div>
    </PageContainer>
  )
}
