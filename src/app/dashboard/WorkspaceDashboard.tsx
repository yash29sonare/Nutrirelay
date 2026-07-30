import Link from "next/link"
import { AlertTriangle, CheckCircle2, MessageCircle, Salad, Settings, Users } from "lucide-react"
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
  meals_today: number
  last_activity_at: string | null
  pending_food_reviews: number
  pending_photo_reviews: number
  pending_voice_reviews: number
  pending_reply_reviews: number
  pending_updates: number
  report_ready_count: number
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
    return {
      client_id: client.client_id,
      meals_today: summary?.meals_today ?? client.total_meals_logged_today,
      last_activity_at: summary?.last_activity_at ?? summary?.last_logged ?? null,
      pending_food_reviews: summary?.pending_food_reviews ?? 0,
      pending_photo_reviews: summary?.pending_photo_reviews ?? 0,
      pending_voice_reviews: summary?.pending_voice_reviews ?? 0,
      pending_reply_reviews: summary?.pending_reply_reviews ?? 0,
      pending_updates: summary?.pending_updates ?? 0,
      report_ready_count: report?.ready_count ?? 0,
    }
  })
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
  const noMealClients = clients.filter((client) => client.meals_today === 0)
  const reviewClients = clients.filter((client) =>
    client.pending_food_reviews > 0
    || client.pending_photo_reviews > 0
    || client.pending_voice_reviews > 0
    || client.pending_reply_reviews > 0,
  )
  const reportClients = clients.filter((client) => client.report_ready_count > 0)
  const attentionClientIds = new Set([
    ...noMealClients.map((client) => client.client_id),
    ...reviewClients.map((client) => client.client_id),
    ...reportClients.map((client) => client.client_id),
  ])
  const pendingUpdateClients = clients.filter((client) => client.pending_updates > 0)
  const mealsToday = clients.reduce((total, client) => total + client.meals_today, 0)
  const totalReviewItems = clients.reduce((total, client) => total + client.pending_updates, 0)
  const latestActivity = clients
    .map((client) => client.last_activity_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a))[0] ?? null
  const whatsappConnected = whatsappConnection?.connected === true

  const todayCards = [
    { label: "Active clients", value: clients.length, icon: Users, tone: "text-sky-600 bg-sky-500/10" },
    { label: "Need attention", value: attentionClientIds.size, icon: AlertTriangle, tone: "text-amber-600 bg-amber-500/10" },
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
          <p className="mt-2 text-sm text-[var(--muted)]">Overall client status for today.</p>
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

      <DashboardSection title="Client status" description="Open Clients from the sidebar for individual client records.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">{attentionClientIds.size}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">clients need attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">{noMealClients.length}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">clients with no meal today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">{totalReviewItems}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">reply, food, photo, or voice reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">{reportClients.length}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">clients with reports ready</p>
            </CardContent>
          </Card>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Activity overview"
        actions={reportsReady > 0 ? <Badge variant="info">{plural(reportsReady, "report ready", "reports ready")}</Badge> : null}
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="py-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-[var(--muted)]">Logged meals today</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">{mealsToday}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Clients updated today</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">
                    {clients.filter((client) => client.meals_today > 0).length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Latest activity</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {latestActivity ? formatRelativeDate(latestActivity) : "No recent activity"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-5">
              {attentionClientIds.size > 0 ? (
                <AlertTriangle size={18} className="text-[var(--warning)]" />
              ) : (
                <CheckCircle2 size={18} className="text-[var(--success)]" />
              )}
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {attentionClientIds.size > 0 ? "Trainer review is pending" : "Everything is handled for now."}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {attentionClientIds.size > 0
                    ? "Use the Clients section to open affected client records."
                    : "New client updates will change these counts automatically."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardSection>
    </div>
  )
}
