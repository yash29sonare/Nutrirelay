import type { NutritionPeriodReport } from "@/lib/reports/report-center"

export type ClientReportProgressStatus = "On track" | "Needs consistency" | "Needs trainer review"

export interface ClientReportDraft {
  wins: string
  needsAttention: string
  trainerNote: string
  nextFocus: string[]
  recommendation: string
}

export interface ElapsedReportStats {
  elapsedDays: number
  activeDays: number
  noLogDays: number
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getElapsedReportStats(
  report: NutritionPeriodReport,
  asOf = new Date(),
): ElapsedReportStats {
  const asOfKey = toDateKey(asOf)
  const elapsedBreakdown = report.dailyBreakdown.filter((day) => day.date <= asOfKey)
  const activeDays = elapsedBreakdown.filter((day) => day.mealCount > 0).length

  return {
    elapsedDays: elapsedBreakdown.length,
    activeDays,
    noLogDays: elapsedBreakdown.length - activeDays,
  }
}

export function getClientReportProgressStatus(
  report: NutritionPeriodReport,
  asOf = new Date(),
): ClientReportProgressStatus {
  if (report.reportableMealCount === 0 || report.missingMacroEntries > 0) {
    return "Needs trainer review"
  }
  const stats = getElapsedReportStats(report, asOf)
  if (stats.elapsedDays > 0 && stats.activeDays / stats.elapsedDays < 0.7) {
    return "Needs consistency"
  }
  return "On track"
}

export function buildClientReportDraft(
  report: NutritionPeriodReport,
  asOf = new Date(),
): ClientReportDraft {
  const stats = getElapsedReportStats(report, asOf)
  const activeDays = stats.activeDays
  const wins = activeDays > 0
    ? `Logged nutrition on ${activeDays} day${activeDays === 1 ? "" : "s"} with ${report.reportableMealCount} meal${report.reportableMealCount === 1 ? "" : "s"} recorded.`
    : "Start logging meals so progress can be reviewed together."

  const attention: string[] = []
  if (stats.noLogDays > 0) {
    attention.push(`${stats.noLogDays} day${stats.noLogDays === 1 ? "" : "s"} had no meal logs`)
  }
  if (report.missingMacroEntries > 0) {
    attention.push(`${report.missingMacroEntries} meal ${report.missingMacroEntries === 1 ? "entry needs" : "entries need"} macro review`)
  }
  if (attention.length === 0) {
    attention.push("No data gaps were found in this report period")
  }

  return {
    wins,
    needsAttention: `${attention.join(". ")}.`,
    trainerNote: "",
    nextFocus: [
      stats.noLogDays > 0 ? "Log meals consistently on planned days." : "Continue the current logging routine.",
      "Add clear portions or meal photos when possible.",
      "Review the report with your trainer before changing the plan.",
    ],
    recommendation: "Keep the next step practical and review progress with your trainer.",
  }
}
