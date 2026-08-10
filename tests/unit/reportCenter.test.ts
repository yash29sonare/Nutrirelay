import { describe, expect, it } from "vitest"
import {
  buildNutritionPeriodReport,
  buildReportAutomationPlan,
  getCalendarMonthPeriod,
  getCalendarWeekPeriod,
  type ReportClient,
  type ReportFoodLog,
} from "@/lib/reports/report-center"

const client: ReportClient = {
  id: "client-1",
  name: "Test Client",
  phoneNumber: "910000000000",
  isActive: true,
  goal: {
    goalType: "GAIN_WEIGHT",
    startingWeight: 60,
    currentWeight: 61,
    targetWeight: 65,
    targetDate: "2026-12-31",
  },
}

function log(overrides: Partial<ReportFoodLog>): ReportFoodLog {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    client_id: "client-1",
    trainer_id: "trainer-1",
    logged_at: "2026-07-01T08:00:00.000Z",
    calories: 100,
    protein_g: 10,
    carbs_g: 12,
    fat_g: 3,
    review_state: "auto_logged",
    verification_status: "VERIFIED",
    ...overrides,
  }
}

describe("report center helpers", () => {
  it("builds current and previous calendar month ranges", () => {
    const now = new Date("2026-07-19T10:00:00.000Z")

    expect(getCalendarMonthPeriod(now, 0)).toMatchObject({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      dayCount: 31,
    })
    expect(getCalendarMonthPeriod(now, -1)).toMatchObject({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      dayCount: 30,
    })
  })

  it("aggregates monthly totals, daily averages, empty days, and weekly breakdown", () => {
    const period = getCalendarMonthPeriod(new Date("2026-07-19T10:00:00.000Z"), 0)
    const report = buildNutritionPeriodReport({
      kind: "monthly",
      period,
      client,
      foodLogs: [
        log({ logged_at: "2026-07-01T08:00:00.000Z", calories: 500, protein_g: 30, carbs_g: 60, fat_g: 15 }),
        log({ logged_at: "2026-07-01T20:00:00.000Z", calories: 700, protein_g: 35, carbs_g: 80, fat_g: 20, review_state: "corrected" }),
        log({ logged_at: "2026-07-02T08:00:00.000Z", calories: null, protein_g: null, carbs_g: null, fat_g: null }),
        log({ logged_at: "2026-07-03T08:00:00.000Z", calories: 900, protein_g: 10, carbs_g: 100, fat_g: 40, review_state: "rejected" }),
        log({ logged_at: "2026-07-04T08:00:00.000Z", calories: 300, protein_g: 15, carbs_g: 35, fat_g: 8, review_state: "merged" }),
        log({ logged_at: "2026-06-30T08:00:00.000Z", calories: 999, protein_g: 99, carbs_g: 99, fat_g: 99 }),
        log({ logged_at: "2026-08-01T08:00:00.000Z", calories: 999, protein_g: 99, carbs_g: 99, fat_g: 99 }),
      ],
    })

    expect(report.status).toBe("partial")
    expect(report.reportableMealCount).toBe(3)
    expect(report.excludedMealCount).toBe(2)
    expect(report.missingMacroEntries).toBe(1)
    expect(report.noLogDays).toBe(29)
    expect(report.totals).toEqual({ calories: 1200, protein: 65, carbs: 140, fat: 35 })
    expect(report.dailyAverages).toEqual({ calories: 39, protein: 2.1, carbs: 4.5, fat: 1.1 })
    expect(report.dailyBreakdown[0]).toMatchObject({
      date: "2026-07-01",
      mealCount: 2,
      totals: { calories: 1200, protein: 65, carbs: 140, fat: 35 },
    })
    expect(report.weeklyBreakdown.length).toBeGreaterThan(0)
    expect(report.sharePreview).toContain("Test Client")
    expect(report.csv).toContain("NutriRelay report,monthly")
  })

  it("handles no-data and missing macro weekly reports safely", () => {
    const period = getCalendarWeekPeriod(new Date("2026-07-19T10:00:00.000Z"), 0)

    const empty = buildNutritionPeriodReport({ kind: "weekly", period, client, foodLogs: [] })
    expect(empty.status).toBe("no_data")
    expect(empty.totals.calories).toBe(0)
    expect(empty.dailyBreakdown).toHaveLength(7)

    const partial = buildNutritionPeriodReport({
      kind: "weekly",
      period,
      client,
      foodLogs: [
        log({ logged_at: "2026-07-13T08:00:00.000Z", calories: 450, protein_g: 14, carbs_g: 85, fat_g: null }),
      ],
    })
    expect(partial.status).toBe("partial")
    expect(partial.missingMacroEntries).toBe(1)
  })

  it("keeps automation dry-run gated and skips unsafe delivery candidates", () => {
    const now = new Date("2026-07-19T10:00:00.000Z")
    const currentWeek = getCalendarWeekPeriod(now, 0)
    const previousMonth = getCalendarMonthPeriod(now, -1)
    const weeklyReport = buildNutritionPeriodReport({
      kind: "weekly",
      period: currentWeek,
      client,
      foodLogs: [log({ logged_at: "2026-07-13T08:00:00.000Z" })],
    })
    const monthlyReport = buildNutritionPeriodReport({
      kind: "monthly",
      period: previousMonth,
      client,
      foodLogs: [log({ logged_at: "2026-06-13T08:00:00.000Z" })],
    })

    const plan = buildReportAutomationPlan({
      clients: [
        client,
        { ...client, id: "client-2", name: "No Phone", phoneNumber: null },
        { ...client, id: "client-3", name: "Inactive", isActive: false },
      ],
      currentWeek,
      previousMonth,
      weeklyReports: [weeklyReport],
      previousMonthlyReports: [monthlyReport],
      hasConnectedWaba: true,
      weeklyHistory: [],
      monthlyHistory: [{ client_id: "client-1", report_month: "2026-06-01" }],
    })

    expect(plan.mode).toBe("dry-run")
    expect(plan.weekly.map((item) => item.action)).toEqual(["would_send", "skip", "skip"])
    expect(plan.monthly[0]).toMatchObject({
      action: "skip",
      reason: "stored report already exists for period",
    })
  })
})
