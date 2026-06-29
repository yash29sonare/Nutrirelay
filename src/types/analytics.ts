export interface TrainerAnalyticsDTO {
  version: "v1"
  businessKPIs: BusinessKPIs
  clientHealth: ClientHealthSummary
  mealAnalytics: MealAnalytics
  communicationAnalytics: CommunicationAnalytics
  performanceTrends: PerformanceTrend[]
  timelineActivity: TimelineActivityGroup[]
  topAttentionClients: AttentionClient[]
}

export interface BusinessKPIs {
  mealsToday: number
  mealsReviewedToday: number
  pendingReviews: number
  pendingConversations: number
  pendingReminders: number
  commSentToday: number
  commQueuedToday: number
  commFailedToday: number
  commSuccessRate: number
}

export interface ClientHealthSummary {
  riskDistribution: RiskDistribution
  totalClients: number
  atRiskCount: number
  compliantClients: number
  nonCompliantClients: number
  complianceRate: number
  complianceLevel: string
  performanceTrend: string
  weeklyProgress: number
}

export interface RiskDistribution {
  high: number
  medium: number
  low: number
}

export interface MealAnalytics {
  mealsToday: number
  meals7Days: number
  avgMealsPerClient: string
  totalMealEvents: number
  totalReviewEvents: number
  reviewRate: number
  totalCaloriesWeek: number
  totalProteinWeek: number
}

export interface CommunicationAnalytics {
  conversationPlansTotal: number
  reminderPlansTotal: number
  pendingConversations: number
  pendingReminders: number
  commQueuedToday: number
  commSentToday: number
  commFailedToday: number
  commSuccessRate: number
  automationStarts: number
  automationCompletions: number
  automationFailures: number
}

export interface PerformanceTrend {
  date: string
  complianceRate: number
}

export interface TimelineActivityGroup {
  dateKey: string
  events: TimelineActivityEvent[]
}

export interface TimelineActivityEvent {
  eventId: string
  eventType: string
  label: string
  clientName: string
  timestamp: string
}

export interface AttentionClient {
  clientId: string
  clientName: string
  riskLevel: string
  mealsLoggedToday: number
  activeStrikes: number
}
