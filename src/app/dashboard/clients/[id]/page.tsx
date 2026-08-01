import Link from "next/link"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { DashboardSection } from "@/components/layout/DashboardSection"
import { PageContainer } from "@/components/layout/PageContainer"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { InlineNotice } from "@/components/ui/InlineNotice"
import {
  ArrowLeft, AlertTriangle, CalendarClock, CheckCheck, Dumbbell, Goal, History, MessageSquare,
} from "lucide-react"
import { getDashboardData } from "@/lib/operations/dashboard"
import { getClientById } from "@/lib/operations/clients"
import {
  getClientRiskLevel,
  getComplianceState,
} from "@/lib/domain/dashboardSemantics"
import { createClient } from "@/utils/supabase/server"
import { getClientEvents } from "@/lib/events/engagementEventStore"
import { mapEngagementEvents, mapClientState } from "@/lib/timeline/timelineMapper"
import { getClientMeals, getClientMealsForDay } from "@/lib/meals/mealOperations"
import { mapMealRecordsToTimelineEntries } from "@/lib/meals/mealTimelineMapper"
import { getTrainerProfile } from "@/lib/operations/trainer"
import { getClientDetail, getClientWhatsAppConversation, type ClientWhatsAppMessage } from "@/lib/dashboard-reads"
import type { ClientSummary } from "@/types/dashboard"
import type { MealRecord } from "@/types/meal"
import type { TimelineEntry } from "@/types/timeline"
import { ClientTimeline } from "./components/ClientTimeline"
import { MealHistory } from "./components/MealHistory"
import { ClientNameEditor } from "./components/ClientNameEditor"
import { DailyReviewNav } from "./components/DailyReviewNav"
import { formatDate, formatDateTime, formatNumber } from "@/lib/format"
import { buildTimeline } from "@/lib/timeline/timelineEngine"

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
  const roundedCurrent = Math.round(current)
  const pct = target > 0 ? Math.min(100, Math.round((roundedCurrent / target) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="text-[var(--foreground)] tabular-nums">
          {roundedCurrent} / {target}
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

function isDisplayablePhoto(item: { media_kind: string | null; media_url: string | null }) {
  return Boolean(item.media_url) && (item.media_kind === "food_photo" || item.media_kind === "progress_photo")
}

function groupMediaByDate<T extends { message_timestamp: string }>(items: T[]) {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = item.message_timestamp.slice(0, 10)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a))
}

function dateKeyFromDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateKey(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return dateKeyFromDate(new Date())
  const date = dateFromKey(value)
  return Number.isNaN(date.getTime()) ? dateKeyFromDate(new Date()) : value
}

function dateFromKey(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

function addDays(value: string, days: number): string {
  const date = dateFromKey(value)
  date.setDate(date.getDate() + days)
  return dateKeyFromDate(date)
}

function formatTime12Hour(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const [hourText, minuteText] = value.split(":")
  const hour = Number(hourText)
  const minute = Number(minuteText ?? 0)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
  const date = new Date(Date.UTC(2000, 0, 1, hour, minute))
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
}

function routinePart(label: string, value: unknown): string | null {
  const formatted = formatTime12Hour(value)
  return formatted ? `${label} ${formatted}` : null
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function humanizeValue(value: unknown, fallback = "Not set"): string {
  if (value === null || value === undefined || value === "") return fallback
  if (Array.isArray(value)) {
    const values = value.map((item) => humanizeValue(item, "")).filter(Boolean)
    return values.length > 0 ? values.join(", ") : fallback
  }
  const text = String(value).trim()
  if (!text) return fallback
  return toTitleCase(text.replace(/[_-]+/g, " ").replace(/\s+/g, " "))
}

function sentenceValue(value: unknown, fallback = "Not set"): string {
  if (Array.isArray(value)) return humanizeValue(value, fallback)
  if (typeof value === "string" && value.trim()) return value.trim().replace(/[_-]+/g, " ")
  return humanizeValue(value, fallback)
}

function formatDietLabel(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "Not set"
  const normalized = value.toLowerCase()
  const labels: Record<string, string> = {
    veg_eggs_allowed: "Vegetarian, eggs allowed",
    vegetarian: "Vegetarian",
    non_vegetarian: "Non-vegetarian",
    vegan: "Vegan",
    eggetarian: "Eggetarian",
  }
  return labels[normalized] ?? humanizeValue(value)
}

function hasListValue(record: Record<string, unknown> | null | undefined, key: string, expectedValue: string): boolean {
  const value = record?.[key]
  return Array.isArray(value) && value.includes(expectedValue)
}

function formatRoutineSummary(workout: Record<string, unknown> | null | undefined, onboarding: Record<string, unknown> | null | undefined) {
  const parts = [
    hasListValue(onboarding, "skipped_meals", "breakfast") ? "Breakfast skipped" : routinePart("Breakfast", workout?.breakfast_time),
    routinePart("Lunch", workout?.lunch_time),
    routinePart("Snack", workout?.snack_time),
    routinePart("Dinner", workout?.dinner_time),
  ].filter(Boolean)
  return parts.join(", ") || "Not set"
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
  return humanizeValue(value)
}

function valueText(record: Record<string, unknown> | null | undefined, key: string, fallback = "Not set") {
  const value = record?.[key]
  if (value === null || value === undefined || value === "") return fallback
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : fallback
  return String(value)
}

function computeBmi(health: Record<string, unknown> | null): string | null {
  const heightCm = Number(health?.height_cm ?? 0)
  const weightKg = Number(health?.weight_kg ?? 0)
  if (!heightCm || !weightKg) return null
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  return Number.isFinite(bmi) ? bmi.toFixed(1) : null
}

function ActivityPreview({ entries }: { entries: TimelineEntry[] }) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-overlay)]">
            <History size={15} className="text-[var(--foreground)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Latest activity</p>
            <p className="text-xs text-[var(--muted)]">Last client updates</p>
          </div>
        </div>
        {entries.length > 0 ? (
          <div className="space-y-2">
            {entries.slice(0, 2).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3 py-2">
                <p className="text-sm font-medium text-[var(--foreground)]">{entry.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted)]">{entry.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No recent activity yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

function statusVariant(status: string): "success" | "warning" | "danger" | "info" | "outline" {
  switch (status.toLowerCase()) {
    case "read":
    case "delivered":
    case "sent":
    case "received":
      return "success"
    case "queued":
    case "unknown":
      return "outline"
    case "failed":
      return "danger"
    default:
      return "info"
  }
}

function messageTypeLabel(message: ClientWhatsAppMessage) {
  if (message.direction === "OUTBOUND" && message.message_type === "TEXT" && message.display_text.startsWith("Logged:")) {
    return "Auto reply"
  }
  return humanizeValue(message.message_type)
}

function isRelevantConversationMessage(message: ClientWhatsAppMessage): boolean {
  if (message.direction === "INBOUND") return true
  if (message.food_log) return true
  const text = message.display_text.toLowerCase()
  return ["food", "meal", "diet", "nutrition", "calorie", "protein", "carb", "fat", "logged:"].some((keyword) =>
    text.includes(keyword),
  )
}

function mediaReadinessText(message: ClientWhatsAppMessage): string | null {
  const type = message.message_type.toUpperCase()
  const isMediaType = ["IMAGE", "AUDIO", "VOICE", "VIDEO", "DOCUMENT", "MEDIA"].includes(type)
  if (!isMediaType && !message.media_kind && !message.parser_status && !message.skip_reason) return null

  const mediaLabel = message.media_kind ? humanizeValue(message.media_kind).toLowerCase() : type.toLowerCase()
  const storageState = message.has_media_url ? "media reference saved" : "metadata only"
  const transcriptState = type === "AUDIO" || type === "VOICE"
    ? message.has_transcript ? "transcript available" : "no transcript saved"
    : null
  const parserState = message.parser_status ? `parser state: ${humanizeValue(message.parser_status).toLowerCase()}` : null
  const skipState = message.skip_reason ? `skip reason: ${humanizeValue(message.skip_reason).toLowerCase()}` : null

  return [mediaLabel, storageState, transcriptState, parserState, skipState].filter(Boolean).join(" · ")
}

function WhatsAppConversation({ messages, error }: { messages: ClientWhatsAppMessage[]; error: string | null }) {
  const visibleMessages = messages.filter(isRelevantConversationMessage)

  return (
    <DashboardSection title="WhatsApp Conversation" description="Saved message history and delivery status for this client">
      <Card>
        <CardContent className="space-y-4">
          {error ? (
            <ErrorState title={error} />
          ) : visibleMessages.length > 0 ? (
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-2">
              {visibleMessages.map((message) => (
                <div
                  key={message.id}
                  className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={message.direction === "INBOUND" ? "info" : "outline"}>
                        {humanizeValue(message.direction)}
                      </Badge>
                      <Badge variant="outline">{messageTypeLabel(message)}</Badge>
                      <Badge variant={statusVariant(message.latest_status)}>
                        {humanizeValue(message.latest_status)}
                      </Badge>
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      {formatDateTime(message.message_timestamp)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">
                    {message.display_text}
                  </p>

                  {mediaReadinessText(message) ? (
                    <div className="mt-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
                      Media handling: {mediaReadinessText(message)}
                    </div>
                  ) : null}

                  {message.food_log ? (
                    <div className="mt-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--muted)]">
                      <div className="flex flex-wrap items-center gap-2 text-[var(--foreground)]">
                        <MessageSquare size={13} />
                        <span className="font-medium">Linked food log</span>
                        <Badge variant="outline">{humanizeValue(message.food_log.review_state, "Review state unknown")}</Badge>
                      </div>
                      <p className="mt-1">
                        {message.food_log.notes ?? "Food log created from this WhatsApp message"}
                      </p>
                      <p className="mt-1 tabular-nums">
                        {formatNumber(message.food_log.calories ?? 0)} kcal · P {formatNumber(message.food_log.protein_g ?? 0)}g · C {formatNumber(message.food_log.carbs_g ?? 0)}g · F {formatNumber(message.food_log.fat_g ?? 0)}g
                      </p>
                    </div>
                  ) : null}

                  {message.status_history.length > 0 ? (
                    <details className="mt-3 text-xs text-[var(--muted)]">
                      <summary className="inline-flex cursor-pointer items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)]">
                        <CheckCheck size={13} />
                        Status history
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.status_history.map((status) => (
                          <Badge key={`${message.id}-${status.status}-${status.timestamp ?? "no-time"}`} variant={statusVariant(status.status)}>
                            {humanizeValue(status.status)}{status.timestamp ? ` · ${formatDateTime(status.timestamp)}` : ""}
                          </Badge>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No nutrition conversation yet"
              description="Client replies and nutrition-related messages will appear here after they are saved."
            />
          )}
        </CardContent>
      </Card>
    </DashboardSection>
  )
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ date?: string }>
}) {
  const { id } = await params
  const selectedDateKey = parseDateKey((await searchParams)?.date)
  const selectedDate = dateFromKey(selectedDateKey)
  const previousDateKey = addDays(selectedDateKey, -1)
  const nextDateKey = addDays(selectedDateKey, 1)
  const todayDateKey = dateKeyFromDate(new Date())

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

  const TARGETS = { calories: 2200, protein: 160, carbs: 220, fat: 70 }

  const events = await getClientEvents(id)
  const eventEntries = mapEngagementEvents(events, id)
  const stateEntries = mapClientState(client)
  const meals = await getClientMeals(id, { limit: 40, trainerId: authUserId })
  const selectedDayMeals = await getClientMealsForDay(id, selectedDate, authUserId)
  let whatsappMessages: ClientWhatsAppMessage[] = []
  let whatsappConversationError: string | null = null
  try {
    whatsappMessages = await getClientWhatsAppConversation(id, authUserId, 20)
  } catch {
    whatsappConversationError = "WhatsApp conversation history could not be loaded."
  }
  const latestMeals = meals.slice(0, 6)
  const mealEntries = mapMealRecordsToTimelineEntries(latestMeals)
  const selectedDayMacros = sumMeals(selectedDayMeals)

  const unverifiedMeals = meals.filter(
    (m) => m.review.status === "unverified",
  ).length

  const activeGoal = clientDetail?.goal ?? null
  const health = clientDetail?.health ?? null
  const preferences = clientDetail?.preferences ?? null
  const onboarding = clientDetail?.onboarding ?? null
  const workout = clientDetail?.workout ?? null
  const latestPhotoMedia = (clientDetail?.media ?? [])
    .filter(isDisplayablePhoto)
    .slice(0, 60)
  const selectedPhotoMedia = latestPhotoMedia.filter((item) => item.message_timestamp.slice(0, 10) === selectedDateKey)
  const mediaByDate = groupMediaByDate(selectedPhotoMedia)
  const bmi = computeBmi(health)
  const latestActivityEntries = buildTimeline([eventEntries, stateEntries, mealEntries]).slice(0, 2)
  const onboardingStatus = humanizeValue(onboarding?.status, "Not started")
  const onboardingStep = humanizeValue(onboarding?.current_step, "Not started")
  const missingFields = humanizeValue(onboarding?.missing_fields ?? [], "None")
  const dietPreference = formatDietLabel(health?.diet_type ?? preferences?.diet_type ?? preferences?.preference)
  const allergySummary = sentenceValue(health?.allergies, "None")
  const restrictionSummary = sentenceValue(preferences?.dislikes ?? health?.food_restrictions, "Not set")
  const mealRoutineSummary = formatRoutineSummary(workout, onboarding)
  const workoutTimeSummary = formatTime12Hour(workout?.workout_time) ?? "Not set"
  const workoutDaysSummary = humanizeValue(workout?.workout_days ?? [], "Workout days not set")
  const checkinSummary = formatTime12Hour(workout?.preferred_checkin_time) ?? humanizeValue(workout?.checkin_preference, "Not set")
  const restDaysSummary = humanizeValue(workout?.rest_days ?? [], "Not set")

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
            <ClientNameEditor clientId={client.client_id} initialName={client.client_name} />
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
            {selectedDayMeals.length} intake event{selectedDayMeals.length !== 1 ? "s" : ""} on {formatDate(selectedDate)} · {formatNumber(Math.round(selectedDayMacros.calories))} kcal logged
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {unverifiedMeals > 0 && (
          <InlineNotice variant="warning">
            {unverifiedMeals} logged intake item{unverifiedMeals !== 1 ? "s" : ""} need trainer review.
          </InlineNotice>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(260px,0.7fr)]">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-overlay)]">
                  <CalendarClock size={16} className="text-[var(--foreground)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Client profile</p>
                  <p className="text-xs text-[var(--muted)]">
                    {onboardingStatus} · Step: {onboardingStep}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-[var(--muted)]">Height</p>
                  <p className="font-medium text-[var(--foreground)]">{valueText(health, "height_cm")}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Weight</p>
                  <p className="font-medium text-[var(--foreground)]">{valueText(health, "weight_kg")}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">BMI</p>
                  <p className="font-medium text-[var(--foreground)]">{bmi ?? "Not enough data"}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Missing</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {missingFields}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--info)]/10">
                  <Goal size={16} className="text-[var(--info)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Goal summary</p>
                  <p className="text-xs text-[var(--muted)]">{formatGoalType(activeGoal?.goal_type)}</p>
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
              <p className="text-xs text-[var(--muted)]">Target date: {valueText(activeGoal, "target_date")}</p>
            </CardContent>
          </Card>

          <ActivityPreview entries={latestActivityEntries} />
        </div>

        <DashboardSection
          title="Onboarding Readiness"
          description="Saved WhatsApp onboarding answers, profile fields, and routine data used before normal food logging."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Health profile</p>
                    <p className="text-xs text-[var(--muted)]">Core measurements and setup status</p>
                  </div>
                  <Badge variant={onboardingStatus === "Completed" ? "success" : "outline"}>{onboardingStatus}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Current step</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {onboardingStep}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">BMI</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {bmi ?? "Not enough data"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Height</p>
                    <p className="font-medium text-[var(--foreground)]">{valueText(health, "height_cm")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Weight</p>
                    <p className="font-medium text-[var(--foreground)]">{valueText(health, "weight_kg")}</p>
                  </div>
                </div>
                <p className="text-xs leading-5 text-[var(--muted)]">
                  Missing fields: {missingFields}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Nutrition preferences</p>
                  <p className="text-xs text-[var(--muted)]">Diet choices used for meal guidance</p>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Diet preference</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {dietPreference}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Allergies</p>
                    <p className="font-medium leading-6 text-[var(--foreground)]">{allergySummary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Dislikes / restrictions</p>
                    <p className="font-medium leading-6 text-[var(--foreground)]">{restrictionSummary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Routine and check-in</p>
                  <p className="text-xs text-[var(--muted)]">Daily timing saved from onboarding</p>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Meal routine</p>
                    <p className="font-medium leading-6 text-[var(--foreground)]">{mealRoutineSummary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Workout schedule</p>
                    <p className="font-medium text-[var(--foreground)]">{workoutTimeSummary} · {workoutDaysSummary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Check-in</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {checkinSummary}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DashboardSection>

        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Daily review</p>
              <p className="text-xs text-[var(--muted)]">
                Showing macros, photos, and timeline for {formatDate(selectedDate)}
              </p>
            </div>
            <DailyReviewNav
              clientId={id}
              selectedDateKey={selectedDateKey}
              previousDateKey={previousDateKey}
              nextDateKey={nextDateKey}
              todayDateKey={todayDateKey}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-6">
          <DashboardSection title="Daily Macros" description={`${selectedDayMeals.length} logged intake event${selectedDayMeals.length !== 1 ? "s" : ""} for ${formatDate(selectedDate)}`}>
            <Card>
              <CardContent className="space-y-4">
                <MacroBar
                  label="Calories (kcal)"
                  current={selectedDayMacros.calories}
                  target={TARGETS.calories}
                  color="#22c55e"
                />
                <MacroBar
                  label="Protein (g)"
                  current={selectedDayMacros.protein}
                  target={TARGETS.protein}
                  color="#38bdf8"
                />
                <MacroBar
                  label="Carbohydrates (g)"
                  current={selectedDayMacros.carbs}
                  target={TARGETS.carbs}
                  color="#f59e0b"
                />
                <MacroBar
                  label="Fat (g)"
                  current={selectedDayMacros.fat}
                  target={TARGETS.fat}
                  color="#f472b6"
                />
              </CardContent>
            </Card>
          </DashboardSection>

          <DashboardSection title="Client Photos" description={`Inbound WhatsApp photos for ${formatDate(selectedDate)}`}>
            {mediaByDate.length > 0 ? (
              <div className="space-y-5">
                {mediaByDate.map(([dateKey, items]) => (
                  <div key={dateKey} className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{formatDate(dateKey)}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {items.map((item) => (
                        <Card key={item.id}>
                          <CardContent className="space-y-3 p-3">
                            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.media_url!}
                                alt={formatMediaKind(item.media_kind)}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={item.media_kind === "food_photo" ? "success" : "info"}>
                                  {formatMediaKind(item.media_kind)}
                                </Badge>
                                <span className="text-[10px] text-[var(--muted)]">
                                  {new Date(item.message_timestamp).toLocaleString()}
                                </span>
                              </div>
                              {item.caption ? (
                                <p className="line-clamp-2 text-xs text-[var(--muted)]">{item.caption}</p>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-6">
                  <EmptyState title="No photos for this day" description="Use the date controls to review photos from previous days." />
                </CardContent>
              </Card>
            )}
          </DashboardSection>
        </div>

        <DashboardSection title="Workout Routine">
          <Card>
            <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--warning)]/10">
                  <Dumbbell size={16} className="text-[var(--warning)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {formatTime12Hour(workout?.workout_time) ?? "No workout time"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">Routine used for reminders and check-ins</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">
                  Check-in {checkinSummary}
                </Badge>
                <Badge variant="outline">
                  {[routinePart("B", workout?.breakfast_time), routinePart("L", workout?.lunch_time), routinePart("S", workout?.snack_time), routinePart("D", workout?.dinner_time)]
                    .filter(Boolean)
                    .join(" · ") || "Meal routine not set"}
                </Badge>
                <Badge variant="outline">
                  Rest {restDaysSummary.toLowerCase()}
                </Badge>
                <Badge variant="outline">
                  {workoutDaysSummary === "Workout days not set" ? workoutDaysSummary : `Workout days ${workoutDaysSummary.toLowerCase()}`}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection title="Latest Logged Intake" description="Review intake by week, then by day. Dates are shown above the table.">
          <MealHistory
            meals={meals}
            title="Logged intake"
            description="Use the week menu and date chips to review one day at a time."
            enableReviewActions
          />
        </DashboardSection>

        <WhatsAppConversation messages={whatsappMessages} error={whatsappConversationError} />

        <DashboardSection title="Client Timeline" description={`Activity for ${formatDate(selectedDate)}`}>
          <ClientTimeline sources={[eventEntries, stateEntries, mealEntries]} selectedDateKey={selectedDateKey} />
        </DashboardSection>
        </div>
    </PageContainer>
  )
}
