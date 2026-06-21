import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/Card";
import { PaymentGrid, type PaymentRow } from "./PaymentGrid";
import { CreditCard, IndianRupee, Clock } from "lucide-react";
import type { Database } from "@/shared/types/supabase";

export const dynamic = "force-dynamic";

function getDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function fetchPendingPayments(trainerId: string): Promise<PaymentRow[]> {
  const db = getDb();

  // Step 1: get all active client IDs for this trainer
  const { data: tcRows } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("is_active", true);

  if (!tcRows || tcRows.length === 0) return [];

  const clientIds = tcRows.map((r) => r.client_id);

  // Step 2: fetch pending payments for those clients
  const { data: payments, error } = await db
    .from("upi_payments")
    .select("id, utr_number, amount, client_id, created_at, billing_screenshot_url")
    .eq("payment_status", "pending")
    .in("client_id", clientIds)
    .order("created_at", { ascending: true });

  if (error || !payments) return [];

  // Step 3: resolve client names from profiles
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name")
    .in("id", clientIds);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name])
  );

  return payments.map((p) => ({
    id:                    p.id,
    utr_number:            p.utr_number,
    amount:                p.amount,
    client_name:           nameMap.get(p.client_id) ?? "Unknown client",
    created_at:            p.created_at,
    billing_screenshot_url: p.billing_screenshot_url,
  }));
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function QueuePage() {
  const db = getDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  const trainerId = user?.id ?? null;

  const rows = trainerId ? await fetchPendingPayments(trainerId) : [];

  const totalValue = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const oldestAge =
    rows.length > 0 ? daysSince(rows[0].created_at) : null;

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          Payment Queue
        </h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Verify pending UPI payments from your clients.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500/10 shrink-0">
              <CreditCard size={18} className="text-sky-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)] leading-none">
                {rows.length}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">Pending payments</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500/10 shrink-0">
              <IndianRupee size={18} className="text-brand-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)] leading-none">
                ₹{totalValue.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">Total in queue</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 shrink-0">
              <Clock size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)] leading-none">
                {oldestAge !== null ? `${oldestAge}d` : "—"}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">Oldest ticket age</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment grid */}
      {!trainerId ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--muted)]">
              Sign in to view your payment queue.
            </p>
          </CardContent>
        </Card>
      ) : (
        <PaymentGrid initialRows={rows} />
      )}
    </div>
  );
}
