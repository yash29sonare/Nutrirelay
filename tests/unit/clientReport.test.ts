import { describe, expect, it } from "vitest"
import {
  buildClientReportDraft,
  getClientReportProgressStatus,
} from "@/lib/reports/client-report"
import {
  buildNutritionPeriodReport,
  getCalendarWeekPeriod,
  type ReportClient,
} from "@/lib/reports/report-center"

const client: ReportClient = {
  id: "client-1",
  name: "Aarav Mehta",
  phoneNumber: "910000000000",
  isActive: true,
  goal: {
    goalType: "FAT_LOSS",
    startingWeight: 82,
    currentWeight: 79,
    targetWeight: 74,
    targetDate: "2026-12-31",
  },
}

describe("client-facing report presentation", () => {
  it("builds truthful editable notes from report data", () => {
    const period = getCalendarWeekPeriod(new Date("2026-07-29T08:00:00.000Z"), 0)
    const report = buildNutritionPeriodReport({
      kind: "weekly",
      period,
      client,
      foodLogs: [{
        id: "meal-1",
        client_id: client.id,
        trainer_id: "trainer-1",
        logged_at: "2026-07-27T08:00:00.000Z",
        calories: 520,
        protein_g: 28,
        carbs_g: 62,
        fat_g: 16,
        review_state: "reviewed",
        verification_status: "VERIFIED",
      }],
    })

    const asOf = new Date("2026-07-29T08:00:00.000Z")
    const draft = buildClientReportDraft(report, asOf)

    expect(getClientReportProgressStatus(report, asOf)).toBe("Needs consistency")
    expect(draft.wins).toContain("1 day")
    expect(draft.needsAttention).toContain("2 days had no meal logs")
    expect(draft.nextFocus).toHaveLength(3)
  })

  it("requires trainer review when report macros are incomplete", () => {
    const period = getCalendarWeekPeriod(new Date("2026-07-29T08:00:00.000Z"), 0)
    const report = buildNutritionPeriodReport({
      kind: "weekly",
      period,
      client,
      foodLogs: [{
        id: "meal-2",
        client_id: client.id,
        trainer_id: "trainer-1",
        logged_at: "2026-07-28T08:00:00.000Z",
        calories: 410,
        protein_g: null,
        carbs_g: 48,
        fat_g: 12,
        review_state: "needs_review",
        verification_status: "PENDING",
      }],
    })

    expect(getClientReportProgressStatus(report, new Date("2026-07-29T08:00:00.000Z"))).toBe("Needs trainer review")
  })
})
