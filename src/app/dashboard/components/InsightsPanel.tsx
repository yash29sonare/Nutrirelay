import type { DashboardInsights } from "@/types/dashboard-insights"
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Lightbulb, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { DashboardGrid } from "@/components/layout/DashboardGrid"

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-600",
  medium: "bg-amber-500/10 text-amber-600",
  high: "bg-red-500/10 text-red-600",
}

const TREND_ICONS: Record<string, typeof TrendingUp> = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
}

function RiskBadge({ level }: { level: string }) {
  const colorClass = RISK_COLORS[level] ?? RISK_COLORS.low
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      <AlertTriangle size={12} />
      {level === "low" ? "Low risk" : level === "medium" ? "Medium risk" : "High risk"}
    </span>
  )
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-l-red-500 bg-red-500/5",
  medium: "border-l-amber-500 bg-amber-500/5",
  low: "border-l-sky-500 bg-sky-500/5",
}

function ActionCard({ action }: { action: { priority: string; message: string } }) {
  const borderClass = PRIORITY_STYLES[action.priority] ?? PRIORITY_STYLES.low
  return (
    <div
      className={`border-l-2 pl-3 py-2 rounded-r ${borderClass}`}
    >
      <p className="text-sm text-[var(--foreground)]">{action.message}</p>
      <p className="text-xs text-[var(--muted)] mt-0.5 capitalize">{action.priority} priority</p>
    </div>
  )
}

export function InsightsPanel({
  insights,
}: {
  insights: DashboardInsights
}) {
  const TrendIcon = TREND_ICONS[insights.performance.overallTrend] ?? Minus
  const trendColor =
    insights.performance.overallTrend === "improving"
      ? "text-emerald-500"
      : insights.performance.overallTrend === "declining"
        ? "text-red-500"
        : "text-[var(--muted)]"

  return (
    <>
      <DashboardSection title="Coaching insights">
        <DashboardGrid columns={1}>
          {/* Risk + Performance summary row */}
          <Card>
            <CardContent className="py-4 px-5">
              <div className="flex flex-wrap items-center gap-4">
                <RiskBadge level={insights.risk.riskLevel} />
                <span className="text-sm text-[var(--muted)]">
                  {insights.risk.reason}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <TrendIcon size={16} className={trendColor} />
                  <span className="text-xs text-[var(--muted)] capitalize">
                    {insights.performance.overallTrend}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    · {insights.performance.confidenceScore}% confidence
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </DashboardGrid>

        {/* Actions */}
        {insights.actions.actions.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb size={13} />
              Suggested actions
            </h4>
            <div className="grid gap-2">
              {insights.actions.actions.map((action, i) => (
                <ActionCard key={i} action={action} />
              ))}
            </div>
          </div>
        )}

        {/* Client segmentation */}
        <div className="mt-4">
          <h4 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Users size={13} />
            Client segments
          </h4>
          <div className="flex flex-wrap gap-3">
            <Badge variant="brand">
              {insights.segmentation.highPerforming.length} on track
            </Badge>
            <Badge variant="outline">
              {insights.segmentation.average.length} average
            </Badge>
            <Badge variant={insights.segmentation.atRisk.length > 0 ? "danger" : "outline"}>
              {insights.segmentation.atRisk.length} at risk
            </Badge>
          </div>
        </div>
      </DashboardSection>
    </>
  )
}
