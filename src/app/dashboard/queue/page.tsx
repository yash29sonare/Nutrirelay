import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardGrid } from "@/components/layout/DashboardGrid";
import { DashboardSection } from "@/components/layout/DashboardSection";
import { PaymentGrid, type PaymentRow } from "./PaymentGrid";
import { EmptyState } from "@/components/ui/EmptyState";
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
    <PageContainer>
      <PageHeader
        title="Payment Queue"
        description="Verify pending UPI payments from your clients."
      />

      {/* Metrics */}
      <DashboardSection title="Payment metrics">
        <DashboardGrid columns={3}>
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
      </DashboardGrid>
      </DashboardSection>

      {/* Payment grid */}
      {!trainerId ? (
        <EmptyState
          title="Sign in to view your payment queue."
        />
      ) : (
        <PaymentGrid initialRows={rows} />
      )}
    </PageContainer>
  );
}
