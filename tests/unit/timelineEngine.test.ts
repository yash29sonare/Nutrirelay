import { describe, it, expect } from "vitest"
import { buildTimeline } from "@/lib/timeline/timelineEngine"
import { createTimelineEntry } from "../builders/index"

describe("timelineEngine", () => {
  it("builds empty timeline from empty source arrays", () => {
    const timeline = buildTimeline([])
    expect(timeline).toHaveLength(0)
  })

  it("builds timeline from multiple source batches", () => {
    const batch1 = [createTimelineEntry({ id: "tl-1" })]
    const batch2 = [createTimelineEntry({ id: "tl-2" })]
    const timeline = buildTimeline([batch1, batch2])
    expect(timeline).toHaveLength(2)
  })

  it("deduplicates entries with same id across batches", () => {
    const entry = createTimelineEntry({ id: "tl-dupe" })
    const timeline = buildTimeline([[entry], [entry]])
    expect(timeline).toHaveLength(1)
  })

  it("sorts entries chronologically (latest first)", () => {
    const early = createTimelineEntry({ id: "tl-1" })
    early.timestamp = "2026-01-01T00:00:00.000Z"
    const late = createTimelineEntry({ id: "tl-2" })
    late.timestamp = "2026-06-01T00:00:00.000Z"
    const timeline = buildTimeline([[early], [late]])
    expect(timeline[0].id).toBe("tl-2")
    expect(timeline[1].id).toBe("tl-1")
  })

  it("is deterministic", () => {
    const batch = [createTimelineEntry({ id: "tl-a" }), createTimelineEntry({ id: "tl-b" })]
    const a = buildTimeline([batch])
    const b = buildTimeline([batch])
    expect(a).toEqual(b)
  })

  it("handles large batches without error", () => {
    const batch = Array.from({ length: 100 }, (_, i) =>
      createTimelineEntry({ id: `tl-bulk-${i}` }),
    )
    const timeline = buildTimeline([batch])
    expect(timeline).toHaveLength(100)
  })
})
