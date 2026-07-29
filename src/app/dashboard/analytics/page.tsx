import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Flame,
  MessageSquareText,
  Salad,
  Send,
  Users,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { ErrorState } from "@/components/ui/ErrorState"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { getDashboardData } from "@/lib/operations/dashboard"
import { getEvents } from "@/lib/events/engagementEventStore"
import { createClient } from "@/utils/supabase/server"
import { buildAnalyticsDTO } from "@/lib/analytics/analyticsEngine"
import { getTrainerNutritionActivity } from "@/lib/analytics/nutritionActivity"
import { formatNumber } from "@/lib/format"

export const dynamic = "force-dynamic"

interface MetricProps {
  label: string
  value: string | number
  icon: typeof Users
  tone: string
  detail?: string
}

function Metric({ label, value, icon: Icon, tone, detail }: MetricProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
          <p className="text-xs text-[var(--muted)]">{label}</p>
          {detail ? <p className="mt-1 text-[11px] text-[var(--muted)]">{detail}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const trainerId = user?.id ?? null

  if (!trainerId) {
    return (
      <PageContainer>
        <PageHeader title="Analytics" description="Sign in to view trainer analytics." />
      </PageContainer>
    )
  }

  const loaded = await Promise.all([
    getDashboardData(trainerId),
    getEvents(trainerId),
    getTrainerNutritionActivity(trainerId),
  ]).catch(() => null)

  if (!loaded) {
    return (
      <PageContainer>
        <PageHeader title="Analytics" description="Actionable client and nutrition metrics." />
        <ErrorState title="Unable to load analytics." description="The latest trainer metrics could not be loaded." />
      </PageContainer>
    )
  }

  const [result, events, nutrition] = loaded

  if (!result.success) {
    return (
      <PageContainer>
        <PageHeader title="Analytics" description="Actionable client and nutrition metrics." />
        <ErrorState title="Unable to load analytics." description={result.error.message} />
      </PageContainer>
    )
  }

  const dto = result.data
  const analytics = buildAnalyticsDTO(dto, events)
  const noLogClients = dto.clients.filter((client) => client.total_meals_logged_today === 0).length
  const pendingWork = nutrition.pendingReviews
    + analytics.communicationAnalytics.pendingConversations
    + analytics.communicationAnalytics.pendingReminders
  const communicationAttemptsToday = analytics.communicationAnalytics.commSentToday
    + analytics.communicationAnalytics.commFailedToday

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Actionable nutrition, client health, and communication metrics."
      />

      <div className="space-y-7">
        <DashboardSection title="Client health">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric
              icon={Users}
              value={dto.metrics.activeClients}
              label="Active clients"
              tone="bg-sky-500/10 text-sky-600"
            />
            <Metric
              icon={AlertTriangle}
              value={dto.metrics.atRiskClients}
              label="Need attention"
              tone="bg-amber-500/10 text-amber-600"
            />
            <Metric
              icon={Clock3}
              value={noLogClients}
              label="No meals today"
              tone="bg-violet-500/10 text-violet-600"
            />
            <Metric
              icon={CheckCircle2}
              value={nutrition.pendingReviews}
              label="Review pending (7d)"
              tone="bg-emerald-500/10 text-emerald-600"
            />
          </div>
        </DashboardSection>

        <DashboardSection title="Nutrition activity">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric
              icon={Salad}
              value={analytics.mealAnalytics.mealsToday}
              label="Meals today"
              tone="bg-emerald-500/10 text-emerald-600"
            />
            <Metric
              icon={Flame}
              value={nutrition.meals7Days}
              label="Meals in 7 days"
              tone="bg-orange-500/10 text-orange-600"
            />
            <Metric
              icon={CheckCircle2}
              value={formatNumber(nutrition.calories7Days)}
              label="Calories in 7 days"
              tone="bg-sky-500/10 text-sky-600"
            />
            <Metric
              icon={Salad}
              value={`${formatNumber(nutrition.protein7Days)}g`}
              label="Protein in 7 days"
              tone="bg-violet-500/10 text-violet-600"
            />
          </div>

          <Card className="mt-3">
            <CardHeader>
              <CardTitle>7-day macro summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Calories", formatNumber(nutrition.calories7Days)],
                ["Protein", `${formatNumber(nutrition.protein7Days)}g`],
                ["Carbs", `${formatNumber(nutrition.carbs7Days)}g`],
                ["Fat", `${formatNumber(nutrition.fat7Days)}g`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[var(--surface-overlay)] p-3">
                  <p className="text-xs text-[var(--muted)]">{label}</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection title="Communication performance">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric
              icon={Send}
              value={analytics.communicationAnalytics.commSentToday}
              label="Messages sent today"
              tone="bg-emerald-500/10 text-emerald-600"
            />
            <Metric
              icon={XCircle}
              value={analytics.communicationAnalytics.commFailedToday}
              label="Failed today"
              tone="bg-red-500/10 text-red-600"
            />
            <Metric
              icon={MessageSquareText}
              value={pendingWork}
              label="Pending reply / review"
              tone="bg-amber-500/10 text-amber-600"
            />
            <Metric
              icon={CheckCircle2}
              value={communicationAttemptsToday > 0 ? `${analytics.communicationAnalytics.commSuccessRate}%` : "—"}
              label="Delivery success"
              tone="bg-sky-500/10 text-sky-600"
              detail={communicationAttemptsToday > 0 ? "Based on recorded communication events" : "No delivery events today"}
            />
          </div>
        </DashboardSection>
      </div>
    </PageContainer>
  )
}
