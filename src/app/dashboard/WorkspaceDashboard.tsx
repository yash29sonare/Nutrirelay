import Link from "next/link"
import {
  Users, AlertTriangle, TrendingUp, Activity, Zap,
  ChevronRight, Mic, CreditCard,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { DashboardGrid } from "@/components/layout/DashboardGrid"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { StatCard } from "@/components/dashboard/StatCard"
import { InsightsPanel } from "./components/InsightsPanel"
import { EngagementFeed } from "./components/EngagementFeed"
import { formatPercent, formatRelativeDate } from "@/lib/format"
import { getClientRiskLevel } from "@/lib/domain/dashboardSemantics"
import type { DashboardDataDTO } from "@/types/dashboard"
import type { DashboardInsights } from "@/types/dashboard-insights"
import type { TrainerDailyFeed } from "@/types/engagement"
import type { EngagementEvent } from "@/types/engagement-events"

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

const EVENT_LABELS: Record<string, string> = {
  ACTION_CREATED: "Action Created",
  ACTION_COMPLETED: "Completed",
  ACTION_IGNORED: "Ignored",
  ACTION_SNOOZED: "Snoozed",
  TRAINER_NOTE_ADDED: "Note Added",
  CLIENT_STATE_UPDATED: "State Updated",
  ACTION_SUPPRESSED: "Suppressed",
}

interface QuickActionCardProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  iconBg: string
  iconColor: string
}

function QuickActionCard({ href, icon, title, description, iconBg, iconColor }: QuickActionCardProps) {
  return (
    <Link href={href} className="block group">
      <Card className="hover:bg-[var(--surface-overlay)] transition-colors duration-100 h-full">
        <CardContent className="flex items-start gap-4 py-5">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${iconBg} ${iconColor}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-brand-500 transition-colors">
              {title}
            </p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{description}</p>
          </div>
          <ChevronRight size={14} className="text-[var(--muted)] shrink-0 mt-1" />
        </CardContent>
      </Card>
    </Link>
  )
}

interface WorkspaceDashboardProps {
  data: DashboardDataDTO
  insights: DashboardInsights
  feed: TrainerDailyFeed
  events: EngagementEvent[]
  userName: string | null
}

export function WorkspaceDashboard({
  data,
  insights,
  feed,
  events,
  userName,
}: WorkspaceDashboardProps) {
  const displayName = userName ?? data.trainer.business_name ?? "Trainer"
  const totalActions = feed.highPriority.length + feed.mediumPriority.length + feed.lowPriority.length
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const latestEvents = sortedEvents.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* ── 1. Welcome Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)] tracking-tight">
            {getGreeting()}, {displayName}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">{formatCurrentDate()}</p>
          {data.trainer.business_name && (
            <p className="text-xs text-[var(--muted)] mt-0.5">{data.trainer.business_name}</p>
          )}
        </div>
      </div>

      {/* ── 2. KPI Overview ── */}
      <DashboardSection title="KPI Overview">
        <DashboardGrid columns={4}>
          <StatCard
            icon={<Users size={18} />}
            value={data.metrics.activeClients}
            label="Active clients"
            iconBg="bg-brand-500/10"
            iconColor="text-brand-500"
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            value={formatPercent(data.metrics.complianceRate)}
            label="Compliance rate"
            iconBg="bg-[var(--success)]/10"
            iconColor="text-[var(--success)]"
          />
          <StatCard
            icon={<Activity size={18} />}
            value={formatPercent(data.metrics.weeklyProgress)}
            label="Weekly progress"
            iconBg="bg-sky-500/10"
            iconColor="text-sky-500"
          />
          <StatCard
            icon={<AlertTriangle size={18} />}
            value={data.metrics.atRiskClients}
            label="At-risk clients"
            iconBg="bg-red-500/10"
            iconColor="text-red-500"
          />
        </DashboardGrid>
      </DashboardSection>

      {/* ── 3. AI Coach Summary ── */}
      <InsightsPanel insights={insights} />

      {/* ── 4. Today's Engagement Queue ── */}
      {totalActions > 0 ? (
        <EngagementFeed feed={feed} />
      ) : (
        <DashboardSection title="Action feed">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-[var(--muted)]">
                No pending actions — everything is on track.
              </p>
            </CardContent>
          </Card>
        </DashboardSection>
      )}

      {/* ── 5. Client Snapshot + 6. Performance Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Snapshot */}
        <DashboardSection title="Client Snapshot">
          <Card>
            {data.clients.length > 0 ? (
              <div className="divide-y divide-[var(--surface-border)]">
                {data.clients.slice(0, 5).map((client) => {
                  const riskLevel = getClientRiskLevel(client)
                  return (
                    <Link
                      key={client.client_id}
                      href={`/dashboard/clients/${client.client_id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-overlay)] transition-colors duration-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {client.client_name}
                        </p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {client.total_meals_logged_today} meal{client.total_meals_logged_today !== 1 ? "s" : ""} today · {client.total_calories_today} kcal
                        </p>
                      </div>
                      <Badge
                        variant={
                          riskLevel === "high"
                            ? "danger"
                            : riskLevel === "medium"
                              ? "warning"
                              : client.total_meals_logged_today > 0
                                ? "success"
                                : "default"
                        }
                      >
                        {riskLevel === "high"
                          ? `${client.active_strike_count} strikes`
                          : riskLevel === "medium"
                            ? "1 strike"
                            : client.total_meals_logged_today > 0
                              ? "On track"
                              : "No meals"}
                      </Badge>
                      <ChevronRight size={14} className="text-[var(--muted)] shrink-0" />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-[var(--muted)]">No clients yet.</p>
              </div>
            )}
            {data.clients.length > 5 && (
              <div className="px-5 py-3 border-t border-[var(--surface-border)]">
                <Link
                  href="/dashboard/clients"
                  className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                >
                  View all {data.clients.length} clients →
                </Link>
              </div>
            )}
          </Card>
        </DashboardSection>

        {/* Performance Trend */}
        <DashboardSection title="Performance Trend">
          <Card>
            <CardContent className="py-5">
              {data.trends.complianceOverTime.length > 0 ? (
                <div className="space-y-2">
                  {data.trends.complianceOverTime.slice(-7).map((entry) => {
                    const pct = Math.min(100, Math.max(0, entry.compliance_rate))
                    const label = new Date(entry.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                    })
                    return (
                      <div key={entry.date} className="flex items-center gap-3">
                        <span className="text-xs text-[var(--muted)] w-16 shrink-0">{label}</span>
                        <div className="flex-1 h-5 rounded-md bg-[var(--surface-border)] overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct >= 70
                                ? "var(--success)"
                                : pct >= 40
                                  ? "var(--warning)"
                                  : "var(--destructive)",
                            }}
                          />
                        </div>
                        <span className="text-xs text-[var(--foreground)] tabular-nums w-10 text-right">
                          {Math.round(pct)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)] text-center py-6">
                  No compliance data available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </DashboardSection>
      </div>

      {/* ── 7. Recent Events ── */}
      <DashboardSection title="Recent Events">
        <Card>
          {latestEvents.length > 0 ? (
            <div className="divide-y divide-[var(--surface-border)]">
              {latestEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span className="text-xs text-[var(--muted)] font-mono w-28 shrink-0">
                    {formatRelativeDate(event.created_at)}
                  </span>
                  <Badge
                    variant={
                      event.event_type === "ACTION_CREATED"
                        ? "brand"
                        : event.event_type === "ACTION_COMPLETED"
                          ? "success"
                          : "default"
                    }
                  >
                    {EVENT_LABELS[event.event_type] ?? event.event_type}
                  </Badge>
                  {event.payload && typeof event.payload === "object" && "reason" in event.payload && (
                    <span className="text-xs text-[var(--muted)] truncate">
                      {String(event.payload.reason)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--muted)]">No events recorded yet.</p>
            </div>
          )}
          {events.length > 5 && (
            <div className="px-5 py-3 border-t border-[var(--surface-border)]">
              <Link
                href="/dashboard/events"
                className="text-xs text-brand-500 hover:text-brand-600 font-medium"
              >
                View all {events.length} events →
              </Link>
            </div>
          )}
        </Card>
      </DashboardSection>

      {/* ── 8. Quick Actions ── */}
      <DashboardSection title="Quick Actions">
        <DashboardGrid columns={3}>
          <QuickActionCard
            href="/dashboard/clients"
            icon={<Users size={20} />}
            title="Clients"
            description="View and manage your client roster"
            iconBg="bg-brand-500/10"
            iconColor="text-brand-500"
          />
          <QuickActionCard
            href="/dashboard/engagement"
            icon={<Zap size={20} />}
            title="Engagement"
            description="Review AI-powered action recommendations"
            iconBg="bg-amber-500/10"
            iconColor="text-amber-500"
          />
          <QuickActionCard
            href="/dashboard/events"
            icon={<Activity size={20} />}
            title="Events"
            description="Immutable event log for auditing"
            iconBg="bg-sky-500/10"
            iconColor="text-sky-500"
          />
          <QuickActionCard
            href="/dashboard/voice-notes"
            icon={<Mic size={20} />}
            title="Voice Notes"
            description="Recover failed voice note transcriptions"
            iconBg="bg-purple-500/10"
            iconColor="text-purple-500"
          />
          <QuickActionCard
            href="/dashboard/queue"
            icon={<CreditCard size={20} />}
            title="Payment Queue"
            description="Approve or reject pending UPI payments"
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-500"
          />
        </DashboardGrid>
      </DashboardSection>
    </div>
  )
}
