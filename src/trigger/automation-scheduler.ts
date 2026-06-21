import { schedules } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { runGhostingAudit } from "@/lib/automation/ghosting-daemon";
import { generateWeeklyReports } from "@/lib/automation/weekly-report";
import { runRenewalEngine } from "@/lib/automation/renewal-engine";

// Each task creates its own fresh db client — no shared connection state passed
// across task boundaries, satisfying Trigger.dev's serializable payload requirement.

function makeFreshDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("[scheduler] Supabase env vars not set");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Ghosting daemon — every hour ──────────────────────────────────────────────
// Checks for clients silent ≥ 48h and fires re-engagement templates.
export const ghostingDaemonSchedule = schedules.task({
  id: "ghosting-daemon",
  cron: "0 * * * *", // top of every hour
  maxDuration: 120,
  run: async () => {
    // Verify fresh db connectivity before delegating to automation lib
    makeFreshDb();
    await runGhostingAudit();
    return { ran: true };
  },
});

// ── Renewal engine — daily 03:30 UTC (09:00 IST) ─────────────────────────────
// Evaluates subscriptions expiring within 2 days (soft) or already expired (urgent).
export const renewalEngineSchedule = schedules.task({
  id: "renewal-engine",
  cron: "30 3 * * *",
  maxDuration: 180,
  run: async () => {
    makeFreshDb();
    const summary = await runRenewalEngine();
    return summary;
  },
});

// ── Weekly reports — Sundays 16:30 UTC (22:00 IST) ───────────────────────────
// Generates PDF performance reports and delivers them via WhatsApp document message.
export const weeklyReportSchedule = schedules.task({
  id: "weekly-report",
  cron: "30 16 * * 0",
  maxDuration: 900,
  run: async () => {
    makeFreshDb();
    const summary = await generateWeeklyReports();
    return summary;
  },
});
