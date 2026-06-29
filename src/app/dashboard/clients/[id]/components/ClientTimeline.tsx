"use client"

import { useState, useMemo } from "react"
import { History } from "lucide-react"
import type { TimelineEntry, TimelineCategory } from "@/types/timeline"
import { buildTimeline } from "@/lib/timeline/timelineEngine"
import { groupTimeline } from "@/lib/timeline/timelineGrouping"
import { TimelineDateGroup } from "./TimelineDateGroup"
import { TimelineFilters, type TimelineFilterValue } from "./TimelineFilters"
import { EmptyState } from "@/components/ui/EmptyState"
import { Card, CardContent } from "@/components/ui/Card"

function filterEntries(
  entries: TimelineEntry[],
  filter: TimelineFilterValue,
): TimelineEntry[] {
  if (filter === "all") return entries
  return entries.filter((e) => e.category === (filter as TimelineCategory))
}

interface ClientTimelineProps {
  sources: TimelineEntry[][]
}

export function ClientTimeline({ sources }: ClientTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilterValue>("all")

  const timeline = useMemo(() => buildTimeline(sources), [sources])
  const filtered = useMemo(() => filterEntries(timeline, filter), [timeline, filter])
  const groups = useMemo(() => groupTimeline(filtered), [filtered])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-1.5">
          <History size={14} />
          Client timeline
        </h2>
        <TimelineFilters active={filter} onChange={setFilter} />
      </div>

      {groups.length > 0 ? (
        <Card>
          <CardContent className="py-5 px-5">
            {groups.map((g) => (
              <TimelineDateGroup
                key={g.group}
                label={g.label}
                entries={g.entries}
              />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={<History size={16} />}
              title="No timeline entries yet"
              description={
                filter !== "all"
                  ? "No entries match the selected filter."
                  : "Client activity will appear here as events are recorded."
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
