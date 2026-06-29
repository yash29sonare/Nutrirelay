import { createClient } from "@supabase/supabase-js";
import { sendTemplateMessage } from "@/lib/whatsapp/send";

// Grace period after a meal slot window closes before flagging as missed
const GRACE_MINUTES = 30;

// Default timezone — overridden per-client once the timezone column is added to profiles
const DEFAULT_TZ = "Asia/Kolkata";

// ── Supabase client (service role — bypasses RLS) ──────────────────────────────
function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Timezone helpers (Intl API — no external dependency) ──────────────────────

function getLocalMinutesSinceMidnight(timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hours = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minutes = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  // Intl hour12:false can return 24 for midnight — normalise
  return (hours === 24 ? 0 : hours) * 60 + minutes;
}

function getLocalDateString(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // en-CA gives YYYY-MM-DD
}

// Parse "HH:MM:SS" Postgres TIME string into minutes-since-midnight
function parseScheduledTime(timeStr: string): number | null {
  const parts = timeStr.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// ── Meal nudge evaluator ───────────────────────────────────────────────────────

export async function evaluateMealNudges(): Promise<void> {
  const db = getDb();

  // Fetch all meal slots joined to their plan and client profile
  // meal_slots → meal_plans → profiles (client)
  const { data: slots, error } = await db
    .from("meal_slots")
    .select(
      `id, name, scheduled_time, window_minutes, target_calories,
       meal_plans!inner(
         id,
         client_id,
         profiles!meal_plans_client_id_fkey(id, full_name, phone_number)
       )`
    );

  if (error) {
    console.error("[meal-nudges] slot fetch error:", error.message);
    return;
  }

  if (!slots || slots.length === 0) return;

  for (const slot of slots) {
    const plan = Array.isArray(slot.meal_plans) ? slot.meal_plans[0] : slot.meal_plans;
    if (!plan) continue;

    const profile = Array.isArray(plan.profiles) ? plan.profiles[0] : plan.profiles;
    if (!profile?.phone_number) continue;

    const clientName = String(profile.full_name ?? "there");
    const phone = String(profile.phone_number);
    const clientId = String(plan.client_id);
    const timezone = DEFAULT_TZ;

    // Resolve tenant owner (trainer_id) for template sending
    const { data: tcRow, error: tcError } = await db
      .from("trainer_clients")
      .select("trainer_id")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (tcError || !tcRow) continue;

    const trainerId = String(tcRow.trainer_id);

    if (!slot.scheduled_time) continue;

    const slotMinutes = parseScheduledTime(slot.scheduled_time);
    if (slotMinutes === null) continue;

    const windowClose = slotMinutes + (slot.window_minutes ?? 30) + GRACE_MINUTES;
    const nowLocal = getLocalMinutesSinceMidnight(timezone);

    // Only evaluate if we are past the slot's window + grace period
    if (nowLocal < windowClose) continue;

    const localDate = getLocalDateString(timezone);

    // Check for an existing food log for this client today
    const { data: existingLogs } = await db
      .from("food_logs")
      .select("id")
      .eq("client_id", clientId)
      .gte("logged_at", `${localDate}T00:00:00.000Z`)
      .lt("logged_at", `${localDate}T23:59:59.999Z`)
      .limit(1);

    if (existingLogs && existingLogs.length > 0) continue;

    // No log found — send nudge
    try {
      await sendTemplateMessage(trainerId, phone, "meal_confirmation", [
        clientName,
        String(slot.name),
        String(slot.target_calories ?? "—"),
      ]);
      console.log(
        `[meal-nudges] nudge sent to ${phone} for slot "${slot.name}"`
      );
    } catch (err) {
      console.error(
        `[meal-nudges] failed to send nudge to ${phone}:`,
        (err as Error).message
      );
    }
  }
}
