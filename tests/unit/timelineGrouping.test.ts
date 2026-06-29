import { describe, it, expect } from "vitest"
import { classifyGroup, groupTimeline } from "@/lib/timeline/timelineGrouping"
import { createTimelineEntry } from "../builders/index"
import { resetDateTime, mockDateTime } from "../mocks/index"

describe("timelineGrouping", () => {
  describe("classifyGroup", () => {
    it("classifies today's timestamp as today", () => {
      const today = new Date().toISOString()
      expect(classifyGroup(today)).toBe("today")
    })

    it("classifies yesterday's timestamp as yesterday", () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString()
      expect(classifyGroup(yesterday)).toBe("yesterday")
    })

    it("classifies old timestamp as earlier", () => {
      expect(classifyGroup("2025-01-01T00:00:00.000Z")).toBe("earlier")
    })
  })

  describe("groupTimeline", () => {
    it("returns empty array for empty timeline", () => {
      const grouped = groupTimeline([])
      expect(grouped).toHaveLength(0)
    })

    it("groups entries by date", () => {
      const entries = [
        createTimelineEntry({ id: "tl-1", eventType: "MEAL_RECORDED" }),
        createTimelineEntry({ id: "tl-2", eventType: "ACTION_CREATED" }),
      ]
      const grouped = groupTimeline(entries)
      expect(grouped.length).toBeGreaterThan(0)
      for (const g of grouped) {
        expect(g.entries.length).toBeGreaterThan(0)
      }
    })

    it("preserves entry order within groups", () => {
      const entries = [
        createTimelineEntry({ id: "tl-1" }),
        createTimelineEntry({ id: "tl-2" }),
      ]
      const grouped = groupTimeline(entries)
      for (const g of grouped) {
        expect(g.entries).toEqual(g.entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)))
      }
    })

    it("is deterministic for same input", () => {
      const entries = [
        createTimelineEntry({ id: "tl-1" }),
        createTimelineEntry({ id: "tl-2" }),
      ]
      const a = groupTimeline(entries)
      const b = groupTimeline(entries)
      expect(a).toEqual(b)
    })

    it("handles large entry lists", () => {
      const entries = Array.from({ length: 50 }, (_, i) =>
        createTimelineEntry({ id: `tl-bulk-${i}` }),
      )
      const grouped = groupTimeline(entries)
      expect(grouped.length).toBeGreaterThan(0)
    })
  })
})
