import { countsTowardMacros } from "@/lib/meals/reviewRules"
import { createServiceDb } from "@/lib/ownership"
import type { MealReviewState } from "@/types/meal"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type ReportKind = "weekly" | "monthly"
export type ReportStatus = "ready" | "partial" | "no_data" | "not_generated"

export interface ReportPeriod {
  key: string
  label: string
  startIso: string
  endIso: string
  startDate: string
  endDate: string
  dayCount: number
}

export interface ReportFoodLog {
  id?: string
  client_id: string
  trainer_id?: string | null
  logged_at: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  review_state?: string | null
  verification_status?: string | null
  notes?: string | null
}

export interface ReportClient {
  id: string
  name: string
  phoneNumber: string | null
  isActive: boolean
  goal: {
    goalType: string | null
    startingWeight: number | null
    currentWeight: number | null
    targetWeight: number | null
    targetDate: string | null
  } | null
}

export interface MacroTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface DailyReportBreakdown {
  date: string
  mealCount: number
  totals: MacroTotals
  missingMacros: number
}

export interface WeeklyReportBreakdown {
  weekStart: string
  weekEnd: string
  mealCount: number
  totals: MacroTotals
}

export interface NutritionPeriodReport {
  kind: ReportKind
  period: ReportPeriod
  client: ReportClient
  status: ReportStatus
  totals: MacroTotals
  dailyAverages: MacroTotals
  dailyBreakdown: DailyReportBreakdown[]
  weeklyBreakdown: WeeklyReportBreakdown[]
  reportableMealCount: number
  excludedMealCount: number
  missingMacroEntries: number
  noLogDays: number
  goalComparison: string | null
  sharePreview: string
  csv: string
}

export interface ReportAutomationPlanItem {
  clientId: string
  clientName: string
  kind: ReportKind
  periodKey: string
  action: "would_send" | "skip"
  reason: string
}

export interface ReportAutomationPlan {
  mode: "dry-run"
  weekly: ReportAutomationPlanItem[]
  monthly: ReportAutomationPlanItem[]
}

export interface ReportsCenterData {
  generatedAt: string
  clients: ReportClient[]
  currentWeek: ReportPeriod
  previousWeek: ReportPeriod
  currentMonth: ReportPeriod
  previousMonth: ReportPeriod
  weeklyReports: NutritionPeriodReport[]
  previousWeeklyReports: NutritionPeriodReport[]
  monthlyReports: NutritionPeriodReport[]
  previousMonthlyReports: NutritionPeriodReport[]
  automationPlan: ReportAutomationPlan
  wabaStatus: {
    status: string
    hasPhoneNumberId: boolean
  }
}

interface TrainerClientLinkRow {
  client_id: string
  is_active: boolean | null
}

interface ProfileRow {
  id: string
  full_name: string | null
  phone_number: string | null
}

interface GoalRow {
  client_id: string
  goal_type: string | null
  starting_weight: number | null
  current_weight: number | null
  target_weight: number | null
  target_date: string | null
}

interface StoredReportRow {
  client_id: string
  report_date?: string | null
  report_month?: string | null
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function startOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  return addDays(startOfUtcDay(date), mondayOffset)
}

function makePeriod(kind: ReportKind, label: string, start: Date, end: Date): ReportPeriod {
  const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY))
  return {
    key: `${kind}:${toDateKey(start)}`,
    label,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: toDateKey(start),
    endDate: toDateKey(addDays(end, -1)),
    dayCount,
  }
}

export function getCalendarMonthPeriod(now: Date, offsetMonths: 0 | -1 = 0): ReportPeriod {
  const start = addMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), offsetMonths)
  const end = addMonths(start, 1)
  const label = offsetMonths === 0 ? "Current month" : "Previous month"
  return makePeriod("monthly", label, start, end)
}

export function getCalendarWeekPeriod(now: Date, offsetWeeks: 0 | -1 = 0): ReportPeriod {
  const start = addDays(startOfUtcWeek(now), offsetWeeks * 7)
  const end = addDays(start, 7)
  const label = offsetWeeks === 0 ? "Current week" : "Previous week"
  return makePeriod("weekly", label, start, end)
}

function makeEmptyDailyRows(period: ReportPeriod): DailyReportBreakdown[] {
  return Array.from({ length: period.dayCount }, (_, index) => ({
    date: toDateKey(addDays(new Date(period.startIso), index)),
    mealCount: 0,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    missingMacros: 0,
  }))
}

function isWithinPeriod(log: ReportFoodLog, period: ReportPeriod): boolean {
  const time = new Date(log.logged_at).getTime()
  return time >= new Date(period.startIso).getTime() && time < new Date(period.endIso).getTime()
}

function addMacros(target: MacroTotals, log: ReportFoodLog): void {
  target.calories += Number(log.calories ?? 0)
  target.protein += Number(log.protein_g ?? 0)
  target.carbs += Number(log.carbs_g ?? 0)
  target.fat += Number(log.fat_g ?? 0)
}

function hasMissingMacro(log: ReportFoodLog): boolean {
  return log.calories === null || log.protein_g === null || log.carbs_g === null || log.fat_g === null
}

function buildWeeklyBreakdown(daily: DailyReportBreakdown[]): WeeklyReportBreakdown[] {
  const byWeek = new Map<string, WeeklyReportBreakdown>()

  for (const day of daily) {
    const weekStart = startOfUtcWeek(new Date(`${day.date}T00:00:00.000Z`))
    const key = toDateKey(weekStart)
    const current = byWeek.get(key) ?? {
      weekStart: key,
      weekEnd: toDateKey(addDays(weekStart, 6)),
      mealCount: 0,
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    }
    current.mealCount += day.mealCount
    current.totals.calories += day.totals.calories
    current.totals.protein += day.totals.protein
    current.totals.carbs += day.totals.carbs
    current.totals.fat += day.totals.fat
    byWeek.set(key, current)
  }

  return [...byWeek.values()].map((week) => ({
    ...week,
    totals: {
      calories: Math.round(week.totals.calories),
      protein: round(week.totals.protein),
      carbs: round(week.totals.carbs),
      fat: round(week.totals.fat),
    },
  }))
}

function buildGoalComparison(client: ReportClient, totals: MacroTotals): string | null {
  if (!client.goal) return null
  const parts = [
    client.goal.goalType ? `Goal: ${client.goal.goalType.replaceAll("_", " ").toLowerCase()}` : null,
    client.goal.currentWeight !== null ? `current ${client.goal.currentWeight} kg` : null,
    client.goal.targetWeight !== null ? `target ${client.goal.targetWeight} kg` : null,
    totals.calories > 0 ? `${Math.round(totals.calories)} kcal logged in period` : null,
  ].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join(" · ") : null
}

export function buildReportCsv(report: Omit<NutritionPeriodReport, "csv" | "sharePreview">): string {
  const escape = (value: string | number | null) => {
    const text = value === null ? "" : String(value)
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  const rows = [
    ["NutriRelay report", report.kind],
    ["Client", report.client.name],
    ["Period", `${report.period.startDate} to ${report.period.endDate}`],
    ["Generated status", report.status],
    ["Total calories", report.totals.calories],
    ["Total protein", report.totals.protein],
    ["Total carbs", report.totals.carbs],
    ["Total fat", report.totals.fat],
    [],
    ["Date", "Meals", "Calories", "Protein", "Carbs", "Fat", "Missing macros"],
    ...report.dailyBreakdown.map((day) => [
      day.date,
      day.mealCount,
      day.totals.calories,
      day.totals.protein,
      day.totals.carbs,
      day.totals.fat,
      day.missingMacros,
    ]),
  ]
  return rows.map((row) => row.map((value) => escape(value ?? "")).join(",")).join("\n")
}

export function buildSharePreview(report: Omit<NutritionPeriodReport, "sharePreview" | "csv">): string {
  if (report.status === "no_data") {
    return `Hi ${report.client.name}, your ${report.period.label.toLowerCase()} NutriRelay report for ${report.period.startDate} to ${report.period.endDate} has no logged meals yet.`
  }

  return [
    `Hi ${report.client.name}, here is your NutriRelay ${report.period.label.toLowerCase()} report (${report.period.startDate} to ${report.period.endDate}).`,
    `Logged: ${report.reportableMealCount} meal${report.reportableMealCount === 1 ? "" : "s"}, ${report.totals.calories} kcal, P ${report.totals.protein}g, C ${report.totals.carbs}g, F ${report.totals.fat}g.`,
    report.goalComparison ? report.goalComparison : null,
    "Your trainer will review anything marked partial before sending.",
  ].filter((line): line is string => Boolean(line)).join("\n")
}

export function buildNutritionPeriodReport(input: {
  kind: ReportKind
  period: ReportPeriod
  client: ReportClient
  foodLogs: ReportFoodLog[]
}): NutritionPeriodReport {
  const dailyBreakdown = makeEmptyDailyRows(input.period)
  const dailyByDate = new Map(dailyBreakdown.map((day) => [day.date, day]))
  const periodLogs = input.foodLogs.filter((log) => isWithinPeriod(log, input.period))
  const reportableLogs = periodLogs.filter((log) => countsTowardMacros(log.review_state as MealReviewState | null | undefined))
  const excludedMealCount = periodLogs.length - reportableLogs.length
  let missingMacroEntries = 0
  const totals: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 }

  for (const log of reportableLogs) {
    const date = new Date(log.logged_at).toISOString().slice(0, 10)
    const day = dailyByDate.get(date)
    if (!day) continue
    day.mealCount += 1
    if (hasMissingMacro(log)) {
      day.missingMacros += 1
      missingMacroEntries += 1
    }
    addMacros(day.totals, log)
    addMacros(totals, log)
  }

  for (const day of dailyBreakdown) {
    day.totals = {
      calories: Math.round(day.totals.calories),
      protein: round(day.totals.protein),
      carbs: round(day.totals.carbs),
      fat: round(day.totals.fat),
    }
  }

  const roundedTotals = {
    calories: Math.round(totals.calories),
    protein: round(totals.protein),
    carbs: round(totals.carbs),
    fat: round(totals.fat),
  }
  const noLogDays = dailyBreakdown.filter((day) => day.mealCount === 0).length
  const status: ReportStatus = reportableLogs.length === 0
    ? "no_data"
    : missingMacroEntries > 0 || noLogDays > 0
      ? "partial"
      : "ready"
  const dailyAverages = {
    calories: Math.round(roundedTotals.calories / input.period.dayCount),
    protein: round(roundedTotals.protein / input.period.dayCount),
    carbs: round(roundedTotals.carbs / input.period.dayCount),
    fat: round(roundedTotals.fat / input.period.dayCount),
  }
  const reportWithoutComputed = {
    kind: input.kind,
    period: input.period,
    client: input.client,
    status,
    totals: roundedTotals,
    dailyAverages,
    dailyBreakdown,
    weeklyBreakdown: input.kind === "monthly" ? buildWeeklyBreakdown(dailyBreakdown) : [],
    reportableMealCount: reportableLogs.length,
    excludedMealCount,
    missingMacroEntries,
    noLogDays,
    goalComparison: buildGoalComparison(input.client, roundedTotals),
  }

  return {
    ...reportWithoutComputed,
    sharePreview: buildSharePreview(reportWithoutComputed),
    csv: buildReportCsv(reportWithoutComputed),
  }
}

function csvDownloadHref(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
}

export function getReportDownloadHref(report: NutritionPeriodReport): string {
  return csvDownloadHref(report.csv)
}

function makeClient(link: TrainerClientLinkRow, profile: ProfileRow | null, goal: GoalRow | null): ReportClient {
  return {
    id: link.client_id,
    name: profile?.full_name?.trim() || `Client ${link.client_id.slice(0, 8)}`,
    phoneNumber: profile?.phone_number ?? null,
    isActive: link.is_active === true,
    goal: goal
      ? {
        goalType: goal.goal_type,
        startingWeight: goal.starting_weight,
        currentWeight: goal.current_weight,
        targetWeight: goal.target_weight,
        targetDate: goal.target_date,
      }
      : null,
  }
}

function existingPeriodKeys(rows: StoredReportRow[], field: "report_date" | "report_month"): Set<string> {
  return new Set(rows.map((row) => row[field]).filter((value): value is string => Boolean(value)))
}

function buildAutomationItems(input: {
  kind: ReportKind
  clients: ReportClient[]
  reports: NutritionPeriodReport[]
  period: ReportPeriod
  hasConnectedWaba: boolean
  existingKeys: Set<string>
}): ReportAutomationPlanItem[] {
  const reportByClientId = new Map(input.reports.map((report) => [report.client.id, report]))
  return input.clients.map((client) => {
    if (!client.isActive) {
      return { clientId: client.id, clientName: client.name, kind: input.kind, periodKey: input.period.key, action: "skip", reason: "inactive trainer-client link" }
    }
    if (!client.phoneNumber) {
      return { clientId: client.id, clientName: client.name, kind: input.kind, periodKey: input.period.key, action: "skip", reason: "missing client phone" }
    }
    if (!input.hasConnectedWaba) {
      return { clientId: client.id, clientName: client.name, kind: input.kind, periodKey: input.period.key, action: "skip", reason: "trainer WABA not connected" }
    }
    const report = reportByClientId.get(client.id)
    if (!report || report.status === "no_data") {
      return { clientId: client.id, clientName: client.name, kind: input.kind, periodKey: input.period.key, action: "skip", reason: "no report data" }
    }
    if (input.existingKeys.has(input.period.startDate)) {
      return { clientId: client.id, clientName: client.name, kind: input.kind, periodKey: input.period.key, action: "skip", reason: "stored report already exists for period" }
    }
    return { clientId: client.id, clientName: client.name, kind: input.kind, periodKey: input.period.key, action: "would_send", reason: "dry-run only; live send remains gated" }
  })
}

export function buildReportAutomationPlan(input: {
  clients: ReportClient[]
  currentWeek: ReportPeriod
  previousMonth: ReportPeriod
  weeklyReports: NutritionPeriodReport[]
  previousMonthlyReports: NutritionPeriodReport[]
  hasConnectedWaba: boolean
  weeklyHistory: StoredReportRow[]
  monthlyHistory: StoredReportRow[]
}): ReportAutomationPlan {
  return {
    mode: "dry-run",
    weekly: buildAutomationItems({
      kind: "weekly",
      clients: input.clients,
      reports: input.weeklyReports,
      period: input.currentWeek,
      hasConnectedWaba: input.hasConnectedWaba,
      existingKeys: existingPeriodKeys(input.weeklyHistory, "report_date"),
    }),
    monthly: buildAutomationItems({
      kind: "monthly",
      clients: input.clients,
      reports: input.previousMonthlyReports,
      period: input.previousMonth,
      hasConnectedWaba: input.hasConnectedWaba,
      existingKeys: existingPeriodKeys(input.monthlyHistory, "report_month"),
    }),
  }
}

export async function getTrainerReportsCenterData(trainerId: string, now = new Date()): Promise<ReportsCenterData> {
  const db = createServiceDb()
  const currentWeek = getCalendarWeekPeriod(now, 0)
  const previousWeek = getCalendarWeekPeriod(now, -1)
  const currentMonth = getCalendarMonthPeriod(now, 0)
  const previousMonth = getCalendarMonthPeriod(now, -1)
  const queryStart = new Date(Math.min(
    new Date(previousWeek.startIso).getTime(),
    new Date(previousMonth.startIso).getTime(),
  ))
  const queryEnd = new Date(Math.max(
    new Date(currentWeek.endIso).getTime(),
    new Date(currentMonth.endIso).getTime(),
  ))

  const { data: links } = await db
    .from("trainer_clients")
    .select("client_id, is_active")
    .eq("trainer_id", trainerId)

  const linkRows = (links ?? []) as TrainerClientLinkRow[]
  const clientIds = [...new Set(linkRows.map((link) => link.client_id))]

  const [
    profilesRes,
    goalsRes,
    foodLogsRes,
    weeklyHistoryRes,
    monthlyHistoryRes,
    wabaRes,
  ] = await Promise.all([
    clientIds.length > 0
      ? db.from("profiles").select("id, full_name, phone_number").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? db
        .from("client_goals")
        .select("client_id, goal_type, starting_weight, current_weight, target_weight, target_date")
        .eq("trainer_id", trainerId)
        .eq("goal_status", "ACTIVE")
        .in("client_id", clientIds)
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? db
        .from("food_logs")
        .select("id, client_id, trainer_id, logged_at, calories, protein_g, carbs_g, fat_g, review_state, verification_status, notes")
        .eq("trainer_id", trainerId)
        .in("client_id", clientIds)
        .gte("logged_at", queryStart.toISOString())
        .lt("logged_at", queryEnd.toISOString())
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? db
        .from("weekly_reports")
        .select("client_id, report_date")
        .in("client_id", clientIds)
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? db
        .from("monthly_reports")
        .select("client_id, report_month")
        .eq("trainer_id", trainerId)
        .in("client_id", clientIds)
      : Promise.resolve({ data: [] }),
    db
      .from("trainer_waba_credentials")
      .select("status, phone_number_id")
      .eq("trainer_id", trainerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const profilesById = new Map(((profilesRes.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
  const goalsByClientId = new Map(((goalsRes.data ?? []) as GoalRow[]).map((goal) => [goal.client_id, goal]))
  const clients = linkRows.map((link) => makeClient(link, profilesById.get(link.client_id) ?? null, goalsByClientId.get(link.client_id) ?? null))
  const activeClients = clients.filter((client) => client.isActive)
  const foodLogs = (foodLogsRes.data ?? []) as unknown as ReportFoodLog[]
  const buildForPeriod = (kind: ReportKind, period: ReportPeriod) =>
    activeClients.map((client) => buildNutritionPeriodReport({
      kind,
      period,
      client,
      foodLogs: foodLogs.filter((log) => log.client_id === client.id),
    }))
  const wabaRow = wabaRes.data as { status: string | null; phone_number_id: string | null } | null
  const hasConnectedWaba = wabaRow?.status === "connected" && Boolean(wabaRow.phone_number_id)
  const weeklyReports = buildForPeriod("weekly", currentWeek)
  const previousWeeklyReports = buildForPeriod("weekly", previousWeek)
  const monthlyReports = buildForPeriod("monthly", currentMonth)
  const previousMonthlyReports = buildForPeriod("monthly", previousMonth)

  return {
    generatedAt: now.toISOString(),
    clients: activeClients,
    currentWeek,
    previousWeek,
    currentMonth,
    previousMonth,
    weeklyReports,
    previousWeeklyReports,
    monthlyReports,
    previousMonthlyReports,
    automationPlan: buildReportAutomationPlan({
      clients,
      currentWeek,
      previousMonth,
      weeklyReports,
      previousMonthlyReports,
      hasConnectedWaba,
      weeklyHistory: (weeklyHistoryRes.data ?? []) as StoredReportRow[],
      monthlyHistory: (monthlyHistoryRes.data ?? []) as StoredReportRow[],
    }),
    wabaStatus: {
      status: wabaRow?.status ?? "missing",
      hasPhoneNumberId: Boolean(wabaRow?.phone_number_id),
    },
  }
}
