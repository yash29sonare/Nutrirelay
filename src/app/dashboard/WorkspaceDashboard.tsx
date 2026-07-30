import Link from "next/link"
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  MessageCircle,
  Mic,
  Salad,
  Settings,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { Card, CardContent } from "@/components/ui/Card"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { formatRelativeDate } from "@/lib/format"
import type { ClientSummaryCard } from "@/lib/dashboard-reads"
import type { DashboardDataDTO } from "@/types/dashboard"

interface OverviewReportSummary {
  client_id: string
  ready_count: number
  label: string | null
}

interface WhatsAppConnectionOverview {
  connected: boolean
  status: string
}

interface WorkspaceDashboardProps {
  data: DashboardDataDTO
  clientSummaries: ClientSummaryCard[]
  reportSummaries: OverviewReportSummary[]
  reportsReady: number
  whatsappConnection: WhatsAppConnectionOverview | null
  userName: string | null
}

interface ClientOverview {
  client_id: string
  client_name: string
  goal_type: string | null
  meals_today: number
  last_activity_at: string | null
  last_activity_label: string | null
  check_in_status: string
  pending_food_reviews: number
  pending_photo_reviews: number
  pending_voice_reviews: number
  pending_reply_reviews: number
  pending_updates: number
  report_ready_count: number
  report_label: string | null
}

interface AttentionBadge {
  label: string
  icon: typeof MessageCircle
  variant: "brand" | "warning" | "info" | "outline"
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatCurrentDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatGoal(goal: string | null | undefined) {
  if (!goal) return "Goal not added"
  return goal.replaceAll("_", " ").toLowerCase()
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`
}

function makeClients(input: {
  data: DashboardDataDTO
  clientSummaries: ClientSummaryCard[]
  reportSummaries: OverviewReportSummary[]
}): ClientOverview[] {
  const summaryByClient = new Map(input.clientSummaries.map((client) => [client.client_id, client]))
  const reportsByClient = new Map(input.reportSummaries.map((report) => [report.client_id, report]))

  return input.data.clients.map((client) => {
    const summary = summaryByClient.get(client.client_id)
    const report = reportsByClient.get(client.client_id)
    const mealsToday = summary?.meals_today ?? client.total_meals_logged_today

    return {
      client_id: client.client_id,
      client_name: summary?.client_name ?? client.client_name ?? "Client",
      goal_type: summary?.goal_type ?? null,
      meals_today: mealsToday,
      last_activity_at: summary?.last_activity_at ?? summary?.last_logged ?? null,
      last_activity_label: summary?.last_activity_label ?? null,
      check_in_status: summary?.check_in_status ?? (mealsToday > 0 ? "Checked in today" : "No meal today"),
      pending_food_reviews: summary?.pending_food_reviews ?? 0,
      pending_photo_reviews: summary?.pending_photo_reviews ?? 0,
      pending_voice_reviews: summary?.pending_voice_reviews ?? 0,
      pending_reply_reviews: summary?.pending_reply_reviews ?? 0,
      pending_updates: summary?.pending_updates ?? 0,
      report_ready_count: report?.ready_count ?? 0,
      report_label: report?.label ?? null,
    }
  })
}

function buildAttentionBadges(client: ClientOverview): AttentionBadge[] {
  const badges: AttentionBadge[] = []

  if (client.pending_reply_reviews > 0) {
    badges.push({
      label: client.pending_reply_reviews === 1 ? "Pending update" : plural(client.pending_reply_reviews, "update"),
      icon: MessageCircle,
      variant: "brand",
    })
  }
  if (client.pending_food_reviews > 0) {
    badges.push({
      label: client.pending_food_reviews === 1 ? "Food review" : plural(client.pending_food_reviews, "food reviews", "food reviews"),
      icon: Salad,
      variant: "warning",
    })
  }
  if (client.pending_photo_reviews > 0) {
    badges.push({
      label: client.pending_photo_reviews === 1 ? "Photo review" : plural(client.pending_photo_reviews, "photo reviews", "photo reviews"),
      icon: Camera,
      variant: "warning",
    })
  }
  if (client.pending_voice_reviews > 0) {
    badges.push({
      label: client.pending_voice_reviews === 1 ? "Voice review" : plural(client.pending_voice_reviews, "voice reviews", "voice reviews"),
      icon: Mic,
      variant: "warning",
    })
  }
  if (client.meals_today === 0) {
    badges.push({
      label: "No meal today",
      icon: Clock3,
      variant: "outline",
    })
  }
  if (client.report_ready_count > 0) {
    badges.push({
      label: client.report_ready_count === 1 ? "Report ready" : plural(client.report_ready_count, "reports ready", "reports ready"),
      icon: FileCheck2,
      variant: "info",
    })
  }

  return badges
}

function primaryReason(client: ClientOverview): string {
  return buildAttentionBadges(client)[0]?.label ?? "Review client"
}

function formatLastActivity(client: ClientOverview): string {
  if (!client.last_activity_at) return "No recent activity"
  const relative = formatRelativeDate(client.last_activity_at)
  return client.last_activity_label ? `${client.last_activity_label} ${relative}` : relative
}

export function WorkspaceDashboard({
  data,
  clientSummaries,
  reportSummaries,
  reportsReady,
  whatsappConnection,
  userName,
}: WorkspaceDashboardProps) {
  const displayName = userName ?? data.trainer.business_name ?? "Trainer"
  const clients = makeClients({ data, clientSummaries, reportSummaries })
  const clientsWithBadges = clients.map((client) => ({
    client,
    badges: buildAttentionBadges(client),
  }))
  const attentionClients = clientsWithBadges.filter(({ badges }) => badges.length > 0)
  const pendingUpdateClients = clients.filter((client) => client.pending_updates > 0)
  const mealsToday = clients.reduce((total, client) => total + client.meals_today, 0)
  const whatsappConnected = whatsappConnection?.connected === true

  const todayCards = [
    { label: "Active clients", value: clients.length, icon: Users, tone: "text-sky-600 bg-sky-500/10" },
    { label: "Need attention", value: attentionClients.length, icon: AlertTriangle, tone: "text-amber-600 bg-amber-500/10" },
    { label: "Pending updates", value: pendingUpdateClients.length, icon: MessageCircle, tone: "text-brand-600 bg-brand-500/10" },
    { label: "Meals today", value: mealsToday, icon: Salad, tone: "text-emerald-600 bg-emerald-500/10" },
  ]

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">{formatCurrentDate()}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Which clients need me today?</p>
        </div>
        {whatsappConnected ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--success)]/20 bg-[var(--success)]/10 px-3 py-1.5 text-xs font-medium text-[var(--success)]">
            <CheckCircle2 size={14} />
            WhatsApp connected
          </span>
        ) : (
          <Link
            href="/dashboard/settings"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-3 py-1.5 text-xs font-medium text-[var(--warning)] transition-colors hover:bg-[var(--warning)]/15"
          >
            <Settings size={14} />
            WhatsApp setup needed
          </Link>
        )}
      </header>

      <section aria-labelledby="today-summary">
        <h2 id="today-summary" className="sr-only">Today summary</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {todayCards.map(({ label, value, icon: Icon, tone }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
                  <p className="text-xs text-[var(--muted)]">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <DashboardSection
        title="Clients today"
        description="Open a client to review replies, food logs, photos, voice notes, and reports."
      >
        {clientsWithBadges.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {clientsWithBadges.map(({ client, badges }) => {
              const visibleBadges = badges.slice(0, 3)
              const hiddenBadgeCount = Math.max(0, badges.length - visibleBadges.length)
              const clientHref = `/dashboard/clients/${client.client_id}`

              return (
                <Link
                  key={client.client_id}
                  href={clientHref}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  aria-label={`Open ${client.client_name}`}
                >
                  <Card className="h-full transition-colors hover:border-brand-500/40 hover:bg-[var(--surface-overlay)]">
                    <CardContent className="flex h-full flex-col gap-4 py-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-[var(--foreground)]">{client.client_name}</h3>
                          <p className="mt-1 text-xs capitalize text-[var(--muted)]">{formatGoal(client.goal_type)}</p>
                        </div>
                        <Badge variant={badges.length > 0 ? "warning" : "success"}>
                          {badges.length > 0 ? "Needs review" : "Handled"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg border border-[var(--surface-border)] px-3 py-2">
                          <p className="text-[var(--muted)]">Meals</p>
                          <p className="mt-1 font-semibold text-[var(--foreground)]">{client.meals_today}</p>
                        </div>
                        <div className="rounded-lg border border-[var(--surface-border)] px-3 py-2">
                          <p className="text-[var(--muted)]">Check-in</p>
                          <p className="mt-1 truncate font-semibold text-[var(--foreground)]">{client.check_in_status}</p>
                        </div>
                        <div className="rounded-lg border border-[var(--surface-border)] px-3 py-2">
                          <p className="text-[var(--muted)]">Activity</p>
                          <p className="mt-1 truncate font-semibold text-[var(--foreground)]">{formatLastActivity(client)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {visibleBadges.length > 0 ? visibleBadges.map((badge) => {
                          const Icon = badge.icon
                          return (
                            <Badge key={badge.label} variant={badge.variant}>
                              <Icon size={12} />
                              {badge.label}
                            </Badge>
                          )
                        }) : (
                          <Badge variant="success">
                            <CheckCircle2 size={12} />
                            No new updates
                          </Badge>
                        )}
                        {hiddenBadgeCount > 0 ? <Badge variant="outline">+{hiddenBadgeCount} more</Badge> : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-[var(--muted)]">No active clients yet.</CardContent>
          </Card>
        )}
      </DashboardSection>

      <DashboardSection title="Needs trainer attention">
        <Card>
          {attentionClients.length > 0 ? (
            <div className="divide-y divide-[var(--surface-border)]">
              {attentionClients.slice(0, 8).map(({ client }) => (
                <Link
                  key={client.client_id}
                  href={`/dashboard/clients/${client.client_id}`}
                  className="grid gap-2 px-5 py-4 transition-colors hover:bg-[var(--surface-overlay)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_auto] sm:items-center"
                >
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{client.client_name}</p>
                  <p className="text-xs text-[var(--muted)]">{primaryReason(client)}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{formatLastActivity(client)}</p>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-brand-600">
                    Review
                    <ChevronRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <CardContent className="flex items-center gap-3 py-7">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <p className="text-sm font-medium text-[var(--foreground)]">Everything is handled for now.</p>
            </CardContent>
          )}
        </Card>
      </DashboardSection>

      <DashboardSection
        title="Reports"
        actions={(
          <div className="flex items-center gap-2">
            {reportsReady > 0 ? <Badge variant="info">{plural(reportsReady, "report ready", "reports ready")}</Badge> : null}
            <Link href="/dashboard/reports" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
              Open reports
              <ChevronRight size={14} />
            </Link>
          </div>
        )}
      >
        <Card>
          {reportSummaries.length > 0 ? (
            <div className="divide-y divide-[var(--surface-border)]">
              {reportSummaries.slice(0, 4).map((report) => {
                const client = clients.find((item) => item.client_id === report.client_id)
                return (
                  <Link
                    key={report.client_id}
                    href="/dashboard/reports"
                    className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-overlay)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{client?.client_name ?? "Client"}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{report.label ?? "Report ready"}</p>
                    </div>
                    <Badge variant="info">{plural(report.ready_count, "report ready", "reports ready")}</Badge>
                  </Link>
                )
              })}
            </div>
          ) : (
            <CardContent className="py-7 text-sm text-[var(--muted)]">
              Reports will appear here once clients have enough logged data.
            </CardContent>
          )}
        </Card>
      </DashboardSection>
    </div>
  )
}
