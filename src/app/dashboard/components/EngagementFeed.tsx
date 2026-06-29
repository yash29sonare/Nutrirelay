import type { EngagementAction, TrainerDailyFeed } from "@/types/engagement"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { Lightbulb, AlertTriangle, MessageSquare } from "lucide-react"

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-l-red-500 bg-red-500/5",
  medium: "border-l-amber-500 bg-amber-500/5",
  low: "border-l-sky-500 bg-sky-500/5",
}

const TYPE_ICONS: Record<string, typeof Lightbulb> = {
  check_in: AlertTriangle,
  recovery: AlertTriangle,
  message: MessageSquare,
  review: Lightbulb,
  adjust_plan: Lightbulb,
}

const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

function ActionCard({ action }: { action: EngagementAction }) {
  const Icon = TYPE_ICONS[action.type] ?? Lightbulb
  return (
    <div
      className={`border-l-2 pl-3 py-2 rounded-r ${PRIORITY_STYLES[action.priority] ?? PRIORITY_STYLES.low}`}
    >
      <div className="flex items-start gap-2">
        <Icon size={14} className="mt-0.5 shrink-0 text-[var(--muted)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--foreground)] truncate">
            {action.clientName}
          </p>
          <p className="text-xs text-[var(--muted)] mt-0.5 capitalize">
            {action.type.replace(/_/g, " ")}
          </p>
          <p className="text-xs text-[var(--foreground)] mt-1">
            {action.reason}
          </p>
        </div>
        <Badge
          variant={
            action.priority === "high"
              ? "danger"
              : action.priority === "medium"
                ? "warning"
                : "default"
          }
          className="shrink-0"
        >
          {PRIORITY_LABELS[action.priority]}
        </Badge>
      </div>
    </div>
  )
}

function ActionGroup({
  title,
  actions,
}: {
  title: string
  actions: EngagementAction[]
}) {
  if (actions.length === 0) return null
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
        {title}
      </h4>
      <div className="grid gap-2">
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>
    </div>
  )
}

export function EngagementFeed({ feed }: { feed: TrainerDailyFeed }) {
  const total = feed.highPriority.length + feed.mediumPriority.length + feed.lowPriority.length
  if (total === 0) return null

  return (
    <DashboardSection title="Action feed">
      <Card>
        <CardContent className="py-4 px-5 space-y-4">
          <ActionGroup title="High priority" actions={feed.highPriority} />
          <ActionGroup title="Medium priority" actions={feed.mediumPriority} />
          <ActionGroup title="Low priority" actions={feed.lowPriority} />
        </CardContent>
      </Card>
    </DashboardSection>
  )
}
