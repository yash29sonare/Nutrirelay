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
import {
  getDailyCheckInReadiness,
  getOnboardingTemplatePreview,
  getTrainerClientMessageDraft,
  getTrainerWhatsAppClientDashboard,
  getTrainerWhatsAppClientDetail,
  getTrainerWhatsAppClientWindowStatus,
  type TrainerWhatsAppClientMeal,
} from "@/lib/operations/trainer-whatsapp-clients"
import type { ClientSummary } from "@/types/dashboard"
import type { MealRecord } from "@/types/meal"
import type { TimelineEntry } from "@/types/timeline"
import { ClientTimeline } from "./components/ClientTimeline"
import { MealHistory } from "./components/MealHistory"
import { ClientNameEditor } from "./components/ClientNameEditor"
import { WhatsAppClientEditButton } from "./components/WhatsAppClientContactEditor"
import { CustomMessageComposer } from "./components/CustomMessageComposer"
import { SendOnboardingButton } from "../AddWhatsAppClientDialog"
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
  if (Array.isArray(value)) {
    const values = value
      .map((item) => (typeof item === "string" ? item.trim().replace(/[_-]+/g, " ") : humanizeValue(item, "")))
      .filter(Boolean)
    return values.length > 0 ? values.join(", ") : fallback
  }
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

function sumWhatsAppMeals(meals: TrainerWhatsAppClientMeal[]) {
  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories ?? 0),
      protein: acc.protein + (meal.protein_g ?? 0),
      carbs: acc.carbs + (meal.carbs_g ?? 0),
      fat: acc.fat + (meal.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

const TARGETS = { calories: 2200, protein: 160, carbs: 220, fat: 70 }

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

function needsReviewStatus(value: string | null | undefined): boolean {
  if (!value) return false
  return ["needs_review", "review_needed", "pending", "failed", "error", "unverified"].includes(value.toLowerCase())
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

async function getWhatsAppConversationWithTimeout(
  clientId: string,
  trainerId: string,
): Promise<{ messages: ClientWhatsAppMessage[]; error: string | null }> {
  try {
    const messages = await Promise.race([
      getClientWhatsAppConversation(clientId, trainerId, 20),
      new Promise<ClientWhatsAppMessage[]>((resolve) => {
        setTimeout(() => resolve([]), 5000)
      }),
    ])
    return { messages, error: null }
  } catch {
    return { messages: [], error: "WhatsApp conversation history could not be loaded." }
  }
}

function canSendWhatsAppOnlyOnboarding(status: string, clientStatus: string): boolean {
  return clientStatus === "active" && (status === "not_sent" || status === "failed")
}

function formatTrainerLocalDateTime(timeZone: string): string {
  return new Date().toLocaleString("en-IN", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
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
  const whatsappClientDetail = clientDetail?.client_kind === "whatsapp"
    ? await getTrainerWhatsAppClientDetail(authUserId, id)
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

  if (whatsappClientDetail) {
    const conversation = await getWhatsAppConversationWithTimeout(id, authUserId)
    const whatsappDashboard = await getTrainerWhatsAppClientDashboard(authUserId, id)
    const trainerTimezone = trainerProfile?.timezone?.trim() || "Asia/Kolkata"
    const trainerRecord = trainerProfile as {
      business_name?: string | null
      display_name?: string | null
      full_name?: string | null
      name?: string | null
    } | null
    const trainerName = trainerRecord?.display_name
      ?? trainerRecord?.full_name
      ?? trainerRecord?.name
      ?? trainerRecord?.business_name
      ?? null
    const businessName = trainerRecord?.business_name ?? null
    const onboardingTemplatePreview = getOnboardingTemplatePreview({
      clientName: whatsappClientDetail.client_name,
      trainerName,
      businessName,
    })
    const [whatsAppWindowStatus, dailyCheckInReadiness, customMessageDraft] = await Promise.all([
      getTrainerWhatsAppClientWindowStatus(authUserId, id, trainerTimezone),
      getDailyCheckInReadiness({
        authUserId,
        clientId: id,
        timeZone: trainerTimezone,
        trainerName,
        businessName,
      }),
      getTrainerClientMessageDraft(authUserId, id),
    ])
    const dailyTemplateConfigMissing = !dailyCheckInReadiness.template.templateName || !dailyCheckInReadiness.template.language
    const selectedDayWhatsAppMeals = whatsappDashboard.meals.filter((meal) => meal.logged_at.slice(0, 10) === selectedDateKey)
    const selectedDayMedia = whatsappDashboard.media.filter((item) => item.message_timestamp.slice(0, 10) === selectedDateKey)
    const selectedDayMacros = sumWhatsAppMeals(selectedDayWhatsAppMeals)
    const totalReports = whatsappDashboard.weeklyReportsCount + whatsappDashboard.monthlyReportsCount
    const reportDataUnavailable = whatsappDashboard.dataSourceWarnings.some((warning) => warning.includes("reports"))
    const expectedMealCount = whatsappClientDetail.meal_reminder_times.length
    const missedMealCount = expectedMealCount > 0
      ? Math.max(expectedMealCount - selectedDayWhatsAppMeals.length, 0)
      : 0
    const reviewMeals = whatsappDashboard.meals.filter((meal) =>
      needsReviewStatus(meal.review_state) || needsReviewStatus(meal.verification_status),
    )
    const reviewVoiceNotes = whatsappDashboard.voiceNotes.filter((note) =>
      needsReviewStatus(note.processing_status),
    )
    const inboundReviewMessages = conversation.messages
      .filter((message) => message.direction === "INBOUND")
      .slice(0, 3)
    const recentActivity = [
      ...whatsappDashboard.meals.map((meal) => ({
        id: `meal-${meal.id}`,
        at: meal.logged_at,
        title: "Food log saved",
        description: meal.notes ?? "Meal details saved from WhatsApp activity.",
      })),
      ...whatsappDashboard.media.map((item) => ({
        id: `media-${item.id}`,
        at: item.message_timestamp,
        title: `${humanizeValue(item.message_type)} received`,
        description: item.caption ?? (item.has_media_url ? "Media reference saved." : "Media metadata saved."),
      })),
      ...whatsappDashboard.voiceNotes.map((note) => ({
        id: `voice-${note.id}`,
        at: note.created_at,
        title: "Voice note processed",
        description: note.transcript ?? humanizeValue(note.processing_status, "Voice note metadata saved."),
      })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)

    return (
      <PageContainer>
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={14} /> Back to clients
        </Link>

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
              <Badge variant={whatsappClientDetail.status === "active" ? "success" : "outline"}>
                {humanizeValue(whatsappClientDetail.status)}
              </Badge>
              <Badge
                variant={
                  whatsappClientDetail.onboarding_message_status === "sent"
                    ? "success"
                    : whatsappClientDetail.onboarding_message_status === "failed"
                      ? "danger"
                      : whatsappClientDetail.onboarding_message_status === "pending"
                        ? "warning"
                        : "default"
                }
              >
                Onboarding {humanizeValue(whatsappClientDetail.onboarding_message_status).toLowerCase()}
              </Badge>
            </div>
            <p className="text-sm text-[var(--muted)] mt-1">
              {selectedDayWhatsAppMeals.length} intake event{selectedDayWhatsAppMeals.length !== 1 ? "s" : ""} on {formatDate(selectedDate)} · {formatNumber(Math.round(selectedDayMacros.calories))} kcal logged
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-right">
              <p className="text-[10px] uppercase text-[var(--muted)]">Trainer local time</p>
              <p className="text-xs font-medium text-[var(--foreground)]">{formatTrainerLocalDateTime(trainerTimezone)}</p>
            </div>
            <WhatsAppClientEditButton client={whatsappClientDetail} />
            {canSendWhatsAppOnlyOnboarding(whatsappClientDetail.onboarding_message_status, whatsappClientDetail.status) ? (
              <SendOnboardingButton clientId={whatsappClientDetail.client_id} preview={onboardingTemplatePreview} />
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          {whatsappDashboard.dataSourceWarnings.length > 0 ? (
            <InlineNotice variant="warning">
              Some client detail sections could not load from the WhatsApp-only read model: {whatsappDashboard.dataSourceWarnings.join(" ")}
            </InlineNotice>
          ) : null}

          <InlineNotice variant={whatsAppWindowStatus.isOpen ? "success" : "warning"}>
            {whatsAppWindowStatus.message}
          </InlineNotice>

          {whatsappDashboard.pendingReviewCount > 0 ? (
            <InlineNotice variant="warning">
              {whatsappDashboard.pendingReviewCount} WhatsApp item{whatsappDashboard.pendingReviewCount !== 1 ? "s" : ""} may need trainer review.
            </InlineNotice>
          ) : null}

          <Card>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Daily review</p>
                <p className="text-xs text-[var(--muted)]">
                  Showing WhatsApp intake, media, review items, and timeline for {formatDate(selectedDate)}
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

          {dailyCheckInReadiness.ready ? (
            <div>
              <Badge variant="success">Daily check-in ready</Badge>
            </div>
          ) : dailyTemplateConfigMissing ? (
            <InlineNotice variant="warning">
              Daily check-in template configuration needs attention.
            </InlineNotice>
          ) : null}

          <DashboardSection title="Custom message to client" description="Client-specific diet plan, follow-up, or instructions.">
            <Card>
              <CardContent className="space-y-4">
                <CustomMessageComposer
                  clientId={whatsappClientDetail.client_id}
                  draft={customMessageDraft}
                  canSend={whatsAppWindowStatus.isOpen}
                  windowMessage={whatsAppWindowStatus.message}
                />
              </CardContent>
            </Card>
          </DashboardSection>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-6">
            <DashboardSection title="Daily Macros" description={`${selectedDayWhatsAppMeals.length} logged intake event${selectedDayWhatsAppMeals.length !== 1 ? "s" : ""} for ${formatDate(selectedDate)}`}>
              <Card>
                <CardContent className="space-y-4">
                  <MacroBar label="Calories (kcal)" current={selectedDayMacros.calories} target={TARGETS.calories} color="#22c55e" />
                  <MacroBar label="Protein (g)" current={selectedDayMacros.protein} target={TARGETS.protein} color="#38bdf8" />
                  <MacroBar label="Carbohydrates (g)" current={selectedDayMacros.carbs} target={TARGETS.carbs} color="#f59e0b" />
                  <MacroBar label="Fat (g)" current={selectedDayMacros.fat} target={TARGETS.fat} color="#f472b6" />
                </CardContent>
              </Card>
            </DashboardSection>

            <DashboardSection title="Meal Completion" description="Today against configured reminder times.">
              <Card>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-[var(--muted)]">Expected</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{expectedMealCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Logged</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{selectedDayWhatsAppMeals.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Missed</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{missedMealCount}</p>
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    {expectedMealCount > 0
                      ? `Reminder times: ${whatsappClientDetail.meal_reminder_times.join(", ")}`
                      : "Meal reminder times are not set for this client yet."}
                  </p>
                </CardContent>
              </Card>
            </DashboardSection>
          </div>

          <DashboardSection title="Trainer Review Queue" description="WhatsApp items that may need trainer attention.">
            <Card>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Food review</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{reviewMeals.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Voice review</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{reviewVoiceNotes.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Inbound replies</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{inboundReviewMessages.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Total flagged</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{whatsappDashboard.pendingReviewCount}</p>
                  </div>
                </div>
                {whatsappDashboard.pendingReviewCount === 0 && inboundReviewMessages.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    No review items yet. Food, photo, voice, and reply items appear here after WhatsApp activity is saved.
                  </p>
                ) : null}
                {inboundReviewMessages.length > 0 ? (
                  <div className="space-y-2">
                    {inboundReviewMessages.map((message) => (
                      <div key={`review-${message.id}`} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Badge variant="info">{messageTypeLabel(message)}</Badge>
                          <span className="text-xs text-[var(--muted)]">{formatDateTime(message.message_timestamp)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--foreground)]">{message.display_text}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </DashboardSection>

          <DashboardSection title="Food Logs" description="Food logs created from WhatsApp replies and media analysis.">
            {whatsappDashboard.meals.length > 0 ? (
              <Card>
                <CardContent className="space-y-3">
                  {whatsappDashboard.meals.slice(0, 8).map((meal) => (
                    <div key={meal.id} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--foreground)]">{meal.notes ?? "Food log"}</p>
                        <span className="text-xs text-[var(--muted)]">{formatDateTime(meal.logged_at)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">{formatNumber(meal.calories ?? 0)} kcal</Badge>
                        <Badge variant="outline">P {formatNumber(meal.protein_g ?? 0)}g</Badge>
                        <Badge variant="outline">C {formatNumber(meal.carbs_g ?? 0)}g</Badge>
                        <Badge variant="outline">F {formatNumber(meal.fat_g ?? 0)}g</Badge>
                        <Badge variant={statusVariant(meal.review_state ?? meal.verification_status ?? "unknown")}>
                          {humanizeValue(meal.review_state ?? meal.verification_status ?? "Review unknown")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6">
                  <EmptyState title="No food logs yet" description="Meals will appear after this client replies on WhatsApp or sends food media." />
                </CardContent>
              </Card>
            )}
          </DashboardSection>

          <DashboardSection title="Client Photos and Media" description={`Inbound WhatsApp media for ${formatDate(selectedDate)}`}>
            {selectedDayMedia.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {selectedDayMedia.slice(0, 6).map((item) => (
                  <Card key={item.id}>
                    <CardContent className="space-y-2 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info">{formatMediaKind(item.media_kind)}</Badge>
                        <Badge variant="outline">{humanizeValue(item.message_type)}</Badge>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{formatDateTime(item.message_timestamp)}</p>
                      <p className="line-clamp-2 text-sm text-[var(--foreground)]">
                        {item.caption ?? (item.has_media_url ? "Media reference saved." : "Media metadata saved.")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-6">
                  <EmptyState title="No media for this day" description="Use the date controls to review media from previous days. New photos, voice media, and documents appear after WhatsApp activity is saved." />
                </CardContent>
              </Card>
            )}
          </DashboardSection>

          <DashboardSection title="Voice Notes" description="Voice-note transcripts and processing state from WhatsApp.">
            {whatsappDashboard.voiceNotes.length > 0 ? (
              <Card>
                <CardContent className="space-y-3">
                  {whatsappDashboard.voiceNotes.slice(0, 6).map((note) => (
                    <div key={note.id} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Badge variant={statusVariant(note.processing_status ?? "unknown")}>
                          {humanizeValue(note.processing_status ?? "Processing state unknown")}
                        </Badge>
                        <span className="text-xs text-[var(--muted)]">{formatDateTime(note.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                        {note.transcript ?? "No transcript saved yet."}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-6">
                  <EmptyState title="No voice notes yet" description="Voice notes and transcripts will appear after this client sends audio on WhatsApp." />
                </CardContent>
              </Card>
            )}
          </DashboardSection>

          <WhatsAppConversation messages={conversation.messages} error={conversation.error} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(260px,0.7fr)]">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-overlay)]">
                    <CalendarClock size={16} className="text-[var(--foreground)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Client status</p>
                    <p className="text-xs text-[var(--muted)]">WhatsApp-only client record</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Status</p>
                    <p className="font-medium text-[var(--foreground)]">{humanizeValue(whatsappClientDetail.status)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Onboarding</p>
                    <p className="font-medium text-[var(--foreground)]">{humanizeValue(whatsappClientDetail.onboarding_message_status)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Automation</p>
                    <p className="font-medium text-[var(--foreground)]">{whatsappClientDetail.automation_enabled ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Phone edit</p>
                    <p className="font-medium text-[var(--foreground)]">{whatsappClientDetail.phone_edit_locked ? "Locked" : "Available"}</p>
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
                    <p className="text-xs text-[var(--muted)]">Trainer notes used for coaching prompts</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Goal</p>
                    <p className="font-medium leading-6 text-[var(--foreground)]">{whatsappClientDetail.goal ?? "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Diet notes</p>
                    <p className="font-medium leading-6 text-[var(--foreground)]">{whatsappClientDetail.diet_notes ?? "Not set"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-overlay)]">
                    <History size={15} className="text-[var(--foreground)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Latest activity</p>
                    <p className="text-xs text-[var(--muted)]">Last WhatsApp updates</p>
                  </div>
                </div>
                {recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.slice(0, 2).map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3 py-2">
                        <p className="text-sm font-medium text-[var(--foreground)]">{entry.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted)]">{entry.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No WhatsApp activity yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Contact and onboarding</p>
                    <p className="text-xs text-[var(--muted)]">WhatsApp sender-facing client details</p>
                  </div>
                  <Badge variant={whatsappClientDetail.automation_enabled ? "success" : "outline"}>
                    {whatsappClientDetail.automation_enabled ? "Automation on" : "Automation off"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-[var(--muted)]">WhatsApp phone</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {whatsappClientDetail.normalized_whatsapp_number ?? whatsappClientDetail.whatsapp_number ?? "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Onboarding</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {humanizeValue(whatsappClientDetail.onboarding_message_status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Workout time</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {formatTime12Hour(whatsappClientDetail.workout_time) ?? "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Meal reminders</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {whatsappClientDetail.meal_reminder_times.length > 0
                        ? whatsappClientDetail.meal_reminder_times.join(", ")
                        : "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Coaching notes</p>
                  <p className="text-xs text-[var(--muted)]">Goal and diet context saved for this WhatsApp client</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Goal</p>
                    <p className="font-medium leading-6 text-[var(--foreground)]">{whatsappClientDetail.goal ?? "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Diet notes</p>
                    <p className="font-medium leading-6 text-[var(--foreground)]">{whatsappClientDetail.diet_notes ?? "Not set"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DashboardSection
            title="Onboarding Readiness"
            description="WhatsApp-only setup fields used before normal food logging and reminders."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">Contact state</p>
                      <p className="text-xs text-[var(--muted)]">Client identity stays WhatsApp-only</p>
                    </div>
                    <Badge variant={whatsappClientDetail.status === "active" ? "success" : "outline"}>
                      {humanizeValue(whatsappClientDetail.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-[var(--muted)]">WhatsApp phone</p>
                      <p className="font-medium text-[var(--foreground)]">
                        {whatsappClientDetail.normalized_whatsapp_number ?? whatsappClientDetail.whatsapp_number ?? "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Phone edit rule</p>
                      <p className="font-medium leading-6 text-[var(--foreground)]">
                        {whatsappClientDetail.phone_edit_locked
                          ? whatsappClientDetail.phone_edit_lock_reason ?? "Locked after onboarding or activity."
                          : "Editable until onboarding or client activity starts."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Reminder routine</p>
                    <p className="text-xs text-[var(--muted)]">Times used by automation and reports</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-[var(--muted)]">Meal reminders</p>
                      <p className="font-medium text-[var(--foreground)]">
                        {whatsappClientDetail.meal_reminder_times.length > 0
                          ? whatsappClientDetail.meal_reminder_times.join(", ")
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Workout time</p>
                      <p className="font-medium text-[var(--foreground)]">
                        {formatTime12Hour(whatsappClientDetail.workout_time) ?? "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Automation</p>
                      <p className="font-medium text-[var(--foreground)]">
                        {whatsappClientDetail.automation_enabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Data readiness</p>
                    <p className="text-xs text-[var(--muted)]">What has arrived from WhatsApp so far</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-[var(--muted)]">Messages</p>
                      <p className="font-medium text-[var(--foreground)] tabular-nums">{whatsappDashboard.communicationCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Food logs</p>
                      <p className="font-medium text-[var(--foreground)] tabular-nums">{whatsappDashboard.meals.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Media</p>
                      <p className="font-medium text-[var(--foreground)] tabular-nums">{whatsappDashboard.media.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Reports</p>
                      <p className="font-medium text-[var(--foreground)] tabular-nums">
                        {reportDataUnavailable ? "Unavailable" : totalReports}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DashboardSection>

          <DashboardSection title="Reports" description="Weekly and monthly reports generated for this WhatsApp-only client.">
            <Card>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-4 py-3">
                    <p className="text-xs text-[var(--muted)]">Weekly reports</p>
                    <p className="mt-1 text-xl font-semibold text-[var(--foreground)] tabular-nums">{whatsappDashboard.weeklyReportsCount}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-4 py-3">
                    <p className="text-xs text-[var(--muted)]">Monthly reports</p>
                    <p className="mt-1 text-xl font-semibold text-[var(--foreground)] tabular-nums">{whatsappDashboard.monthlyReportsCount}</p>
                  </div>
                </div>
                {reportDataUnavailable ? (
                  <InlineNotice variant="warning">
                    Report counts could not be loaded from the WhatsApp-only read model.
                  </InlineNotice>
                ) : null}
                {!reportDataUnavailable && totalReports === 0 ? (
                  <EmptyState
                    title="No reports yet"
                    description="Reports will appear after WhatsApp activity creates enough nutrition history."
                  />
                ) : null}
              </CardContent>
            </Card>
          </DashboardSection>

          <DashboardSection title="Client Timeline" description={`WhatsApp-only activity for ${formatDate(selectedDate)}`}>
            <Card>
              <CardContent className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--foreground)]">{entry.title}</p>
                        <span className="text-xs text-[var(--muted)]">{formatDateTime(entry.at)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{entry.description}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No timeline activity yet"
                    description="WhatsApp replies, food logs, media, and reports will populate this timeline."
                  />
                )}
              </CardContent>
            </Card>
          </DashboardSection>
        </div>
      </PageContainer>
    )
  }

  const riskLevel = getClientRiskLevel(client)
  const compliance = getComplianceState(dto.metrics)

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
            {clientDetail?.client_kind !== "whatsapp" ? (
              <ClientNameEditor clientId={client.client_id} initialName={client.client_name} />
            ) : null}
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
