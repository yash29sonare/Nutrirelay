import type { TimelineEntry } from "@/types/timeline"
import { formatRelativeDate } from "@/lib/format"
import {
  Sparkles, CheckCircle2, XCircle, Clock, Shield, FileText,
  RefreshCw, UserCheck, Heart, MessageSquare, Search, Sliders,
  Activity, UtensilsCrossed, AlertTriangle, Zap,
} from "lucide-react"

const ICON_MAP: Record<string, typeof Sparkles> = {
  sparkles: Sparkles,
  checkCircle: CheckCircle2,
  xCircle: XCircle,
  clock: Clock,
  shield: Shield,
  fileText: FileText,
  refreshCw: RefreshCw,
  userCheck: UserCheck,
  heart: Heart,
  messageSquare: MessageSquare,
  search: Search,
  sliders: Sliders,
  activity: Activity,
  utensilsCrossed: UtensilsCrossed,
  alertTriangle: AlertTriangle,
  zap: Zap,
}

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-[var(--muted)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--destructive)]",
  brand: "bg-brand-500",
}

const SEVERITY_ICON: Record<string, string> = {
  info: "text-[var(--muted)]",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--destructive)]",
  brand: "text-brand-500",
}

interface TimelineItemProps {
  entry: TimelineEntry
  isLast: boolean
}

export function TimelineItem({ entry, isLast }: TimelineItemProps) {
  const Icon = ICON_MAP[entry.icon] ?? Activity
  return (
    <div className="relative flex gap-4 pb-6">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[15px] top-7 bottom-0 w-px bg-[var(--surface-border)]" />
      )}

      {/* Icon circle */}
      <div className="relative shrink-0 z-10">
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-full border-2 border-[var(--surface-border)] ${SEVERITY_ICON[entry.severity]}`}
          style={{ backgroundColor: "var(--surface-raised)" }}
        >
          <Icon size={13} />
        </div>
        <div
          className={`absolute top-0 left-0 w-7 h-7 rounded-full opacity-20 ${SEVERITY_DOT[entry.severity]}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {entry.title}
          </p>
          <span className="text-xs text-[var(--muted)] whitespace-nowrap shrink-0">
            {formatRelativeDate(entry.timestamp)}
          </span>
        </div>
        {entry.description && (
          <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">
            {entry.description}
          </p>
        )}
      </div>
    </div>
  )
}
