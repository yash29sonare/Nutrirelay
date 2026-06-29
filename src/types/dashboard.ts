/**
 * ════════════════════════════════════════════════════════════
 * Dashboard Contract — SINGLE SOURCE OF TRUTH (v1)
 * ════════════════════════════════════════════════════════════
 *
 * Data flow:
 *   RPC → mapDashboardData() → DashboardDataDTO → UI
 *
 * One mapping function. One DTO. One RPC call.
 * ════════════════════════════════════════════════════════════
 */

// ── Client summary (view row) ──────────────────────────────────────
export interface ClientSummary {
  client_id:                string;
  client_name:              string;
  trainer_id:               string;
  total_meals_logged_today: number;
  total_calories_today:     number;
  total_protein_today:      number;
  total_carbs_today:        number;
  total_fat_today:          number;
  active_strike_count:      number;
}

// ── Trainer block ──────────────────────────────────────────────────
export interface TrainerInfo {
  id:                string;
  auth_user_id:      string;
  onboarding_status: string;
  business_name:     string | null;
  timezone:          string | null;
  country:           string | null;
}

// ── Client activity entry ──────────────────────────────────────────
export interface ClientActivity {
  client_id:      string;
  client_name:    string;
  meals_logged:   number;
  last_logged_at: string | null;
  total_calories: number;
  total_protein:  number;
}

// ── Compliance entry (computed from raw logger count) ──────────────
export interface ComplianceEntry {
  date:            string;
  compliance_rate: number;
}

// ── Single canonical DTO (RPC → mapper → UI) ──────────────────────
export interface DashboardDataDTO {
  version: 'v1';
  trainer: TrainerInfo;
  clients: ClientSummary[];
  metrics: {
    activeClients:   number;
    complianceRate:  number;
    weeklyProgress:  number;
    atRiskClients:   number;
  };
  trends: {
    complianceOverTime: ComplianceEntry[];
    clientActivity:     ClientActivity[];
  };
}

// ── Error model ────────────────────────────────────────────────────
export type DashboardErrorCode =
  | "TRAINER_NOT_FOUND"
  | "TEMPORARY_DB_FAILURE"
  | "PERMANENT_DB_ERROR";

export interface DashboardError {
  code:      DashboardErrorCode;
  message:   string;
  timestamp: string;
}

// ── Dashboard result (discriminated union, no fallback DTO) ────────
export type DashboardResult =
  | { success: true;  data: DashboardDataDTO }
  | { success: false; error: DashboardError };


