import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Activity, ArrowUpRight, Bot, Clock, LifeBuoy, MessageSquare, Shield } from "lucide-react"
import { SettingsAccountSection } from "./SettingsAccountSection"
import { SettingsProfileForm } from "./SettingsProfileForm"

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
                <Badge variant="warning">Not Connected</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WHATSAPP */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Business</CardTitle>
            <CardDescription>
              The production connection flow is not implemented here yet. Use the developer console to verify Meta test-mode wiring and the communications workspace to review activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 shrink-0">
              <span className="text-xl">🔴</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Not Connected</h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                Use the developer console for real Meta webhook and test-send verification. Connection setup still needs a dedicated onboarding flow.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Link
                href="/dashboard/whatsapp-dev"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
              >
                Open test console
              </Link>
              <Link
                href="/dashboard/communications"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--surface-overlay)] transition-colors"
              >
                Open communications
              </Link>
            </div>
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
