import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { SearchFilters } from "./components/SearchFilters";
import { deriveDashboardMetrics, type ClientSummary } from "@/types/dashboard";
import { Users, AlertTriangle, TrendingUp } from "lucide-react";

function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function fetchClientSummaries(
  trainerId: string,
  q: string,
  status: string
): Promise<ClientSummary[]> {
  const supabase = getServerClient();

  let query = supabase
    .from("dashboard_client_summaries")
    .select("*")
    .eq("trainer_id", trainerId);

  if (q) {
    query = query.ilike("client_name", `%${q}%`);
  }

  if (status === "risk") {
    query = query.gte("active_strike_count", 2);
  } else if (status === "compliant") {
    query = query.gt("total_meals_logged_today", 0);
  }

  const { data, error } = await query.order("client_name", { ascending: true });
  if (error) {
    console.error("[dashboard] client summaries fetch error:", error.message);
    return [];
  }
  return (data ?? []) as ClientSummary[];
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchVal = resolvedSearchParams.q ?? "";
  const statusFilter = resolvedSearchParams.status ?? "all";

  // Resolve trainer identity — returns null if auth is not yet wired
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const trainerId = user?.id ?? null;

  const clients = trainerId
    ? await fetchClientSummaries(trainerId, searchVal, statusFilter)
    : [];

  const metrics = deriveDashboardMetrics(clients);

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          Command Center
        </h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Live client roster and tracking overview.
        </p>
      </div>

      {/* Metric cards */}
      <section aria-label="Global metrics">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500/10 shrink-0">
                <Users size={18} className="text-brand-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)] leading-none">
                  {metrics.totalClients}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Active clients
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)] leading-none">
                  {metrics.atRiskClients}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  At-risk clients
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500/10 shrink-0">
                <TrendingUp size={18} className="text-sky-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)] leading-none">
                  {metrics.globalComplianceRate}%
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Logged today
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Search + filter */}
      <section aria-label="Client filters">
        <Suspense
          fallback={
            <div className="h-10 w-full bg-[var(--surface-overlay)] animate-pulse rounded-lg" />
          }
        >
          <SearchFilters />
        </Suspense>
      </section>

      {/* Client roster */}
      <section aria-label="Client roster">
        {!trainerId && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-[var(--muted)]">
                Sign in to view your client roster.
              </p>
            </CardContent>
          </Card>
        )}

        {trainerId && clients.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-[var(--muted)]">
                No clients match your current filters.
              </p>
            </CardContent>
          </Card>
        )}

        {trainerId && clients.length > 0 && (
          <div className="space-y-2">
            {clients.map((client) => (
              <Link
                key={client.client_id}
                href={`/dashboard/clients/${client.client_id}`}
                className="block"
              >
                <Card className="hover:bg-[var(--surface-overlay)] transition-colors duration-100">
                  <CardContent className="py-3 px-5 flex items-center gap-4">
                    {/* Client name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {client.client_name}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {client.total_meals_logged_today} meal
                        {client.total_meals_logged_today !== 1 ? "s" : ""} today
                        &nbsp;·&nbsp;{client.total_calories_today} kcal
                      </p>
                    </div>

                    {/* Strike badge */}
                    {client.active_strike_count >= 2 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-500">
                        <AlertTriangle size={11} />
                        {client.active_strike_count} strikes
                      </span>
                    )}
                    {client.active_strike_count === 1 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500">
                        1 strike
                      </span>
                    )}
                    {client.active_strike_count === 0 &&
                      client.total_meals_logged_today > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-brand-500/10 text-brand-600">
                          On track
                        </span>
                      )}

                    {/* Arrow indicator */}
                    <span className="text-[var(--muted)] text-sm">›</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
