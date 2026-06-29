import type { TimelineEntry, TimelineSeverity } from "@/types/timeline"
import { formatRelativeDate } from "@/lib/format"

export function formatTimelineTitle(entry: TimelineEntry): string {
  return entry.title
}

export function formatTimelineDescription(entry: TimelineEntry): string {
  return entry.description
}

export function getTimelineIcon(entry: TimelineEntry): string {
  return entry.icon
}

export function getTimelineTimeAgo(iso: string): string {
  return formatRelativeDate(iso)
}

export function getSeverityLabel(severity: TimelineSeverity): string {
  switch (severity) {
    case "info":    return "Info"
    case "success": return "Success"
    case "warning": return "Warning"
    case "danger":  return "Critical"
    case "brand":   return "Action"
  }
}
