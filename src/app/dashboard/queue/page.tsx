import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentGrid, type PaymentRow } from "./PaymentGrid";
import { CreditCard, IndianRupee, Clock } from "lucide-react";
import type { Database } from "@/shared/types/supabase";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function getDb() {
  return createServiceClient<Database>(
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

function MetricTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "amber" | "brand" | "sky";
}) {
  const toneClasses = {
    amber: "bg-amber-500/10 text-amber-500",
    brand: "bg-brand-500/10 text-brand-500",
    sky: "bg-sky-500/10 text-sky-500",
  } satisfies Record<typeof tone, string>;

  return (
    <div className="flex min-h-24 items-center gap-4 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)]/35 px-4 py-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none text-[var(--foreground)]">{value}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{label}</p>
      </div>
    </div>
  );
}

export default async function QueuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authUserId = user?.id ?? null;

  if (!authUserId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authUserId)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const trainerId = authUserId;

  const rows = trainerId ? await fetchPendingPayments(trainerId) : [];

  const totalValue = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const oldestAge =
    rows.length > 0 ? daysSince(rows[0].created_at) : null;

  return (
    <PageContainer className="space-y-6 pb-10">
      <PageHeader
        title="Payment Queue"
        description="Verify pending UPI payments from your clients."
      />

      <Card className="overflow-hidden">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Payment metrics</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Manual UPI proof awaiting operator review.
              </p>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Activation remains manual after payment proof is reviewed.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <MetricTile
              icon={<CreditCard size={18} />}
              label="Pending payments"
              value={rows.length}
              tone="sky"
            />
            <MetricTile
              icon={<IndianRupee size={18} />}
              label="Total in queue"
              value={`₹${totalValue.toLocaleString("en-IN")}`}
              tone="brand"
            />
            <MetricTile
              icon={<Clock size={18} />}
              label="Oldest ticket age"
              value={oldestAge !== null ? `${oldestAge}d` : "—"}
              tone="amber"
            />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Pending payment proofs</h2>
            <p className="text-xs leading-5 text-[var(--muted)]">
              Review submitted UTR details and receipts from active clients.
            </p>
          </div>
        </div>
        <PaymentGrid initialRows={rows} />
      </section>
    </PageContainer>
  );
}
