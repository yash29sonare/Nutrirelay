"use client"

import { cn } from "@/lib/utils"
import type { TimelineCategory } from "@/types/timeline"

export type TimelineFilterValue = "all" | TimelineCategory

interface FilterTab {
  value: TimelineFilterValue
  label: string
}

const FILTERS: FilterTab[] = [
  { value: "all",   label: "All" },
  { value: "action", label: "Actions" },
  { value: "event", label: "Events" },
  { value: "ai",    label: "AI" },
  { value: "compliance", label: "Compliance" },
  { value: "system", label: "System" },
]

interface TimelineFiltersProps {
  active: TimelineFilterValue
  onChange: (value: TimelineFilterValue) => void
}

export function TimelineFilters({ active, onChange }: TimelineFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((f) => {
        const isActive = active === f.value
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-100",
              isActive
                ? "bg-[var(--surface-overlay)] text-[var(--foreground)] border border-[var(--surface-border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] border border-transparent",
            )}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
