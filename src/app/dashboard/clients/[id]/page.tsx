import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { PageContainer } from "@/components/layout/PageContainer"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { InlineNotice } from "@/components/ui/InlineNotice"
import {
  ArrowLeft, AlertTriangle, UtensilsCrossed, MessageSquare,
  Bell, History, Activity, ChevronRight,
} from "lucide-react"
import { getDashboardData } from "@/lib/operations/dashboard"
import { getClientById } from "@/lib/operations/clients"
import {
  getClientRiskLevel,
  getComplianceState,
  getPerformanceTrend,
} from "@/lib/domain/dashboardSemantics"
import { createClient } from "@/utils/supabase/server"
import { getClientEvents } from "@/lib/events/engagementEventStore"
import { mapEngagementEvents, mapClientState } from "@/lib/timeline/timelineMapper"
import { getClientMeals } from "@/lib/meals/mealOperations"
import { mapMealRecordsToTimelineEntries } from "@/lib/meals/mealTimelineMapper"
import { ClientTimeline } from "./components/ClientTimeline"
import { MealHistory } from "./components/MealHistory"
import { analyzeMeal } from "@/lib/ai/mealUnderstanding"
import { MealReviewWorkspace } from "./components/MealReviewWorkspace"
import { formatNumber, formatPercent } from "@/lib/format"

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string
  current: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="text-[var(--foreground)] tabular-nums">
          {current} / {target}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-right" style={{ color }}>
        {pct}%
      </p>
    </div>
  )
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authUserId = user?.id ?? null

  if (!authUserId) {
    return (
      <PageContainer className="max-w-6xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <EmptyState title="Sign in to view client details." />
      </PageContainer>
    )
  }

  const result = await getDashboardData(authUserId)

  if (!result.success) {
    return (
      <PageContainer className="max-w-6xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <ErrorState title="Client not found or access denied." />
      </PageContainer>
    )
  }

  const dto = result.data
  const client = getClientById(id, dto)

  if (!client) {
    return (
      <PageContainer className="max-w-6xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <ErrorState title="Client not found or access denied." />
      </PageContainer>
    )
  }

  const riskLevel = getClientRiskLevel(client)
  const compliance = getComplianceState(dto.metrics)
  const trend = getPerformanceTrend(dto.metrics)

  const TARGETS = { calories: 2200, protein: 160, carbs: 220, fat: 70 }

  const events = await getClientEvents(id)
  const eventEntries = mapEngagementEvents(events, id)
  const stateEntries = mapClientState(client)
  const meals = await getClientMeals(id, { limit: 20 })
  const mealEntries = mapMealRecordsToTimelineEntries(meals)

  const needsReview = meals.find(
    (m) => m.review.status === "recorded" || m.review.status === "pending",
  )

  const pendingConversations = events.filter(
    (e) => e.event_type === "CONVERSATION_PLANNED",
  ).length
  const pendingReminders = events.filter(
    (e) => e.event_type === "REMINDER_PLANNED",
  ).length
  const unverifiedMeals = meals.filter(
    (m) => m.review.status === "unverified",
  ).length

  const upcomingPlans = events.filter(
    (e) =>
      e.event_type === "CONVERSATION_PLANNED" ||
      e.event_type === "REMINDER_PLANNED",
  ).slice(0, 5)

  return (
    <PageContainer className="max-w-6xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      {/* Section 1: Client Overview */}
      <div className="flex items-start gap-4 py-5 flex-wrap" id="page-heading">
        <Avatar
          fallback={client.client_name.charAt(0).toUpperCase()}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              {client.client_name}
            </h1>
            <Badge
              variant={
                riskLevel === "high"
                  ? "danger"
                  : riskLevel === "medium"
                    ? "warning"
                    : "default"
              }
              className="flex items-center gap-1"
            >
              {riskLevel !== "low" && <AlertTriangle size={11} />}
              {riskLevel === "high"
                ? "High risk"
                : riskLevel === "medium"
                  ? "Medium risk"
                  : "Low risk"}
            </Badge>
            <Badge
              variant={
                compliance.level === "excellent" || compliance.level === "good"
                  ? "success"
                  : compliance.level === "moderate"
                    ? "default"
                    : "warning"
              }
            >
              Compliance: {compliance.level}
            </Badge>
            <Badge variant={trend === "declining" ? "danger" : trend === "improving" ? "success" : "default"}>
              {trend === "declining" ? "Declining" : trend === "improving" ? "Improving" : "Stable"}
            </Badge>
          </div>
          <p className="text-sm text-[var(--muted)] mt-1">
            {client.total_meals_logged_today} meal{client.total_meals_logged_today !== 1 ? "s" : ""} logged today · {client.active_strike_count} active strike{client.active_strike_count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* Section 2: Attention Required */}
          <DashboardSection title="Attention Required" description="Items needing your review">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className={needsReview ? "" : "opacity-50"}>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--warning)]/10 shrink-0">
                    <UtensilsCrossed size={14} className="text-[var(--warning)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {needsReview ? "1 meal" : "0 meals"}
                    </p>
                    <p className="text-xs text-[var(--muted)]">Needs review</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={pendingConversations > 0 ? "" : "opacity-50"}>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--info)]/10 shrink-0">
                    <MessageSquare size={14} className="text-[var(--info)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {pendingConversations}
                    </p>
                    <p className="text-xs text-[var(--muted)]">Pending conversations</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={pendingReminders > 0 ? "" : "opacity-50"}>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--destructive)]/10 shrink-0">
                    <Bell size={14} className="text-[var(--destructive)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {pendingReminders}
                    </p>
                    <p className="text-xs text-[var(--muted)]">Pending reminders</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {unverifiedMeals > 0 && (
              <InlineNotice variant="warning" className="mt-2">
                {unverifiedMeals} unverified meal{unverifiedMeals !== 1 ? "s" : ""} need{unverifiedMeals === 1 ? "s" : ""} follow-up
              </InlineNotice>
            )}
            {client.active_strike_count > 0 && (
              <InlineNotice variant="error" className="mt-2">
                Client has {client.active_strike_count} active strike{client.active_strike_count !== 1 ? "s" : ""}
              </InlineNotice>
            )}
          </DashboardSection>

          {/* Section 3: Latest Activity */}
          <DashboardSection title="Latest Activity">
            <ClientTimeline sources={[eventEntries, stateEntries, mealEntries]} />
          </DashboardSection>

          {/* Section 4: Meal History */}
          <DashboardSection title="Meal History">
            <MealHistory meals={meals} />
          </DashboardSection>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          {/* Today's Macros */}
          <DashboardSection title="Today's Macros">
            <Card>
              <CardContent className="space-y-4">
                <MacroBar
                  label="Calories (kcal)"
                  current={client.total_calories_today}
                  target={TARGETS.calories}
                  color="#22c55e"
                />
                <MacroBar
                  label="Protein (g)"
                  current={client.total_protein_today}
                  target={TARGETS.protein}
                  color="#38bdf8"
                />
                <MacroBar
                  label="Carbohydrates (g)"
                  current={client.total_carbs_today}
                  target={TARGETS.carbs}
                  color="#f59e0b"
                />
                <MacroBar
                  label="Fat (g)"
                  current={client.total_fat_today}
                  target={TARGETS.fat}
                  color="#f472b6"
                />
              </CardContent>
            </Card>
          </DashboardSection>

          {/* Section 5: Upcoming Communication */}
          <DashboardSection
            title="Upcoming Communication"
            description={upcomingPlans.length === 0 ? "None planned" : `${upcomingPlans.length} item${upcomingPlans.length !== 1 ? "s" : ""}`}
          >
            {upcomingPlans.length > 0 ? (
              <Card>
                <CardContent className="divide-y divide-[var(--surface-border)] py-2">
                  {upcomingPlans.map((plan) => (
                    <div key={plan.event_id} className="flex items-center gap-3 py-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--info)]/10 shrink-0">
                        {plan.event_type === "CONVERSATION_PLANNED" ? (
                          <MessageSquare size={12} className="text-[var(--info)]" />
                        ) : (
                          <Bell size={12} className="text-[var(--info)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[var(--foreground)] truncate">
                          {plan.event_type === "CONVERSATION_PLANNED" ? "Conversation planned" : "Reminder planned"}
                        </p>
                        <p className="text-[10px] text-[var(--muted)]">
                          {new Date(plan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6">
                  <div className="flex flex-col items-center text-center">
                    <MessageSquare size={16} className="text-[var(--muted)] mb-2" />
                    <p className="text-xs text-[var(--muted)]">No upcoming communication</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </DashboardSection>

          {/* Section 6: AI Summary / Meal Review */}
          {needsReview && (
            <DashboardSection title="AI Meal Review">
              <MealReviewWorkspace meal={needsReview} aiResult={await analyzeMeal(needsReview)} />
            </DashboardSection>
          )}

          {/* Section 7: Quick Actions */}
          <DashboardSection title="Quick Actions">
            <Card>
              <CardContent className="divide-y divide-[var(--surface-border)] py-1">
                <Link
                  href="/dashboard/events"
                  className="flex items-center gap-3 py-3 px-1 text-sm text-[var(--foreground)] hover:text-brand-500 transition-colors"
                >
                  <Activity size={14} className="text-[var(--muted)] shrink-0" />
                  <span>View events</span>
                  <ChevronRight size={14} className="ml-auto text-[var(--muted)]" />
                </Link>
                <Link
                  href="/dashboard/conversations"
                  className="flex items-center gap-3 py-3 px-1 text-sm text-[var(--foreground)] hover:text-brand-500 transition-colors"
                >
                  <MessageSquare size={14} className="text-[var(--muted)] shrink-0" />
                  <span>View conversations</span>
                  <ChevronRight size={14} className="ml-auto text-[var(--muted)]" />
                </Link>
                <Link
                  href="/dashboard/clients"
                  className="flex items-center gap-3 py-3 px-1 text-sm text-[var(--foreground)] hover:text-brand-500 transition-colors"
                >
                  <History size={14} className="text-[var(--muted)] shrink-0" />
                  <span>Client roster</span>
                  <ChevronRight size={14} className="ml-auto text-[var(--muted)]" />
                </Link>
              </CardContent>
            </Card>
          </DashboardSection>
        </div>
      </div>
    </PageContainer>
  )
}
