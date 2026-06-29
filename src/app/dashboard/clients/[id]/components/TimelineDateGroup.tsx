import type { TimelineEntry } from "@/types/timeline"
import { TimelineItem } from "./TimelineItem"

interface TimelineDateGroupProps {
  label: string
  entries: TimelineEntry[]
}

export function TimelineDateGroup({ label, entries }: TimelineDateGroupProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-[var(--surface-border)]" />
        <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider px-2">
          {label}
        </span>
        <div className="h-px flex-1 bg-[var(--surface-border)]" />
      </div>
      <div className="pl-2">
        {entries.map((entry, idx) => (
          <TimelineItem
            key={entry.id}
            entry={entry}
            isLast={idx === entries.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
