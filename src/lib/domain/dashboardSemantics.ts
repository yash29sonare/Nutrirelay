/**
 * ════════════════════════════════════════════════════════════
 * Dashboard Semantics — Shared Business Logic
 * ════════════════════════════════════════════════════════════
 *
 * Pure deterministic functions only.
 * No UI logic, no DB logic, no DTO dependency.
 *
 * Single source of truth for all dashboard semantic rules:
 *   - client risk definition
 *   - compliance level interpretation
 *   - performance trend classification
 *
 * Consumed by:
 *   - metrics layer (operations/dashboard.ts)
 *   - insights layer (insights/dashboardInsights.ts)
 * ════════════════════════════════════════════════════════════
 */

// ── Minimal input contracts (not tied to any DTO) ────────

export interface RiskClientData {
  active_strike_count: number;
}

export interface MetricsContext {
  activeClients: number;
  complianceRate: number;
  weeklyProgress: number;
}

// ── 1. Client at-risk classification ─────────────────────

export function isClientAtRisk(client: RiskClientData): boolean {
  return client.active_strike_count > 0;
}

// ── 2. Client risk level ─────────────────────────────────

export type RiskLevel = "low" | "medium" | "high";

export function getClientRiskLevel(client: RiskClientData): RiskLevel {
  if (client.active_strike_count >= 2) return "high";
  if (client.active_strike_count === 1) return "medium";
  return "low";
}

// ── 3. Performance trend classification ──────────────────

export type PerformanceTrend = "improving" | "declining" | "stable";

export function getPerformanceTrend(ctx: MetricsContext): PerformanceTrend {
  if (ctx.weeklyProgress > 5) return "improving";
  if (ctx.weeklyProgress < -5) return "declining";
  return "stable";
}

// ── 4. Compliance state (rate + level) ───────────────────

export type ComplianceLevel = "critical" | "low" | "moderate" | "good" | "excellent";

export interface ComplianceState {
  rate: number;
  level: ComplianceLevel;
}

export function getComplianceState(ctx: MetricsContext): ComplianceState {
  const rate = ctx.complianceRate;
  let level: ComplianceLevel;

  if (rate >= 90) {
    level = "excellent";
  } else if (rate >= 75) {
    level = "good";
  } else if (rate >= 50) {
    level = "moderate";
  } else if (rate >= 25) {
    level = "low";
  } else {
    level = "critical";
  }

  return { rate, level };
}
