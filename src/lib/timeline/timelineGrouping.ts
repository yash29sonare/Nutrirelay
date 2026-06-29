import type { TimelineEntry } from "@/types/timeline"

export type TimelineGroupLabel = "today" | "yesterday" | "this_week" | "earlier"

export interface TimelineGroupResult {
  group: TimelineGroupLabel
  label: string
  entries: TimelineEntry[]
}

function getDateKey(iso: string): string {
  return iso.slice(0, 10)
}

function getTodayKey(): string {
  return getDateKey(new Date().toISOString())
}

function getYesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return getDateKey(d.toISOString())
}

function getWeekStartKey(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return getDateKey(d.toISOString())
}

export function classifyGroup(iso: string): TimelineGroupLabel {
  const key = getDateKey(iso)
  const today = getTodayKey()
  const yesterday = getYesterdayKey()
  const weekStart = getWeekStartKey()

  if (key === today) return "today"
  if (key === yesterday) return "yesterday"
  if (key >= weekStart) return "this_week"
  return "earlier"
}

const GROUP_LABELS: Record<TimelineGroupLabel, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  earlier: "Earlier",
}

export function groupTimeline(entries: TimelineEntry[]): TimelineGroupResult[] {
  if (entries.length === 0) return []

  const groups = new Map<TimelineGroupLabel, TimelineEntry[]>()
  for (const entry of entries) {
    const g = classifyGroup(entry.timestamp)
    const arr = groups.get(g)
    if (arr) {
      arr.push(entry)
    } else {
      groups.set(g, [entry])
    }
  }

  const order: TimelineGroupLabel[] = ["today", "yesterday", "this_week", "earlier"]
  return order
    .filter((g) => groups.has(g) && groups.get(g)!.length > 0)
    .map((g) => ({
      group: g,
      label: GROUP_LABELS[g],
      entries: groups.get(g)!,
    }))
}
