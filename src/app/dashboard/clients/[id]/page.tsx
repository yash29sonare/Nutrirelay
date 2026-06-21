import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";
import type { ClientSummary } from "@/types/dashboard";
import type { Database } from "@/shared/types/supabase";

// Untyped client — dashboard_client_summaries view is not in generated DB types
function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getTypedClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface FoodLogRow {
  id: string;
  logged_at: string;
  notes: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="text-[var(--foreground)] tabular-nums">
          {current} / {target}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-right" style={{ color }}>
        {pct}%
      </p>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getServerClient();
  const typedSupabase = getTypedClient();

  // Resolve trainer for RLS compliance
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const trainerId = user?.id ?? null;

  // Parallel fetches — untyped client for the view, typed for food_logs
  const [summaryResult, logsResult] = await Promise.all([
    supabase
      .from("dashboard_client_summaries")
      .select("*")
      .eq("client_id", id)
      .eq("trainer_id", trainerId ?? "")
      .limit(1)
      .single(),

    typedSupabase
      .from("food_logs")
      .select("id, logged_at, notes, calories, protein_g, carbs_g, fat_g")
      .eq("client_id", id)
      .order("logged_at", { ascending: false })
      .limit(20),
  ]);

  const summary = summaryResult.data as ClientSummary | null;
  const logs = (logsResult.data ?? []) as FoodLogRow[];

  // Placeholder targets — will come from meal_plans in a later iteration
  const TARGETS = { calories: 2200, protein: 160, carbs: 220, fat: 70 };

  if (!summary) {
    return (
      <div className="px-6 py-6 max-w-4xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--muted)]">
              Client not found or access denied.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6 max-w-4xl">
      {/* Back nav */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      {/* Client header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          {summary.client_name}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          {summary.total_meals_logged_today} meal
          {summary.total_meals_logged_today !== 1 ? "s" : ""} logged today ·{" "}
          {summary.active_strike_count} active strike
          {summary.active_strike_count !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Macro progress */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-[var(--foreground)]">
            Today&apos;s macro progress
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <MacroBar
            label="Calories (kcal)"
            current={summary.total_calories_today}
            target={TARGETS.calories}
            color="#22c55e"
          />
          <MacroBar
            label="Protein (g)"
            current={summary.total_protein_today}
            target={TARGETS.protein}
            color="#38bdf8"
          />
          <MacroBar
            label="Carbohydrates (g)"
            current={summary.total_carbs_today}
            target={TARGETS.carbs}
            color="#f59e0b"
          />
          <MacroBar
            label="Fat (g)"
            current={summary.total_fat_today}
            target={TARGETS.fat}
            color="#f472b6"
          />
        </CardContent>
      </Card>

      {/* Food log table */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-[var(--foreground)]">
            Food log
            <span className="ml-2 text-xs font-normal text-[var(--muted)]">
              last {logs.length} entries
            </span>
          </h2>
        </CardHeader>
        {logs.length === 0 ? (
          <CardContent>
            <p className="text-sm text-[var(--muted)] py-6 text-center">
              No meals logged yet.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-border)]">
                  {["Time", "Description", "kcal", "P", "C", "F"].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border)]">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--surface-overlay)] transition-colors duration-100"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-[var(--muted)]">
                      {new Date(log.logged_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 max-w-[200px]">
                      <span
                        className="block truncate text-[var(--foreground)]"
                        title={log.notes ?? ""}
                      >
                        {log.notes ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--foreground)] whitespace-nowrap">
                      {log.calories ?? 0}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--foreground)] whitespace-nowrap">
                      {log.protein_g ?? 0}g
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--foreground)] whitespace-nowrap">
                      {log.carbs_g ?? 0}g
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--foreground)] whitespace-nowrap">
                      {log.fat_g ?? 0}g
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
