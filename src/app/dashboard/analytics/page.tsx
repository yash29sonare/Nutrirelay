import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { StatCard } from "@/components/dashboard/StatCard"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { DashboardGrid } from "@/components/layout/DashboardGrid"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { getDashboardData } from "@/lib/operations/dashboard"
import { getEvents } from "@/lib/events/engagementEventStore"
import { createClient } from "@/utils/supabase/server"
import { buildAnalyticsDTO } from "@/lib/analytics/analyticsEngine"
import { formatPercent, formatDate, formatRelativeDate, formatNumber } from "@/lib/format"
import {
  AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  Activity, MessageSquare, Bell, Send,
  UtensilsCrossed, Users, Zap, ChevronRight,
  History, Eye, BarChart3, Clock, XCircle,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

const EVENT_ICONS: Record<string, React.ReactNode> = {
  COMMUNICATION_QUEUED: <Clock size={12} />,
  COMMUNICATION_SENT: <Send size={12} />,
  COMMUNICATION_FAILED: <XCircle size={12} />,
  CONVERSATION_PLANNED: <MessageSquare size={12} />,
  CONVERSATION_APPROVED: <CheckCircle size={12} />,
  REMINDER_PLANNED: <Bell size={12} />,
  REMINDER_APPROVED: <CheckCircle size={12} />,
  MEAL_RECORDED: <UtensilsCrossed size={12} />,
  MEAL_REVIEWED: <Eye size={12} />,
  AUTOMATION_STARTED: <Zap size={12} />,
  AUTOMATION_COMPLETED: <CheckCircle size={12} />,
  AUTOMATION_FAILED: <AlertTriangle size={12} />,
}

const EVENT_VARIANTS: Record<string, "brand" | "success" | "warning" | "danger" | "info" | "default"> = {
  COMMUNICATION_QUEUED: "info",
  COMMUNICATION_SENT: "success",
  COMMUNICATION_FAILED: "danger",
  CONVERSATION_PLANNED: "info",
  CONVERSATION_APPROVED: "success",
  REMINDER_PLANNED: "brand",
  REMINDER_APPROVED: "success",
  MEAL_RECORDED: "brand",
  MEAL_REVIEWED: "success",
  AUTOMATION_STARTED: "info",
  AUTOMATION_COMPLETED: "success",
  AUTOMATION_FAILED: "danger",
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authUserId = user?.id ?? null

  if (!authUserId) {
    return (
      <PageContainer>
        <PageHeader title="Analytics" description="Sign in to view analytics." />
      </PageContainer>
    )
  }

  const result = await getDashboardData(authUserId)

  if (!result.success) {
    return (
      <PageContainer>
        <PageHeader title="Analytics" />
        <ErrorState title="Unable to load analytics." description={result.error.message} />
      </PageContainer>
    )
  }

  const dto = result.data
  const events = await getEvents(authUserId)
  const analytics = buildAnalyticsDTO(dto, events)

  const quickLinks = [
    { href: "/dashboard/clients", label: "Client roster", icon: <Users size={14} /> },
    { href: "/dashboard/communications", label: "Communications", icon: <MessageSquare size={14} /> },
    { href: "/dashboard/conversations", label: "Conversations", icon: <MessageSquare size={14} /> },
    { href: "/dashboard/events", label: "Event log", icon: <Activity size={14} /> },
    { href: "/dashboard/engagement", label: "Engagement center", icon: <Zap size={14} /> },
  ]

  const riskBadgeVariant: Record<string, "danger" | "warning" | "default"> = {
    high: "danger",
    medium: "warning",
    low: "default",
  }

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description={`Business intelligence for ${dto.trainer.business_name ?? "your practice"}. All metrics derived from existing data.`}
      />

      {/* ════════════════════════════════════════════════════════
          SECTION 1: Business KPIs
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Business KPIs"
        description="Key performance indicators derived from dashboard, meal, and event data"
      >
        <DashboardGrid columns={4}>
          <StatCard
            icon={<Users size={16} />}
            value={dto.metrics.activeClients}
            label="Active clients"
            iconBg="bg-brand-500/10"
            iconColor="text-brand-500"
          />
          <StatCard
            icon={<UtensilsCrossed size={16} />}
            value={formatNumber(analytics.businessKPIs.mealsToday)}
            label="Meals logged today"
            iconBg="bg-[var(--success)]/10"
            iconColor="text-[var(--success)]"
            trend={analytics.clientHealth.totalClients > 0 ? {
              value: `${analytics.mealAnalytics.avgMealsPerClient} avg per client`,
              positive: true,
            } : undefined}
          />
          <StatCard
            icon={<MessageSquare size={16} />}
            value={analytics.businessKPIs.pendingConversations}
            label="Pending conversations"
            iconBg="bg-[var(--info)]/10"
            iconColor="text-[var(--info)]"
            trend={analytics.businessKPIs.pendingConversations > 0 ? { value: "Needs review", positive: false } : undefined}
          />
          <StatCard
            icon={<Send size={16} />}
            value={`${analytics.businessKPIs.commSuccessRate}%`}
            label="Comm success rate"
            iconBg="bg-[var(--success)]/10"
            iconColor="text-[var(--success)]"
            trend={analytics.businessKPIs.commSentToday > 0 ? { value: `${analytics.businessKPIs.commSentToday} sent today`, positive: true } : undefined}
          />
        </DashboardGrid>

        <div className="mt-3">
          <DashboardGrid columns={4}>
            <StatCard
              icon={<Eye size={16} />}
              value={formatNumber(analytics.businessKPIs.mealsReviewedToday)}
              label="Meals reviewed today"
              iconBg="bg-[var(--success)]/10"
              iconColor="text-[var(--success)]"
            />
            <StatCard
              icon={<Clock size={16} />}
              value={analytics.businessKPIs.pendingReviews}
              label="Pending reviews"
              iconBg="bg-[var(--warning)]/10"
              iconColor="text-[var(--warning)]"
            />
            <StatCard
              icon={<Bell size={16} />}
              value={analytics.businessKPIs.pendingReminders}
              label="Pending reminders"
              iconBg="bg-[var(--warning)]/10"
              iconColor="text-[var(--warning)]"
            />
            <StatCard
              icon={<BarChart3 size={16} />}
              value={formatNumber(analytics.businessKPIs.commQueuedToday)}
              label="Queued today"
              iconBg="bg-[var(--info)]/10"
              iconColor="text-[var(--info)]"
            />
          </DashboardGrid>
        </div>
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTION 2: Client Health
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Client Health"
        description="Risk, compliance, and trend distribution across all clients"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Risk Distribution
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-[var(--destructive)]">
                  <AlertTriangle size={12} />
                  High risk
                </span>
                <span className="font-semibold text-[var(--foreground)] tabular-nums">
                  {analytics.clientHealth.riskDistribution.high}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-[var(--warning)]">
                  <AlertTriangle size={12} />
                  Medium risk
                </span>
                <span className="font-semibold text-[var(--foreground)] tabular-nums">
                  {analytics.clientHealth.riskDistribution.medium}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-[var(--success)]">
                  <CheckCircle size={12} />
                  Low risk
                </span>
                <span className="font-semibold text-[var(--foreground)] tabular-nums">
                  {analytics.clientHealth.riskDistribution.low}
                </span>
              </div>
              <div className="pt-1 border-t border-[var(--surface-border)]">
                <p className="text-xs text-[var(--muted)]">
                  At-risk: {analytics.clientHealth.atRiskCount} of {analytics.clientHealth.totalClients} clients
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <CheckCircle size={14} />
                Compliance
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Overall rate</span>
                <span className="font-semibold text-[var(--foreground)] tabular-nums">
                  {formatPercent(analytics.clientHealth.complianceRate)}
                </span>
              </div>
              <Badge
                variant={
                  analytics.clientHealth.complianceLevel === "excellent" || analytics.clientHealth.complianceLevel === "good"
                    ? "success"
                    : analytics.clientHealth.complianceLevel === "moderate"
                      ? "default"
                      : "warning"
                }
                className="w-fit"
              >
                {analytics.clientHealth.complianceLevel}
              </Badge>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--success)]">Logged today</span>
                <span className="font-semibold text-[var(--foreground)] tabular-nums">
                  {analytics.clientHealth.compliantClients}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">No activity today</span>
                <span className="font-semibold text-[var(--foreground)] tabular-nums">
                  {analytics.clientHealth.nonCompliantClients}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <TrendingUp size={14} />
                Performance Trend
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {analytics.clientHealth.performanceTrend === "improving" ? (
                  <TrendingUp size={18} className="text-[var(--success)]" />
                ) : analytics.clientHealth.performanceTrend === "declining" ? (
                  <TrendingDown size={18} className="text-[var(--destructive)]" />
                ) : (
                  <Activity size={18} className="text-[var(--muted)]" />
                )}
                <span className="text-lg font-bold text-[var(--foreground)] capitalize">
                  {analytics.clientHealth.performanceTrend}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Weekly progress: {analytics.clientHealth.weeklyProgress > 0 ? "+" : ""}
                {analytics.clientHealth.weeklyProgress}% vs last week
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTION 3: Meal Analytics
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Meal Analytics"
        description="Aggregate meal metrics from existing meal domain data"
      >
        <DashboardGrid columns={3}>
          <StatCard
            icon={<UtensilsCrossed size={16} />}
            value={formatNumber(analytics.mealAnalytics.mealsToday)}
            label="Meals today"
            iconBg="bg-brand-500/10"
            iconColor="text-brand-500"
          />
          <StatCard
            icon={<History size={16} />}
            value={formatNumber(analytics.mealAnalytics.meals7Days)}
            label="Meals in 7 days"
            iconBg="bg-[var(--info)]/10"
            iconColor="text-[var(--info)]"
          />
          <StatCard
            icon={<Eye size={16} />}
            value={`${analytics.mealAnalytics.reviewRate}%`}
            label="Review rate"
            iconBg="bg-[var(--success)]/10"
            iconColor="text-[var(--success)]"
            trend={{ value: `${formatNumber(analytics.mealAnalytics.totalReviewEvents)} reviewed`, positive: true }}
          />
        </DashboardGrid>

        <Card className="mt-4">
          <CardHeader>
            <h3 className="text-sm font-medium text-[var(--foreground)]">
              7-Day Macro Totals
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[var(--muted)]">Calories</p>
                <p className="text-lg font-semibold text-[var(--foreground)] tabular-nums">
                  {formatNumber(analytics.mealAnalytics.totalCaloriesWeek)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Protein</p>
                <p className="text-lg font-semibold text-[var(--foreground)] tabular-nums">
                  {formatNumber(analytics.mealAnalytics.totalProteinWeek)}g
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Total meals recorded</p>
                <p className="text-lg font-semibold text-[var(--foreground)] tabular-nums">
                  {formatNumber(analytics.mealAnalytics.totalMealEvents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTION 4: Communication Analytics
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Communication Analytics"
        description="Derived exclusively from engagement event store"
      >
        <DashboardGrid columns={3}>
          <StatCard
            icon={<MessageSquare size={16} />}
            value={formatNumber(analytics.communicationAnalytics.conversationPlansTotal)}
            label="Total conversation plans"
            iconBg="bg-[var(--info)]/10"
            iconColor="text-[var(--info)]"
            trend={analytics.communicationAnalytics.pendingConversations > 0 ? {
              value: `${analytics.communicationAnalytics.pendingConversations} pending`,
              positive: false,
            } : { value: "All handled", positive: true }}
          />
          <StatCard
            icon={<Bell size={16} />}
            value={formatNumber(analytics.communicationAnalytics.reminderPlansTotal)}
            label="Total reminder plans"
            iconBg="bg-[var(--warning)]/10"
            iconColor="text-[var(--warning)]"
            trend={analytics.communicationAnalytics.pendingReminders > 0 ? {
              value: `${analytics.communicationAnalytics.pendingReminders} pending`,
              positive: false,
            } : { value: "All handled", positive: true }}
          />
          <StatCard
            icon={<Zap size={16} />}
            value={formatNumber(analytics.communicationAnalytics.automationCompletions)}
            label="Automation runs"
            iconBg="bg-brand-500/10"
            iconColor="text-brand-500"
            trend={analytics.communicationAnalytics.automationFailures > 0 ? {
              value: `${analytics.communicationAnalytics.automationFailures} failed`,
              positive: false,
            } : { value: `${analytics.communicationAnalytics.automationStarts} started`, positive: true }}
          />
        </DashboardGrid>

        <Card className="mt-4">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--muted)]">Queued today</p>
                <p className="font-semibold text-[var(--foreground)] tabular-nums">{analytics.communicationAnalytics.commQueuedToday}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Sent today</p>
                <p className="font-semibold text-[var(--foreground)] tabular-nums">{analytics.communicationAnalytics.commSentToday}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Failed today</p>
                <p className="font-semibold text-[var(--destructive)] tabular-nums">{analytics.communicationAnalytics.commFailedToday}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Success rate</p>
                <p className="font-semibold text-[var(--success)] tabular-nums">{analytics.communicationAnalytics.commSuccessRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTIONS 5 + 6: Timeline Activity + Performance Trends
          ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <DashboardSection
          title="Timeline Activity"
          description={`${analytics.timelineActivity.reduce((s, g) => s + g.events.length, 0)} recent communication and meal events`}
        >
          {analytics.timelineActivity.length > 0 ? (
            <div className="space-y-5">
              {analytics.timelineActivity.map((group) => (
                <div key={group.dateKey}>
                  <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                    {formatDate(group.dateKey)}
                  </h3>
                  <div className="space-y-1.5">
                    {group.events.map((ev) => (
                      <div
                        key={ev.eventId}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--surface-border)]"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--surface-overlay)] shrink-0">
                          {EVENT_ICONS[ev.eventType] ?? <Activity size={12} />}
                        </div>
                        <Badge
                          variant={EVENT_VARIANTS[ev.eventType] ?? "default"}
                          className="shrink-0 text-[10px] px-1.5 py-0.5"
                        >
                          {ev.label}
                        </Badge>
                        <span className="text-xs text-[var(--muted)] flex-1 truncate min-w-0">
                          {ev.clientName}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] shrink-0 tabular-nums">
                          {formatRelativeDate(ev.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={<Activity size={16} />}
                  title="No activity yet"
                  description="Events will appear once communication and meal activity begins."
                />
              </CardContent>
            </Card>
          )}
        </DashboardSection>

        <div className="space-y-6">
          <DashboardSection
            title="Performance Trends"
            description="7-day compliance trend"
          >
            {analytics.performanceTrends.length > 0 ? (
              <Card>
                <CardContent className="space-y-3 py-4">
                  {analytics.performanceTrends.map((entry) => (
                    <div key={entry.date} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--muted)]">
                          {formatDate(entry.date)}
                        </span>
                        <span className="text-[var(--foreground)] font-medium tabular-nums">
                          {Math.round(entry.complianceRate)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface-border)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all"
                          style={{ width: `${Math.round(entry.complianceRate)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6">
                  <div className="flex flex-col items-center text-center">
                    <BarChart3 size={16} className="text-[var(--muted)] mb-2" />
                    <p className="text-xs text-[var(--muted)]">No trend data available</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </DashboardSection>

          <DashboardSection
            title="Top Attention Clients"
            description="Clients needing the most attention"
          >
            <Card>
              <div className="divide-y divide-[var(--surface-border)]">
                {analytics.topAttentionClients.map((client) => (
                  <Link
                    key={client.clientId}
                    href={`/dashboard/clients/${client.clientId}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-overlay)] transition-colors"
                  >
                    <Badge
                      variant={riskBadgeVariant[client.riskLevel] ?? "default"}
                      className="shrink-0 text-[10px] px-1.5 py-0.5"
                    >
                      {client.riskLevel}
                    </Badge>
                    <span className="text-sm text-[var(--foreground)] flex-1 min-w-0 truncate">
                      {client.clientName}
                    </span>
                    <span className="text-xs text-[var(--muted)] tabular-nums shrink-0">
                      {client.mealsLoggedToday} meals
                    </span>
                    <ChevronRight size={14} className="text-[var(--muted)] shrink-0" />
                  </Link>
                ))}
              </div>
            </Card>
            {dto.clients.length > 8 && (
              <p className="text-xs text-[var(--muted)] text-center mt-2">
                Showing top {analytics.topAttentionClients.length} of {dto.clients.length} clients
              </p>
            )}
          </DashboardSection>

          <DashboardSection title="Quick Navigation">
            <Card>
              <CardContent className="divide-y divide-[var(--surface-border)] py-1">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 py-3 px-1 text-sm text-[var(--foreground)] hover:text-brand-500 transition-colors"
                  >
                    <span className="text-[var(--muted)] shrink-0">{link.icon}</span>
                    <span>{link.label}</span>
                    <ChevronRight size={14} className="ml-auto text-[var(--muted)]" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </DashboardSection>
        </div>
      </div>
    </PageContainer>
  )
}
