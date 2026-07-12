import { createClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/operations/audit";

// Clients silent for this long are considered ghosting
const GHOST_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface InboundLogRow {
  client_phone: string;
  received_at: string;
}

export async function runGhostingAudit(): Promise<void> {
  const db = getDb();

  // ── 1. Find the latest inbound timestamp per phone number ─────────────────
  // incoming_webhook_logs is not in generated types — use untyped client
  const { data: logs, error: logsError } = await (db as ReturnType<typeof createClient>)
    .from("incoming_webhook_logs")
    .select("client_phone, received_at")
    .eq("status", "processed")
    .order("received_at", { ascending: false });

  if (logsError) {
    console.error("[ghosting-daemon] log fetch error:", logsError.message);
    return;
  }

  if (!logs || logs.length === 0) return;

  // Deduplicate — keep only the most recent record per phone
  const latestByPhone = new Map<string, string>();
  for (const row of logs as InboundLogRow[]) {
    if (!latestByPhone.has(row.client_phone)) {
      latestByPhone.set(row.client_phone, row.received_at);
    }
  }

  const now = Date.now();

  for (const [phone, lastReceivedAt] of latestByPhone.entries()) {
    const silenceMs = now - new Date(lastReceivedAt).getTime();
    if (silenceMs < GHOST_THRESHOLD_MS) continue;

    // ── 2. Resolve client profile by phone number ─────────────────────────
    const { data: profile } = await db
      .from("profiles")
      .select("id, full_name")
      .eq("phone_number", phone)
      .limit(1)
      .single();

    if (!profile) continue;

    const clientId = String(profile.id);
    const clientName = String(profile.full_name ?? "there");
    const silenceHours = Math.floor(silenceMs / (60 * 60 * 1000));

    // ── 3. Check for an existing recent strike to avoid duplicate alerts ──
    const cutoff48h = new Date(now - GHOST_THRESHOLD_MS).toISOString();
    const { data: recentStrikes } = await db
      .from("strike_log")
      .select("id")
      .eq("profile_id", clientId)
      .gte("issued_at", cutoff48h)
      .limit(1);

    if (recentStrikes && recentStrikes.length > 0) continue;

    // ── 4. Resolve trainerId (tenant owner) — needed for audit + template ──
    const { data: tcRow, error: tcError } = await db
      .from("trainer_clients")
      .select("trainer_id")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (tcError || !tcRow) continue;

    const trainerId = String(tcRow.trainer_id);

    // ── 5. Insert strike log entry ─────────────────────────────────────────
    const { data: strikeResult, error: strikeError } = await db.from("strike_log").insert({
      profile_id: clientId,
      reason: `Client silent for ${silenceHours}h — ghosting threshold exceeded`,
    }).select("id").single();

    if (strikeError) {
      console.error(
        "[ghosting-daemon] strike insert error for",
        clientId,
        strikeError.message
      );
      continue;
    }

    if (strikeResult) {
      await writeAuditLog({
        trainer_id: trainerId,
        actor_id: trainerId,
        event_type: "ghosting_strike_created",
        entity_type: "strike_log",
        entity_id: String((strikeResult as { id: string }).id),
        metadata: { client_id: clientId, silence_hours: silenceHours },
      }).catch(() => {});
    }

    console.log(
      `[ghosting-daemon] automation paused for ${phone} (${silenceHours}h silent)`
    );
  }
}
