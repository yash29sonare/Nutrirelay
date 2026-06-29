import type { DashboardDataDTO, ClientSummary } from "@/types/dashboard"
import type { EngagementEvent } from "@/types/engagement-events"
import type {
  BusinessKPIs,
  ClientHealthSummary,
  MealAnalytics,
  CommunicationAnalytics,
  PerformanceTrend,
} from "@/types/analytics"
import {
  getClientRiskLevel,
  getComplianceState,
  getPerformanceTrend,
} from "@/lib/domain/dashboardSemantics"

function todayCount(events: EngagementEvent[], type: string): number {
  const today = new Date().toISOString().slice(0, 10)
  return events.filter(
    (e) => e.event_type === type && e.created_at.slice(0, 10) === today,
  ).length
}

function totalCount(events: EngagementEvent[], type: string): number {
  return events.filter((e) => e.event_type === type).length
}

function pendingConversations(events: EngagementEvent[]): number {
  const convPlanned = events.filter((e) => e.event_type === "CONVERSATION_PLANNED")
  const convHandled = new Set(
    events
      .filter((e) =>
        ["CONVERSATION_APPROVED", "CONVERSATION_DISMISSED", "CONVERSATION_SNOOZED"].includes(e.event_type),
      )
      .map((e) => e.payload?.["conversationId"] as string | undefined)
      .filter(Boolean),
  )
  return convPlanned.filter(
    (e) => !convHandled.has(e.payload?.["conversationId"] as string),
  ).length
}

function pendingReminders(events: EngagementEvent[]): number {
  const remPlanned = events.filter((e) => e.event_type === "REMINDER_PLANNED")
  const remHandled = new Set(
    events
      .filter((e) =>
        ["REMINDER_APPROVED", "REMINDER_DISMISSED", "REMINDER_SNOOZED"].includes(e.event_type),
      )
      .map((e) => e.payload?.["reminderId"] as string | undefined)
      .filter(Boolean),
  )
  return remPlanned.filter(
    (e) => !remHandled.has(e.payload?.["reminderId"] as string),
  ).length
}

export function computeBusinessKPIs(
  clients: ClientSummary[],
  events: EngagementEvent[],
): BusinessKPIs {
  const mealsToday = clients.reduce((sum, c) => sum + c.total_meals_logged_today, 0)
  const mealsRecordedToday = todayCount(events, "MEAL_RECORDED")
  const mealsReviewedToday = todayCount(events, "MEAL_REVIEWED")
  const commSentToday = todayCount(events, "COMMUNICATION_SENT")
  const commQueuedToday = todayCount(events, "COMMUNICATION_QUEUED")
  const commFailedToday = todayCount(events, "COMMUNICATION_FAILED")
  const commSentTotal = totalCount(events, "COMMUNICATION_SENT")
  const commFailedTotal = totalCount(events, "COMMUNICATION_FAILED")
  const commSuccessRate = commSentTotal + commFailedTotal > 0
    ? Math.round((commSentTotal / (commSentTotal + commFailedTotal)) * 100)
    : 100

  return {
    mealsToday,
    mealsReviewedToday,
    pendingReviews: Math.max(0, mealsRecordedToday - mealsReviewedToday),
    pendingConversations: pendingConversations(events),
    pendingReminders: pendingReminders(events),
    commSentToday,
    commQueuedToday,
    commFailedToday,
    commSuccessRate,
  }
}

export function computeClientHealth(
  clients: ClientSummary[],
  metrics: DashboardDataDTO["metrics"],
): ClientHealthSummary {
  const riskDistribution = { high: 0, medium: 0, low: 0 }
  for (const client of clients) {
    riskDistribution[getClientRiskLevel(client)]++
  }
  const compliantClients = clients.filter((c) => c.total_meals_logged_today > 0).length
  const totalClients = clients.length
  const complianceState = getComplianceState(metrics)
  const performanceTrend = getPerformanceTrend(metrics)

  return {
    riskDistribution,
    totalClients,
    atRiskCount: metrics.atRiskClients,
    compliantClients,
    nonCompliantClients: totalClients - compliantClients,
    complianceRate: metrics.complianceRate,
    complianceLevel: complianceState.level,
    performanceTrend,
    weeklyProgress: metrics.weeklyProgress,
  }
}

export function computeMealAnalytics(
  clients: ClientSummary[],
  trends: DashboardDataDTO["trends"],
  events: EngagementEvent[],
): MealAnalytics {
  const mealsToday = clients.reduce((sum, c) => sum + c.total_meals_logged_today, 0)
  const totalClients = clients.length
  const meals7Days = trends.clientActivity.reduce((sum, c) => sum + c.meals_logged, 0)
  const totalMealEvents = totalCount(events, "MEAL_RECORDED")
  const totalReviewEvents = totalCount(events, "MEAL_REVIEWED")
  const totalCaloriesWeek = trends.clientActivity.reduce((sum, c) => sum + c.total_calories, 0)
  const totalProteinWeek = trends.clientActivity.reduce((sum, c) => sum + c.total_protein, 0)

  return {
    mealsToday,
    meals7Days,
    avgMealsPerClient: totalClients > 0 ? (mealsToday / totalClients).toFixed(1) : "0",
    totalMealEvents,
    totalReviewEvents,
    reviewRate: totalMealEvents > 0 ? Math.round((totalReviewEvents / totalMealEvents) * 100) : 0,
    totalCaloriesWeek,
    totalProteinWeek,
  }
}

export function computeCommunicationAnalytics(events: EngagementEvent[]): CommunicationAnalytics {
  return {
    conversationPlansTotal: totalCount(events, "CONVERSATION_PLANNED"),
    reminderPlansTotal: totalCount(events, "REMINDER_PLANNED"),
    pendingConversations: pendingConversations(events),
    pendingReminders: pendingReminders(events),
    commQueuedToday: todayCount(events, "COMMUNICATION_QUEUED"),
    commSentToday: todayCount(events, "COMMUNICATION_SENT"),
    commFailedToday: todayCount(events, "COMMUNICATION_FAILED"),
    automationStarts: totalCount(events, "AUTOMATION_STARTED"),
    automationCompletions: totalCount(events, "AUTOMATION_COMPLETED"),
    automationFailures: totalCount(events, "AUTOMATION_FAILED"),
    commSuccessRate: (() => {
      const sent = totalCount(events, "COMMUNICATION_SENT")
      const failed = totalCount(events, "COMMUNICATION_FAILED")
      return sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 100
    })(),
  }
}

export function computePerformanceTrends(
  trends: DashboardDataDTO["trends"],
): PerformanceTrend[] {
  return (trends.complianceOverTime ?? []).map((entry) => ({
    date: entry.date,
    complianceRate: entry.compliance_rate,
  }))
}
