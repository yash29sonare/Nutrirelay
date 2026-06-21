import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/Card";
import { ClientGrid, type RosterRow } from "./ClientGrid";
import type { ClientSummary } from "@/types/dashboard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function fetchRosterPage(
  trainerId: string,
  search: string,
  status: string,
  page: number
): Promise<{ rows: RosterRow[]; total: number }> {
  const db = getDb();
  const offset = (page - 1) * PAGE_SIZE;

  let query = db
    .from("dashboard_client_summaries")
    .select("*", { count: "exact" })
    .eq("trainer_id", trainerId);

  if (search) {
    query = query.ilike("client_name", `%${search}%`);
  }
  if (status === "risk") {
    query = query.gte("active_strike_count", 2);
  } else if (status === "compliant") {
    query = query.gt("total_meals_logged_today", 0);
  } else if (status === "inactive") {
    query = query.eq("total_meals_logged_today", 0);
  }

  const { data, count, error } = await query
    .order("client_name", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error || !data) return { rows: [], total: 0 };

  return {
    rows: (data as ClientSummary[]).map((r) => ({
      client_id:                r.client_id,
      client_name:              r.client_name,
      total_meals_logged_today: r.total_meals_logged_today,
      total_calories_today:     r.total_calories_today,
      active_strike_count:      r.active_strike_count,
    })),
    total: count ?? 0,
  };
}

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
  }>;
}) {
  const sp = await searchParams;
  const page   = Math.max(1, parseInt(sp.page ?? "1", 10));
  const status = sp.status ?? "all";
  const search = sp.search ?? "";

  const db = getDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  const trainerId = user?.id ?? null;

  const { rows, total } = trainerId
    ? await fetchRosterPage(trainerId, search, status, page)
    : { rows: [], total: 0 };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          Client Roster
        </h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          {total} client{total !== 1 ? "s" : ""} in your roster
        </p>
      </div>

      {!trainerId ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--muted)]">
              Sign in to view your roster.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Suspense
          fallback={
            <div className="h-12 w-full bg-[var(--surface-overlay)] animate-pulse rounded-lg" />
          }
        >
          <ClientGrid
            initialRows={rows}
            currentPage={page}
            totalPages={totalPages}
            currentSearch={search}
            currentStatus={status}
          />
        </Suspense>
      )}
    </div>
  );
}
