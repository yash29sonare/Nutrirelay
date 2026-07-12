import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { PageContainer } from "@/components/layout/PageContainer"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { InlineNotice } from "@/components/ui/InlineNotice"
import {
  ArrowLeft, AlertTriangle, CalendarClock, Dumbbell, Goal, ImageIcon, UtensilsCrossed,
} from "lucide-react"
import { getDashboardData } from "@/lib/operations/dashboard"
import { getClientById } from "@/lib/operations/clients"
import {
  getClientRiskLevel,
  getComplianceState,
  getPerformanceTrend,
} from "@/lib/domain/dashboardSemantics"
import { createClient } from "@/utils/supabase/server"
import { getClientEvents } from "@/lib/events/engagementEventStore"
import { mapEngagementEvents, mapClientState } from "@/lib/timeline/timelineMapper"
import { getClientMeals, getClientMealsForDay } from "@/lib/meals/mealOperations"
import { mapMealRecordsToTimelineEntries } from "@/lib/meals/mealTimelineMapper"
import { getTrainerProfile } from "@/lib/operations/trainer"
import { getClientDetail } from "@/lib/dashboard-reads"
import type { ClientSummary } from "@/types/dashboard"
import type { MealRecord } from "@/types/meal"
import { ClientTimeline } from "./components/ClientTimeline"
import { MealHistory } from "./components/MealHistory"
import { formatDate, formatNumber } from "@/lib/format"

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string
  current: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="text-[var(--foreground)] tabular-nums">
          {current} / {target}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-right" style={{ color }}>
        {pct}%
      </p>
    </div>
  )
}

function formatMediaKind(kind: string | null) {
  switch (kind) {
    case "food_photo":
      return "Food photo"
    case "progress_photo":
      return "Progress photo"
    case "other_media":
      return "Other media"
    default:
      return "Unclassified image"
  }
}

function normalizeMealText(meal: MealRecord): string {
  return (meal.sourceText ?? meal.notes ?? meal.mealType)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function groupSimilarMeals(meals: MealRecord[]): Array<MealRecord & { duplicateCount?: number }> {
  const grouped = new Map<string, MealRecord & { duplicateCount?: number }>()

  for (const meal of meals) {
    const key = [
      normalizeMealText(meal),
      meal.calories,
      meal.proteinG,
      meal.carbsG,
      meal.fatG,
      meal.sourceType ?? "unknown",
      meal.review.status,
      meal.attachment ? "image" : "no-image",
    ].join("|")

    const existing = grouped.get(key)
    if (existing) {
      existing.duplicateCount = (existing.duplicateCount ?? 1) + 1
      continue
    }

    grouped.set(key, { ...meal, duplicateCount: 1 })
  }

  return [...grouped.values()]
}

function sumMeals(meals: MealRecord[]) {
  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.proteinG,
      carbs: acc.carbs + meal.carbsG,
      fat: acc.fat + meal.fatG,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

function formatGoalType(value: unknown): string {
  if (typeof value !== "string" || !value) return "No active goal"
  return value.toLowerCase().replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase())
}

function valueText(record: Record<string, any> | null | undefined, key: string, fallback = "Not set") {
  const value = record?.[key]
  if (value === null || value === undefined || value === "") return fallback
  return String(value)
}

function computeBmi(health: Record<string, any> | null): string | null {
  const heightCm = Number(health?.height_cm ?? 0)
  const weightKg = Number(health?.weight_kg ?? 0)
  if (!heightCm || !weightKg) return null
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  return Number.isFinite(bmi) ? bmi.toFixed(1) : null
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authUserId = user?.id ?? null

  if (!authUserId) {
    return (
      <PageContainer>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <EmptyState title="Sign in to view client details." />
      </PageContainer>
    )
  }

  const result = await getDashboardData(authUserId)
  const trainerProfile = await getTrainerProfile(authUserId)

  if (!result.success) {
    return (
      <PageContainer>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <ErrorState title="Client not found or access denied." />
      </PageContainer>
    )
  }

  const clientDetail = trainerProfile
    ? await getClientDetail(id, authUserId)
    : null
  const dto = result.data
  const summaryClient = getClientById(id, dto)
  const client: ClientSummary | null = summaryClient ?? (clientDetail
    ? {
        client_id: clientDetail.client_id,
        client_name: clientDetail.full_name ?? "Client",
        trainer_id: authUserId,
        total_meals_logged_today: 0,
        total_calories_today: 0,
        total_protein_today: 0,
        total_carbs_today: 0,
        total_fat_today: 0,
        active_strike_count: 0,
      }
    : null)

  if (!client) {
    return (
      <PageContainer>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <ErrorState title="Client not found or access denied." />
      </PageContainer>
    )
  }

  const riskLevel = getClientRiskLevel(client)
  const compliance = getComplianceState(dto.metrics)
  const trend = getPerformanceTrend(dto.metrics)

  const TARGETS = { calories: 2200, protein: 160, carbs: 220, fat: 70 }

  const events = await getClientEvents(id)
  const eventEntries = mapEngagementEvents(events, id)
  const stateEntries = mapClientState(client)
  const meals = await getClientMeals(id, { limit: 40 })
  const todayMeals = await getClientMealsForDay(id)
  const displayedMeals = groupSimilarMeals(meals).slice(0, 12)
  const latestMeals = displayedMeals.slice(0, 6)
  const mealEntries = mapMealRecordsToTimelineEntries(latestMeals)
  const todayMacros = sumMeals(todayMeals)

  const needsReview = meals.find(
    (m) => m.review.status === "recorded" || m.review.status === "pending",
  )

  const unverifiedMeals = meals.filter(
    (m) => m.review.status === "unverified",
  ).length

  const activeGoal = clientDetail?.goal ?? null
  const health = clientDetail?.health ?? null
  const onboarding = clientDetail?.onboarding ?? null
  const workout = clientDetail?.workout ?? null
  const latestMedia = clientDetail?.media?.slice(0, 4) ?? []
  const latestStructuredResponse = clientDetail?.latestStructuredResponse ?? null
  const bmi = computeBmi(health)

  return (
    <PageContainer>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      {/* Section 1: Client Overview */}
      <div className="flex items-start gap-4 py-5 flex-wrap" id="page-heading">
        <Avatar
          fallback={client.client_name.charAt(0).toUpperCase()}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              {client.client_name}
            </h1>
            <Badge
              variant={
                riskLevel === "high"
                  ? "danger"
                  : riskLevel === "medium"
                    ? "warning"
                    : "default"
              }
              className="flex items-center gap-1"
            >
              {riskLevel !== "low" && <AlertTriangle size={11} />}
              {riskLevel === "high"
                ? "High risk"
                : riskLevel === "medium"
                  ? "Medium risk"
                  : "Low risk"}
            </Badge>
            <Badge
              variant={
                compliance.level === "excellent" || compliance.level === "good"
                  ? "success"
                  : compliance.level === "moderate"
                    ? "default"
                    : "warning"
              }
            >
              Compliance: {compliance.level}
            </Badge>
          </div>
          <p className="text-sm text-[var(--muted)] mt-1">
            {todayMeals.length} intake event{todayMeals.length !== 1 ? "s" : ""} today · {formatNumber(todayMacros.calories)} kcal logged
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {unverifiedMeals > 0 && (
          <InlineNotice variant="warning">
            {unverifiedMeals} logged intake item{unverifiedMeals !== 1 ? "s" : ""} need trainer review.
          </InlineNotice>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-6">
          <DashboardSection title="Client Media" description="Latest inbound WhatsApp photos for this client">
            {latestMedia.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {latestMedia.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="space-y-3 p-3">
                      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]">
                        {item.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.media_url}
                            alt={formatMediaKind(item.media_kind)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[var(--muted)]">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              item.media_kind === "food_photo"
                                ? "success"
                                : item.media_kind === "progress_photo"
                                  ? "info"
                                  : "outline"
                            }
                          >
                            {formatMediaKind(item.media_kind)}
                          </Badge>
                          <span className="text-[10px] text-[var(--muted)]">
                            {new Date(item.message_timestamp).toLocaleString()}
                          </span>
                        </div>
                        {item.caption ? (
                          <p className="line-clamp-2 text-xs text-[var(--muted)]">{item.caption}</p>
                        ) : null}
                        {item.wam_id ? (
                          <p className="truncate text-[10px] text-[var(--muted)]">WhatsApp id: {item.wam_id}</p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-6">
                  <EmptyState title="No client media yet" description="Inbound WhatsApp images will appear here after processing." />
                </CardContent>
              </Card>
            )}
          </DashboardSection>

          <DashboardSection title="Today's Macros" description={`${todayMeals.length} logged intake event${todayMeals.length !== 1 ? "s" : ""} for ${formatDate(new Date())}`}>
            <Card>
              <CardContent className="space-y-4">
                <MacroBar
                  label="Calories (kcal)"
                  current={todayMacros.calories}
                  target={TARGETS.calories}
                  color="#22c55e"
                />
                <MacroBar
                  label="Protein (g)"
                  current={Math.round(todayMacros.protein * 10) / 10}
                  target={TARGETS.protein}
                  color="#38bdf8"
                />
                <MacroBar
                  label="Carbohydrates (g)"
                  current={Math.round(todayMacros.carbs * 10) / 10}
                  target={TARGETS.carbs}
                  color="#f59e0b"
                />
                <MacroBar
                  label="Fat (g)"
                  current={Math.round(todayMacros.fat * 10) / 10}
                  target={TARGETS.fat}
                  color="#f472b6"
                />
              </CardContent>
            </Card>
          </DashboardSection>
        </div>

        <DashboardSection title="Latest Structured Reply" description="Most recent WhatsApp structured response from this client">
          <Card>
            <CardContent className="space-y-3 py-5">
              {latestStructuredResponse ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">
                      {latestStructuredResponse.interactive_type ?? "structured_reply"}
                    </Badge>
                    <span className="text-xs text-[var(--muted)]">
                      {new Date(latestStructuredResponse.message_timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    {latestStructuredResponse.prompt ? (
                      <p className="text-xs text-[var(--muted)]">
                        Prompt: {latestStructuredResponse.prompt}
                      </p>
                    ) : null}
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {latestStructuredResponse.selected_option ?? latestStructuredResponse.reply_label ?? "Structured reply received"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {latestStructuredResponse.adherence_status ? (
                        <Badge variant={latestStructuredResponse.needs_review ? "warning" : "success"}>
                          {latestStructuredResponse.adherence_status.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                      {latestStructuredResponse.automation_state ? (
                        <Badge variant="outline">
                          {latestStructuredResponse.automation_state.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Reply ID: {latestStructuredResponse.reply_id ?? "Not available"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)] break-all">
                      Prompt WAM ID: {latestStructuredResponse.context_wam_id ?? "Not available"}
                    </p>
                    {latestStructuredResponse.follow_up_message ? (
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Follow-up: {latestStructuredResponse.follow_up_message}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No structured replies yet"
                  description="Interactive WhatsApp selections will appear here after inbound processing succeeds."
                />
              )}
            </CardContent>
          </Card>
        </DashboardSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DashboardSection title="Onboarding" description="WhatsApp setup progress for this client">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-overlay)]">
                    <CalendarClock size={16} className="text-[var(--foreground)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {onboarding?.status?.replace(/_/g, " ") ?? "Not started"}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Current step: {onboarding?.current_step?.replace(/_/g, " ") ?? "height"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Height</p>
                    <p className="font-medium text-[var(--foreground)]">{valueText(health, "height_cm")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Current weight</p>
                    <p className="font-medium text-[var(--foreground)]">{valueText(health, "weight_kg")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">BMI</p>
                    <p className="font-medium text-[var(--foreground)]">{bmi ?? "Not enough data"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Missing</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {onboarding?.missing_fields?.length ? onboarding.missing_fields.join(", ") : "None"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Allergies</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {Array.isArray(health?.allergies) && health.allergies.length > 0 ? health.allergies.join(", ") : "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Preference</p>
                    <p className="font-medium text-[var(--foreground)]">{valueText(health, "diet_type")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DashboardSection>

          <DashboardSection title="Goal Summary" description="Current nutrition target">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--info)]/10">
                    <Goal size={16} className="text-[var(--info)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{formatGoalType(activeGoal?.goal_type)}</p>
                    <p className="text-xs text-[var(--muted)]">Target date: {valueText(activeGoal, "target_date")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Starting</p>
                    <p className="font-medium text-[var(--foreground)]">{valueText(activeGoal, "starting_weight")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Current</p>
                    <p className="font-medium text-[var(--foreground)]">{valueText(activeGoal, "current_weight")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Target</p>
                    <p className="font-medium text-[var(--foreground)]">{valueText(activeGoal, "target_weight")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Allergies</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {Array.isArray(health?.allergies) && health.allergies.length > 0 ? health.allergies.join(", ") : "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Dislikes</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {Array.isArray(health?.food_restrictions) && health.food_restrictions.length > 0 ? health.food_restrictions.join(", ") : "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DashboardSection>

          <DashboardSection title="Workout Routine" description="Timing used by WhatsApp reminder logic">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--warning)]/10">
                    <Dumbbell size={16} className="text-[var(--warning)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{valueText(workout, "workout_time", "No workout time")}</p>
                    <p className="text-xs text-[var(--muted)]">Timezone: {valueText(workout, "timezone", "Asia/Kolkata")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Check-in</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {valueText(workout, "checkin_preference", valueText(workout, "preferred_checkin_time"))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Rest days</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {Array.isArray(workout?.rest_days) && workout.rest_days.length > 0 ? workout.rest_days.join(", ") : "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Routine</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {[
                        Array.isArray(clientDetail?.onboarding?.skipped_meals) && clientDetail.onboarding.skipped_meals.includes("breakfast")
                          ? "B skipped"
                          : workout?.breakfast_time ? `B ${workout.breakfast_time}` : null,
                        workout?.lunch_time ? `L ${workout.lunch_time}` : null,
                        workout?.snack_time ? `S ${workout.snack_time}` : null,
                        workout?.dinner_time ? `D ${workout.dinner_time}` : null,
                      ].filter(Boolean).join(", ") || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Workout days</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {Array.isArray(workout?.workout_days) && workout.workout_days.length > 0 ? workout.workout_days.join(", ") : "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DashboardSection>
        </div>

        <DashboardSection title="Latest Logged Intake" description="Grouped by matching food text, source, macros, and review state">
          <MealHistory
            meals={displayedMeals}
            title="Logged intake"
            description="Repeated identical rows are grouped on this page; source rows remain unchanged in food_logs."
            enableReviewActions
          />
        </DashboardSection>

        <DashboardSection title="Latest Activity">
          <ClientTimeline sources={[eventEntries, stateEntries, mealEntries]} />
        </DashboardSection>
        </div>
    </PageContainer>
  )
}
