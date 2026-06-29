import type { DashboardDataDTO } from "@/types/dashboard"
import type { EngagementEvent } from "@/types/engagement-events"
import type { TrainerAnalyticsDTO } from "@/types/analytics"
import { computeBusinessKPIs, computeClientHealth, computeMealAnalytics, computeCommunicationAnalytics, computePerformanceTrends } from "./analyticsKPIs"
import { getTopAttentionClients } from "./analyticsRanking"
import { mapTimelineActivity } from "./analyticsMapper"

export function buildAnalyticsDTO(
  dto: DashboardDataDTO,
  events: EngagementEvent[],
): TrainerAnalyticsDTO {
  const clientNameMap = new Map(dto.clients.map((c) => [c.client_id, c.client_name]))

  return {
    version: "v1",
    businessKPIs: computeBusinessKPIs(dto.clients, events),
    clientHealth: computeClientHealth(dto.clients, dto.metrics),
    mealAnalytics: computeMealAnalytics(dto.clients, dto.trends, events),
    communicationAnalytics: computeCommunicationAnalytics(events),
    performanceTrends: computePerformanceTrends(dto.trends),
    timelineActivity: mapTimelineActivity(events, clientNameMap),
    topAttentionClients: getTopAttentionClients(dto.clients),
  }
}
