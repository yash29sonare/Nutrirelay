import Link from "next/link"
import {
  AlertTriangle,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Salad,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { formatRelativeDate } from "@/lib/format"
import type { ClientSummaryCard } from "@/lib/dashboard-reads"
import type { DashboardDataDTO } from "@/types/dashboard"

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

interface WorkspaceDashboardProps {
  data: DashboardDataDTO
  clientSummaries: ClientSummaryCard[]
  reportsReady: number | null
  userName: string | null
}

export function WorkspaceDashboard({
  data,
  clientSummaries,
  reportsReady,
  userName,
}: WorkspaceDashboardProps) {
  const displayName = userName ?? data.trainer.business_name ?? "Trainer"
  const summaryByClient = new Map(clientSummaries.map((client) => [client.client_id, client]))
  const attentionClients = data.clients.filter(
    (client) => client.active_strike_count > 0 || client.total_meals_logged_today === 0,
  )
  const mealsToday = data.clients.reduce((total, client) => total + client.total_meals_logged_today, 0)
  const noLogCount = data.clients.filter((client) => client.total_meals_logged_today === 0).length

  const todayCards = [
    { label: "Active clients", value: data.metrics.activeClients, icon: Users, tone: "text-sky-600 bg-sky-500/10" },
    { label: "Need attention", value: attentionClients.length, icon: AlertTriangle, tone: "text-amber-600 bg-amber-500/10" },
    { label: "Meals logged today", value: mealsToday, icon: Salad, tone: "text-emerald-600 bg-emerald-500/10" },
    ...(reportsReady === null
      ? []
      : [{ label: "Weekly reports ready", value: reportsReady, icon: FileCheck2, tone: "text-violet-600 bg-violet-500/10" }]),
  ]

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm text-[var(--muted)]">{formatCurrentDate()}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {getGreeting()}, {displayName}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Here is what needs your attention today.</p>
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

      <DashboardSection title="Coaching insights">
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {noLogCount === 0
                  ? "Every active client has logged a meal today."
                  : `${noLogCount} client${noLogCount === 1 ? " has" : "s have"} not logged meals today.`}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Based on today’s trainer-owned food logs.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {data.metrics.atRiskClients === 0
                  ? "No clients have active risk strikes."
                  : `${data.metrics.atRiskClients} client${data.metrics.atRiskClients === 1 ? " has" : "s have"} active risk indicators.`}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">Open the attention feed for the affected client.</p>
            </CardContent>
          </Card>
          {reportsReady !== null ? (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {reportsReady === 0
                    ? "No weekly client reports have data yet."
                    : `${reportsReady} weekly report${reportsReady === 1 ? " is" : "s are"} ready to preview.`}
                </p>
                <Link href="/dashboard/reports" className="mt-1 inline-flex text-xs font-medium text-brand-500 hover:text-brand-600">
                  Open reports
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </DashboardSection>

      <DashboardSection title="Attention feed">
        <Card>
          {attentionClients.length > 0 ? (
            <div className="divide-y divide-[var(--surface-border)]">
              {attentionClients.map((client) => {
                const reasons = [
                  client.total_meals_logged_today === 0 ? "No meals logged today" : null,
                  client.active_strike_count > 0
                    ? `${client.active_strike_count} active risk strike${client.active_strike_count === 1 ? "" : "s"}`
                    : null,
                ].filter((reason): reason is string => Boolean(reason))

                return (
                  <Link
                    key={client.client_id}
                    href={`/dashboard/clients/${client.client_id}`}
                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-overlay)]"
                  >
                    <AlertTriangle size={16} className="shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{client.client_name}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{reasons.join(" · ")}</p>
                    </div>
                    <Badge variant="warning">Review</Badge>
                    <ChevronRight size={14} className="shrink-0 text-[var(--muted)]" />
                  </Link>
                )
              })}
            </div>
          ) : (
            <CardContent className="flex items-center gap-3 py-7">
              <ClipboardCheck size={18} className="text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">No clients need attention right now.</p>
                <p className="mt-1 text-xs text-[var(--muted)]">New missed logs and risk indicators will appear here.</p>
              </div>
            </CardContent>
          )}
        </Card>
      </DashboardSection>

      <DashboardSection title="Client snapshot">
        <Card>
          {data.clients.length > 0 ? (
            <div className="divide-y divide-[var(--surface-border)]">
              {data.clients.slice(0, 8).map((client) => {
                const summary = summaryByClient.get(client.client_id)
                const needsAttention = attentionClients.some((item) => item.client_id === client.client_id)
                return (
                  <Link
                    key={client.client_id}
                    href={`/dashboard/clients/${client.client_id}`}
                    className="grid gap-2 px-5 py-4 transition-colors hover:bg-[var(--surface-overlay)] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{client.client_name}</p>
                      <p className="mt-0.5 text-xs capitalize text-[var(--muted)]">{formatGoal(summary?.goal_type)}</p>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {client.total_meals_logged_today} meal{client.total_meals_logged_today === 1 ? "" : "s"} today
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {summary?.last_logged ? formatRelativeDate(summary.last_logged) : "No activity today"}
                    </p>
                    <div className="flex items-center gap-2">
                      {needsAttention ? <Badge variant="warning">Attention</Badge> : <Badge variant="success">On track</Badge>}
                      <ChevronRight size={14} className="text-[var(--muted)]" />
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <CardContent className="py-8 text-center text-sm text-[var(--muted)]">No active clients yet.</CardContent>
          )}
        </Card>
      </DashboardSection>
    </div>
  )
}
