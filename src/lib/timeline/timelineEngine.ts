import type { TimelineEntry } from "@/types/timeline"

export function buildTimeline(sources: TimelineEntry[][]): TimelineEntry[] {
  const seen = new Set<string>()
  const result: TimelineEntry[] = []

  for (const batch of sources) {
    for (const entry of batch) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id)
        result.push(entry)
      }
    }
  }

  result.sort((a, b) => {
    const diff = b.timestamp.localeCompare(a.timestamp)
    if (diff !== 0) return diff
    return a.id.localeCompare(b.id)
  })

  return result
}
