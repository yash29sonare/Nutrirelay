import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Activity, ArrowUpRight, Bot, CheckCircle2, CircleAlert, ClipboardCheck, Clock, CreditCard, LifeBuoy, MessageSquare, QrCode, Shield } from "lucide-react"
import { SettingsAccountSection } from "./SettingsAccountSection"
import { SettingsProfileForm } from "./SettingsProfileForm"
import { getManualWabaOnboardingReadiness, type ManualWabaCredentialState } from "@/lib/waba/manual-onboarding-readiness"
import { formatDateTime } from "@/lib/format"

const AUTOMATION_GROUPS = [
  {
    title: "Client follow-up",
    description:
      "Meal nudges, ghosting checks, and renewal reminders prepare outreach when logging slows down or subscriptions are close to expiry.",
    icon: MessageSquare,
  },
  {
    title: "Scheduling",
    description:
      "The scheduler plans reminders and conversation drafts, then dispatches approved communication runs through the existing engagement pipeline.",
    icon: Clock,
  },
  {
    title: "Reporting",
    description:
      "Weekly reports, monthly projections, and compliance refresh jobs generate trainer-facing insights from food logs and active goals.",
    icon: Bot,
  },
  {
    title: "System upkeep",
    description:
      "Background storage pruning keeps transient operational tables from growing without bound.",
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
    title: "Communications",
    description: "Review pending conversations, reminders, and message delivery failures.",
    href: "/dashboard/communications",
    icon: MessageSquare,
  },
] as const

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
  const credential = readiness?.credential ?? null
  const isCredentialConnected = credential?.state === "connected"
  const hasCredential = Boolean(credential && credential.state !== "missing")
  const hasStoredPhoneNumberId = Boolean(credential?.phoneNumberId)
  const hasStoredWabaId = Boolean(credential?.wabaId ?? credential?.businessAccountId)
  const clientReadiness = readiness?.clientReadiness ?? null
  const hasReadyClient = Boolean(clientReadiness?.readyClient)
  const pilotSignals = readiness?.pilotSignals ?? null

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
                <p className="text-sm text-[var(--foreground)]">{subscriptionPlan}</p>
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
                <FieldValue label="Saved plan" value={subscriptionPlan} />
                <FieldValue label="Payment method" value="Manual QR/UPI only" />
                <FieldValue label="Verification status" value="Operator verified manually after payment proof is reviewed" />
                <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-4 text-sm leading-6 text-[var(--muted)]">
                  <p className="font-medium text-[var(--foreground)]">Manual payment instructions</p>
                  <p className="mt-2">No Razorpay, Stripe, card collection, or automatic payment success is active in NutriRelay.</p>
                  <p>Do not enter a UPI PIN in NutriRelay. Complete payment only inside the trainer's UPI app, then wait for operator verification.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>WhatsApp Connection</CardTitle>
                <CardDescription>
                  Manual WABA onboarding status for this trainer. Self-serve Embedded Signup is not enabled yet.
                </CardDescription>
              </div>
              <Badge variant="brand">Manual WABA onboarding</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
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
                  Manual WABA onboarding requires operator-secured credential setup. Saved credential status is shown from NutriRelay only; this is not live Meta validation.
                </p>
              </div>
              {!isCredentialConnected ? (
                <div className="rounded-lg border border-[var(--warning)]/20 bg-[var(--warning)]/10 px-3 py-2 text-xs text-[var(--warning)]">
                  Add or update the trainer's WABA credential manually before running a pilot.
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-overlay)]/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Reconnect lifecycle</h3>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Self-serve reconnect is not enabled yet. Operator-assisted credential refresh is required for the manual pilot if a saved credential becomes expired, disconnected, or invalid.
                  </p>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Existing WhatsApp Business App numbers may be supported later through Meta coexistence.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium text-[var(--muted)]"
                >
                  Self-serve reconnect unavailable
                </button>
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
                      Manual WABA onboarding is available now. Self-serve Meta Embedded Signup is coming later and is not claimed as working here.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <ChecklistItem done={false} label="Meta app configured" detail="External Meta dashboard setup is completed outside NutriRelay." />
                    <ChecklistItem done={false} label="Business verification and app review" detail="Required before self-serve production onboarding can be enabled." />
                    <ChecklistItem done={false} label="WhatsApp product and permissions ready" detail="WhatsApp Business Management and messaging permissions must be approved by Meta." />
                    <ChecklistItem done={false} label="Production callback subscribed" detail="Webhook callback and messages field subscription are verified during real onboarding." />
                  </div>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    Safe config boundary: public Meta app ID can be added later as `NEXT_PUBLIC_META_APP_ID`; server secrets such as `META_APP_SECRET` must remain server-side.
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
            <ChecklistItem done label="Current plan is visible" detail={`Saved plan: ${subscriptionPlan}.`} />
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
              <p>Self-serve Embedded Signup is not enabled yet.</p>
              <p>Manual onboarding and future self-serve connection are intentionally separate flows.</p>
              <p>No Meta API call, token refresh, or live WhatsApp send is required for this readiness screen.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium text-[var(--muted)]"
                >
                  Connect WhatsApp later
                </button>
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

        <Card>
          <CardHeader>
            <CardTitle>Automation Coverage</CardTitle>
            <CardDescription>
              These background automations are live server-side. When you change settings in the automation workspace, future runs pick up the updated configuration automatically.
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
            <Link
              href="/dashboard/automations"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-500 dark:text-brand-400"
            >
              Open automation workspace
              <ArrowUpRight size={14} />
            </Link>
          </CardContent>
        </Card>

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
                    Use Events for job history, Communications for queued or failed outreach, and the account section above for plan and WhatsApp connection status.
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
