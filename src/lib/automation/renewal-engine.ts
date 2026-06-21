import { createClient } from "@supabase/supabase-js";
import { sendTemplateMessage } from "@/lib/whatsapp/send";

// ── Renewal lifecycle thresholds ───────────────────────────────────────────────
// Soft reminder fires when <= 2 days remain (the "Day 28" of a 30-day cycle).
// Urgent reminder fires on/after expiry (the "Day 30" boundary).
const SOFT_REMINDER_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── Supabase client (service role — bypasses RLS for system cron) ──────────────
function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface SubscriptionRow {
  id: string;
  client_id: string;
  status: string;
  end_date: string | null;
  renewal_notified_d28: boolean;
  renewal_notified_d30: boolean;
  profiles: { full_name: string | null; phone_number: string | null } | null;
}

export interface RenewalRunSummary {
  evaluated: number;
  softSent: number;
  urgentSent: number;
  errors: number;
}

/**
 * Daily renewal engine. Evaluates every non-cancelled subscription against its
 * `end_date` and dispatches the appropriate WhatsApp re-engagement template.
 *
 * Dedup is enforced by `renewal_notified_d28` / `renewal_notified_d30` flags so a
 * daily cron never re-sends the same reminder. On expiry the subscription is
 * transitioned to `past_due` (the same status `subscriptionVerifier` reports).
 *
 * Recommended schedule: daily at 09:00 IST (03:30 UTC) via `/api/cron?action=renewals`.
 */
export async function runRenewalEngine(): Promise<RenewalRunSummary> {
  const db = getDb();
  const summary: RenewalRunSummary = { evaluated: 0, softSent: 0, urgentSent: 0, errors: 0 };

  // Pull active-lifecycle subscriptions with the linked client profile.
  const { data: subs, error } = await db
    .from("subscriptions")
    .select(
      `id, client_id, status, end_date, renewal_notified_d28, renewal_notified_d30,
       profiles!subscriptions_client_id_fkey(full_name, phone_number)`
    )
    .neq("status", "canceled");

  if (error) {
    console.error("[renewal-engine] subscription fetch error:", error.message);
    return summary;
  }

  if (!subs || subs.length === 0) return summary;

  const now = Date.now();

  for (const raw of subs as unknown as SubscriptionRow[]) {
    if (!raw.end_date) continue; // open-ended / unconfigured subscription — skip

    const profile = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;
    if (!profile?.phone_number) continue;

    summary.evaluated++;

    const phone = String(profile.phone_number);
    const clientName = String(profile.full_name ?? "there");
    const expiryMs = new Date(raw.end_date).getTime();
    const daysRemaining = Math.ceil((expiryMs - now) / MS_PER_DAY);
    const expiryDate = new Date(raw.end_date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    // ── Day 30 — expiry reached: urgent final reminder + pause subscription ─────
    if (daysRemaining <= 0 && !raw.renewal_notified_d30) {
      try {
        await sendTemplateMessage(phone, "renewal_reminder_urgent", [clientName]);
        await db
          .from("subscriptions")
          .update({ renewal_notified_d30: true, status: "past_due" })
          .eq("id", raw.id);
        summary.urgentSent++;
        console.log(`[renewal-engine] urgent renewal sent to ${phone} (expired)`);
      } catch (err) {
        summary.errors++;
        console.error(
          `[renewal-engine] urgent send failed for ${phone}:`,
          (err as Error).message
        );
      }
      continue; // expired path is terminal for this run
    }

    // ── Day 28 — within soft window: gentle reminder ────────────────────────────
    if (daysRemaining > 0 && daysRemaining <= SOFT_REMINDER_DAYS && !raw.renewal_notified_d28) {
      try {
        await sendTemplateMessage(phone, "renewal_reminder_soft", [clientName, expiryDate]);
        await db
          .from("subscriptions")
          .update({ renewal_notified_d28: true })
          .eq("id", raw.id);
        summary.softSent++;
        console.log(
          `[renewal-engine] soft renewal sent to ${phone} (${daysRemaining}d remaining)`
        );
      } catch (err) {
        summary.errors++;
        console.error(
          `[renewal-engine] soft send failed for ${phone}:`,
          (err as Error).message
        );
      }
    }
  }

  console.log(
    `[renewal-engine] done — evaluated=${summary.evaluated} soft=${summary.softSent} urgent=${summary.urgentSent} errors=${summary.errors}`
  );
  return summary;
}

/**
 * Post-payment hook. Call after a trainer verifies a UPI payment to renew the
 * subscription window and clear the notification flags so the next cycle starts
 * fresh. Extends `end_date` by 30 days from the later of (current expiry, now).
 */
export async function renewSubscriptionAfterPayment(clientId: string): Promise<void> {
  const db = getDb();

  const { data: sub } = await db
    .from("subscriptions")
    .select("id, end_date")
    .eq("client_id", clientId)
    .limit(1)
    .single();

  const row = sub as { id: string; end_date: string | null } | null;
  if (!row) {
    console.error("[renewal-engine] no subscription to renew for client", clientId);
    return;
  }

  const base = row.end_date ? new Date(row.end_date).getTime() : Date.now();
  const anchor = Math.max(base, Date.now());
  const newExpiry = new Date(anchor + 30 * MS_PER_DAY).toISOString();

  await db
    .from("subscriptions")
    .update({
      end_date: newExpiry,
      status: "active",
      renewal_notified_d28: false,
      renewal_notified_d30: false,
    })
    .eq("id", row.id);

  console.log(`[renewal-engine] subscription renewed for client ${clientId} until ${newExpiry}`);
}
