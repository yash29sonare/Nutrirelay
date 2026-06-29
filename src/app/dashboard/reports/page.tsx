import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { StatCard } from "@/components/dashboard/StatCard"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { DashboardGrid } from "@/components/layout/DashboardGrid"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { InlineNotice } from "@/components/ui/InlineNotice"
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
  FileText, Download, Calendar, Printer,
  ArrowRight, RefreshCw,
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

const riskBadgeVariant: Record<string, "danger" | "warning" | "default"> = {
  high: "danger",
  medium: "warning",
  low: "default",
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authUserId = user?.id ?? null

  if (!authUserId) {
    return (
      <PageContainer>
        <PageHeader title="Reports" description="Sign in to view reports." />
      </PageContainer>
    )
  }

  const result = await getDashboardData(authUserId)

  if (!result.success) {
    return (
      <PageContainer>
        <PageHeader title="Reports" />
        <ErrorState title="Unable to load reports." description={result.error.message} />
      </PageContainer>
    )
  }

  const dto = result.data
  const events = await getEvents(authUserId)
  const analytics = buildAnalyticsDTO(dto, events)

  const reportDate = formatDate(new Date().toISOString())

  const quickLinks = [
    { href: "/dashboard/analytics", label: "Analytics", icon: <BarChart3 size={14} /> },
    { href: "/dashboard/communications", label: "Communications", icon: <MessageSquare size={14} /> },
    { href: "/dashboard/clients", label: "Clients", icon: <Users size={14} /> },
    { href: "/dashboard/events", label: "Events", icon: <Activity size={14} /> },
    { href: "/dashboard", label: "Dashboard", icon: <Activity size={14} /> },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description={`Comprehensive business report — ${reportDate}. All metrics derived from existing data.`}
      />

      {/* ════════════════════════════════════════════════════════
          SECTION 1: Report Summary
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Report Summary"
        description={`Snapshot for ${reportDate}`}
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
            value={formatNumber(analytics.mealAnalytics.mealsToday)}
            label="Total meals"
            iconBg="bg-[var(--success)]/10"
            iconColor="text-[var(--success)]"
            trend={{ value: `${analytics.mealAnalytics.meals7Days} in 7 days`, positive: true }}
          />
          <StatCard
            icon={<Eye size={16} />}
            value={formatNumber(analytics.mealAnalytics.totalReviewEvents)}
            label="Total reviews"
            iconBg="bg-[var(--info)]/10"
            iconColor="text-[var(--info)]"
            trend={{ value: `${analytics.mealAnalytics.reviewRate}% rate`, positive: analytics.mealAnalytics.reviewRate >= 50 }}
          />
          <StatCard
            icon={<MessageSquare size={16} />}
            value={analytics.businessKPIs.pendingConversations}
            label="Pending conversations"
            iconBg="bg-[var(--warning)]/10"
            iconColor="text-[var(--warning)]"
            trend={analytics.businessKPIs.pendingConversations > 0
              ? { value: "Needs review", positive: false }
              : { value: "All handled", positive: true }
            }
          />
        </DashboardGrid>

        <div className="mt-3">
          <DashboardGrid columns={4}>
            <StatCard
              icon={<Bell size={16} />}
              value={analytics.businessKPIs.pendingReminders}
              label="Pending reminders"
              iconBg="bg-[var(--warning)]/10"
              iconColor="text-[var(--warning)]"
            />
            <StatCard
              icon={<Send size={16} />}
              value={`${analytics.businessKPIs.commSuccessRate}%`}
              label="Comm success rate"
              iconBg="bg-[var(--success)]/10"
              iconColor="text-[var(--success)]"
              trend={{ value: `${analytics.businessKPIs.commSentToday} sent today`, positive: true }}
            />
            <StatCard
              icon={<Zap size={16} />}
              value={formatNumber(
                analytics.communicationAnalytics.automationStarts +
                analytics.communicationAnalytics.automationCompletions +
                analytics.communicationAnalytics.automationFailures,
              )}
              label="Automation runs"
              iconBg="bg-brand-500/10"
              iconColor="text-brand-500"
              trend={analytics.communicationAnalytics.automationFailures > 0
                ? { value: `${analytics.communicationAnalytics.automationFailures} failed`, positive: false }
                : { value: "No failures", positive: true }
              }
            />
            <StatCard
              icon={<RefreshCw size={16} />}
              value={formatNumber(dto.metrics.weeklyProgress)}
              label="Weekly progress %"
              iconBg="bg-[var(--info)]/10"
              iconColor="text-[var(--info)]"
              trend={{
                value: dto.metrics.weeklyProgress > 0 ? "Improving" : "Declining",
                positive: dto.metrics.weeklyProgress > 0,
              }}
            />
          </DashboardGrid>
        </div>
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTION 2: Business Snapshot
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Business Snapshot"
        description="Printable report cards derived from analytics data"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-brand-500">
            <CardHeader>
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Client Health
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">At risk</span>
                  <span className="font-semibold tabular-nums">{analytics.clientHealth.atRiskCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Compliant today</span>
                  <span className="font-semibold tabular-nums">{analytics.clientHealth.compliantClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Compliance rate</span>
                  <span className="font-semibold tabular-nums">{formatPercent(analytics.clientHealth.complianceRate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[var(--success)]">
            <CardHeader>
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Meal Activity
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Today</span>
                  <span className="font-semibold tabular-nums">{formatNumber(analytics.mealAnalytics.mealsToday)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">7-day total</span>
                  <span className="font-semibold tabular-nums">{formatNumber(analytics.mealAnalytics.meals7Days)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Review rate</span>
                  <span className="font-semibold tabular-nums">{analytics.mealAnalytics.reviewRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[var(--info)]">
            <CardHeader>
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Communications
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Queued today</span>
                  <span className="font-semibold tabular-nums">{analytics.communicationAnalytics.commQueuedToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Sent today</span>
                  <span className="font-semibold tabular-nums">{analytics.communicationAnalytics.commSentToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Success rate</span>
                  <span className="font-semibold tabular-nums">{analytics.communicationAnalytics.commSuccessRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[var(--warning)]">
            <CardHeader>
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Automation
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Total runs</span>
                  <span className="font-semibold tabular-nums">
                    {formatNumber(
                      analytics.communicationAnalytics.automationStarts +
                      analytics.communicationAnalytics.automationCompletions +
                      analytics.communicationAnalytics.automationFailures,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Completed</span>
                  <span className="font-semibold tabular-nums">{analytics.communicationAnalytics.automationCompletions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Failed</span>
                  <span className="font-semibold tabular-nums text-[var(--destructive)]">
                    {analytics.communicationAnalytics.automationFailures}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTION 3: Client Health Report
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Client Health Report"
        description="Risk, compliance, and performance trend data reused from analytics domain"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                  <AlertTriangle size={12} /> High
                </span>
                <span className="font-semibold tabular-nums">{analytics.clientHealth.riskDistribution.high}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-[var(--warning)]">
                  <AlertTriangle size={12} /> Medium
                </span>
                <span className="font-semibold tabular-nums">{analytics.clientHealth.riskDistribution.medium}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-[var(--success)]">
                  <CheckCircle size={12} /> Low
                </span>
                <span className="font-semibold tabular-nums">{analytics.clientHealth.riskDistribution.low}</span>
              </div>
              <div className="pt-1 border-t border-[var(--surface-border)]">
                <p className="text-xs text-[var(--muted)]">
                  {analytics.clientHealth.atRiskCount} of {analytics.clientHealth.totalClients} clients at risk
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <CheckCircle size={14} />
                Compliance Report
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Compliance rate</span>
                <span className="font-semibold tabular-nums">{formatPercent(analytics.clientHealth.complianceRate)}</span>
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
                <span className="text-[var(--success)]">Compliant today</span>
                <span className="font-semibold tabular-nums">{analytics.clientHealth.compliantClients}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">No activity today</span>
                <span className="font-semibold tabular-nums">{analytics.clientHealth.nonCompliantClients}</span>
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
                {analytics.clientHealth.weeklyProgress}%
              </p>
              <div className="pt-2">
                <p className="text-xs font-medium text-[var(--muted)] mb-2">Compliance over time</p>
                {analytics.performanceTrends.length > 0 ? (
                  <div className="space-y-1.5">
                    {analytics.performanceTrends.slice(-5).map((entry) => (
                      <div key={entry.date} className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--muted)] w-20 shrink-0">
                          {formatDate(entry.date)}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${Math.round(entry.complianceRate)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--foreground)] tabular-nums w-8 text-right">
                          {Math.round(entry.complianceRate)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted)]">No trend data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {analytics.topAttentionClients.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Clients Needing Attention
              </h3>
            </CardHeader>
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
        )}
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTION 4: Meal Report
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Meal Report"
        description="Aggregate meal, review, and macro metrics from analytics domain"
      >
        <DashboardGrid columns={3}>
          <StatCard
            icon={<UtensilsCrossed size={16} />}
            value={formatNumber(analytics.mealAnalytics.mealsToday)}
            label="Meals today"
            iconBg="bg-brand-500/10"
            iconColor="text-brand-500"
            trend={{ value: `${analytics.mealAnalytics.avgMealsPerClient} avg per client`, positive: true }}
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
          <CardContent className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--muted)]">Total recorded</p>
                <p className="font-semibold text-[var(--foreground)] tabular-nums">
                  {formatNumber(analytics.mealAnalytics.totalMealEvents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Reviewed</p>
                <p className="font-semibold text-[var(--foreground)] tabular-nums">
                  {formatNumber(analytics.mealAnalytics.totalReviewEvents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Pending</p>
                <p className="font-semibold text-[var(--warning)] tabular-nums">
                  {analytics.businessKPIs.pendingReviews}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">7-day calories</p>
                <p className="font-semibold text-[var(--foreground)] tabular-nums">
                  {formatNumber(analytics.mealAnalytics.totalCaloriesWeek)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-3">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--muted)]">7-day calories</p>
                <p className="font-semibold text-[var(--foreground)] tabular-nums">
                  {formatNumber(analytics.mealAnalytics.totalCaloriesWeek)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">7-day protein</p>
                <p className="font-semibold text-[var(--foreground)] tabular-nums">
                  {formatNumber(analytics.mealAnalytics.totalProteinWeek)}g
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Avg per client</p>
                <p className="font-semibold text-[var(--foreground)] tabular-nums">
                  {analytics.mealAnalytics.avgMealsPerClient}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTION 5: Communication Report
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Communication Report"
        description="Conversation, reminder, delivery, and automation metrics from event store"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <MessageSquare size={14} />
                Conversations
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Total plans</span>
                <span className="font-semibold tabular-nums">{formatNumber(analytics.communicationAnalytics.conversationPlansTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Pending</span>
                <span className="font-semibold tabular-nums text-[var(--warning)]">
                  {analytics.communicationAnalytics.pendingConversations}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--success)]">Handled</span>
                <span className="font-semibold tabular-nums">
                  {Math.max(0, analytics.communicationAnalytics.conversationPlansTotal - analytics.communicationAnalytics.pendingConversations)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                <Bell size={14} />
                Reminders
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Total plans</span>
                <span className="font-semibold tabular-nums">{formatNumber(analytics.communicationAnalytics.reminderPlansTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Pending</span>
                <span className="font-semibold tabular-nums text-[var(--warning)]">
                  {analytics.communicationAnalytics.pendingReminders}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--success)]">Handled</span>
                <span className="font-semibold tabular-nums">
                  {Math.max(0, analytics.communicationAnalytics.reminderPlansTotal - analytics.communicationAnalytics.pendingReminders)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
              <Send size={14} />
              Delivery & Automation Summary
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--muted)]">Queued today</p>
                <p className="font-semibold tabular-nums">{analytics.communicationAnalytics.commQueuedToday}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Sent today</p>
                <p className="font-semibold tabular-nums">{analytics.communicationAnalytics.commSentToday}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Failed today</p>
                <p className="font-semibold tabular-nums text-[var(--destructive)]">{analytics.communicationAnalytics.commFailedToday}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Success rate</p>
                <p className="font-semibold tabular-nums text-[var(--success)]">{analytics.communicationAnalytics.commSuccessRate}%</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--surface-border)]">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[var(--muted)]">Automation starts</p>
                  <p className="font-semibold tabular-nums">{analytics.communicationAnalytics.automationStarts}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Completed</p>
                  <p className="font-semibold tabular-nums">{analytics.communicationAnalytics.automationCompletions}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Failed</p>
                  <p className="font-semibold tabular-nums text-[var(--destructive)]">{analytics.communicationAnalytics.automationFailures}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTION 6: Recent Activity
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Recent Activity"
        description="Latest timeline events from analytics domain"
      >
        {analytics.timelineActivity.length > 0 ? (
          <div className="space-y-5">
            {analytics.timelineActivity.slice(0, 3).map((group) => (
              <div key={group.dateKey}>
                <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                  {formatDate(group.dateKey)}
                </h3>
                <div className="space-y-1.5">
                  {group.events.slice(0, 5).map((ev) => (
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

        <div className="mt-4 text-right">
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-400 transition-colors"
          >
            View full event log
            <ArrowRight size={12} />
          </Link>
        </div>
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTION 7: Export Center (UI Only)
          ════════════════════════════════════════════════════════ */}
      <DashboardSection
        title="Export Center"
        description="Download reports and export data"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="opacity-50 cursor-not-allowed">
            <CardContent className="py-6 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-overlay)] flex items-center justify-center">
                <Download size={18} className="text-[var(--muted)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">CSV Export</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Download report data as CSV</p>
              </div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">Coming soon</Badge>
            </CardContent>
          </Card>

          <Card className="opacity-50 cursor-not-allowed">
            <CardContent className="py-6 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-overlay)] flex items-center justify-center">
                <FileText size={18} className="text-[var(--muted)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">PDF Export</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Download report as PDF document</p>
              </div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">Coming soon</Badge>
            </CardContent>
          </Card>

          <Card className="opacity-50 cursor-not-allowed">
            <CardContent className="py-6 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-overlay)] flex items-center justify-center">
                <Calendar size={18} className="text-[var(--muted)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Weekly Report</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Scheduled weekly report delivery</p>
              </div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">Coming soon</Badge>
            </CardContent>
          </Card>

          <Card className="opacity-50 cursor-not-allowed">
            <CardContent className="py-6 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-overlay)] flex items-center justify-center">
                <Printer size={18} className="text-[var(--muted)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Monthly Report</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Scheduled monthly report delivery</p>
              </div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">Coming soon</Badge>
            </CardContent>
          </Card>
        </div>

        <InlineNotice variant="info" className="mt-3">
          Export features are not yet implemented. Data is available on-screen for manual recording.
        </InlineNotice>
      </DashboardSection>

      {/* ════════════════════════════════════════════════════════
          SECTION 8: Quick Navigation
          ════════════════════════════════════════════════════════ */}
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
    </PageContainer>
  )
}
