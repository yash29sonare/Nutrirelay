/**
 * ════════════════════════════════════════════════════════════
 * Dashboard Insights Types
 * ════════════════════════════════════════════════════════════
 *
 * Pure consumer layer over DashboardDataDTO.
 * No data sources — only derived intelligence.
 * ════════════════════════════════════════════════════════════
 */

import type { ClientSummary } from "./dashboard";

export type RiskLevel = "low" | "medium" | "high";

export interface ClientRiskInsight {
  riskLevel: RiskLevel;
  reason: string;
  affectedClients: ClientSummary[];
}

export type ActionPriority = "high" | "medium" | "low";
export type ActionCategory = "engagement" | "compliance" | "outreach" | "maintenance";

export interface TrainerAction {
  priority: ActionPriority;
  message: string;
  category: ActionCategory;
}

export interface TrainerActionInsight {
  actions: TrainerAction[];
}

export type OverallTrend = "improving" | "declining" | "stable";

export interface PerformanceSummaryInsight {
  overallTrend: OverallTrend;
  keyDriver: string;
  confidenceScore: number;
}

export interface ClientSegmentationInsight {
  highPerforming: ClientSummary[];
  average: ClientSummary[];
  atRisk: ClientSummary[];
}

export interface DashboardInsights {
  risk: ClientRiskInsight;
  actions: TrainerActionInsight;
  performance: PerformanceSummaryInsight;
  segmentation: ClientSegmentationInsight;
}
