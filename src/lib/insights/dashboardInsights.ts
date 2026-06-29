/**
 * ════════════════════════════════════════════════════════════
 * Dashboard Insights Engine
 * ════════════════════════════════════════════════════════════
 *
 * Pure consumer layer over DashboardDataDTO.
 * All intelligence is DETERMINISTIC — no randomness, no external data.
 * O(n) over DTO.clients maximum.
 * ════════════════════════════════════════════════════════════
 */

import {
  isClientAtRisk,
  getClientRiskLevel,
  getPerformanceTrend,
  getComplianceState,
} from "@/lib/domain/dashboardSemantics";
import type { DashboardDataDTO, ClientSummary } from "@/types/dashboard";
import type {
  ClientRiskInsight,
  TrainerAction,
  TrainerActionInsight,
  PerformanceSummaryInsight,
  ClientSegmentationInsight,
  DashboardInsights,
} from "@/types/dashboard-insights";

// ── 1. Client Risk ───────────────────────────────────────────────────

function computeClientRisk(data: DashboardDataDTO): ClientRiskInsight {
  const clients = data.clients;

  const highRisk: ClientSummary[] = [];
  const mediumRisk: ClientSummary[] = [];
  for (const c of clients) {
    const level = getClientRiskLevel(c);
    if (level === "high") highRisk.push(c);
    else if (level === "medium") mediumRisk.push(c);
  }

  let riskLevel: ClientRiskInsight["riskLevel"];
  let reason: string;
  let affectedClients: ClientSummary[];

  if (highRisk.length > 0) {
    riskLevel = "high";
    affectedClients = highRisk;
    const names = highRisk
      .slice(0, 3)
      .map((c) => c.client_name || "a client")
      .join(", ");
    reason =
      `${highRisk.length} client(s) with 2+ strikes. ` +
      (names ? `Check in with ${names}.` : "");
  } else if (mediumRisk.length > 0) {
    riskLevel = "medium";
    affectedClients = mediumRisk;
    reason =
      `${mediumRisk.length} client(s) have 1 strike. ` +
      `Early intervention can prevent escalation.`;
  } else {
    riskLevel = "low";
    affectedClients = [];
    reason = "No clients at risk. Engagement is on track.";
  }

  return { riskLevel, reason, affectedClients };
}

// ── 2. Trainer Actions ───────────────────────────────────────────────

function computeActions(data: DashboardDataDTO): TrainerActionInsight {
  const actions: TrainerAction[] = [];
  const m = data.metrics;
  const trends = data.trends;
  const compliance = getComplianceState(m);

  if (compliance.level === "critical" || compliance.level === "low") {
    actions.push({
      priority: "high",
      message: `Only ${compliance.rate}% of clients logged meals today. Consider a group motivation push.`,
      category: "engagement",
    });
  }

  if (getPerformanceTrend(m) === "declining") {
    actions.push({
      priority: "high",
      message: `Compliance dropped ${Math.abs(m.weeklyProgress)}% week-over-week. Review recent changes.`,
      category: "compliance",
    });
  }

  if (m.atRiskClients > 0) {
    actions.push({
      priority: m.atRiskClients >= 3 ? "high" : "medium",
      message: `${m.atRiskClients} client(s) flagged. Schedule 1-on-1 check-ins.`,
      category: "outreach",
    });
  }

  if (trends.complianceOverTime.length >= 3) {
    const recent = trends.complianceOverTime.slice(-3);
    const declining = recent.every(
      (d, i) => i === 0 || d.compliance_rate <= recent[i - 1].compliance_rate,
    );
    if (declining && (compliance.level === "critical" || compliance.level === "low")) {
      actions.push({
        priority: "medium",
        message: "Engagement declined over the last 3 days. Re-engagement campaign recommended.",
        category: "engagement",
      });
    }
  }

  if (m.activeClients > 0 && m.atRiskClients === 0 && compliance.level !== "critical" && compliance.level !== "low") {
    actions.push({
      priority: "low",
      message: "Solid engagement across all clients. Keep up current strategies.",
      category: "maintenance",
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: "low",
      message: "No significant flags. Continue monitoring client engagement.",
      category: "maintenance",
    });
  }

  return { actions };
}

// ── 3. Performance Summary ───────────────────────────────────────────

function computePerformance(data: DashboardDataDTO): PerformanceSummaryInsight {
  const m = data.metrics;
  const overallTrend = getPerformanceTrend(m);
  const cr = m.complianceRate;
  const wp = m.weeklyProgress;

  let keyDriver: string;
  if (data.clients.length === 0) {
    keyDriver = "No active clients to evaluate.";
  } else if (overallTrend === "improving") {
    keyDriver = `Compliance up ${wp}% week-over-week. Current rate: ${cr}%.`;
  } else if (overallTrend === "declining") {
    keyDriver = `Compliance down ${Math.abs(wp)}% week-over-week. Current rate: ${cr}%.`;
  } else {
    keyDriver = `Compliance stable at ${cr}%. Weekly change within ±5%.`;
  }

  const hasTrendData = data.trends.complianceOverTime.length > 0;
  const hasClients = data.clients.length > 0;
  const confidenceScore = hasClients && hasTrendData ? 85 : hasClients ? 60 : 0;

  return { overallTrend, keyDriver, confidenceScore };
}

// ── 4. Client Segmentation ───────────────────────────────────────────

function computeSegmentation(data: DashboardDataDTO): ClientSegmentationInsight {
  const highPerforming: ClientSummary[] = [];
  const average: ClientSummary[] = [];
  const atRisk: ClientSummary[] = [];

  for (const c of data.clients) {
    if (isClientAtRisk(c)) {
      atRisk.push(c);
    } else if (c.total_meals_logged_today > 0) {
      highPerforming.push(c);
    } else {
      average.push(c);
    }
  }

  return { highPerforming, average, atRisk };
}

// ── Public API ───────────────────────────────────────────────────────

export function generateDashboardInsights(
  data: DashboardDataDTO,
): DashboardInsights {
  return {
    risk: computeClientRisk(data),
    actions: computeActions(data),
    performance: computePerformance(data),
    segmentation: computeSegmentation(data),
  };
}
