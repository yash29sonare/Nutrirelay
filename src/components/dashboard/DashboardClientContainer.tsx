"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FoodLogTable, type FoodLogEntry } from "@/components/dashboard/FoodLogTable";
import { Users, Mic, CreditCard, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

// ── Baseline daily macro targets ──────────────────────────────────────────────
const DAILY_TARGETS = {
  calories: 2200,
  protein_g: 160,
  carbs_g: 220,
  fat_g: 70,
} as const;

const ACCENT = {
  calories: "#22c55e",
  protein: "#38bdf8",
  carbs: "#f59e0b",
  fat: "#f472b6",
} as const;

interface DashboardClientContainerProps {
  initialEntries: FoodLogEntry[];
  /** Used to scope the realtime channel to this trainer's rows.
   *  Pass null until Supabase Auth middleware is wired; subscription is skipped. */
  trainerId: string | null;
}

// ── Numeric field parser — prevents string-concatenation bugs from raw WS payloads
function parseEntry(raw: Record<string, unknown>): FoodLogEntry {
  return {
    id: String(raw.id ?? ""),
    food_name: String(raw.notes ?? `Log ${String(raw.wam_id ?? "").slice(-6)}`),
    estimated_calories: Number(raw.calories ?? 0),
    protein_g: Number(raw.protein_g ?? 0),
    carbs_g: Number(raw.carbs_g ?? 0),
    fat_g: Number(raw.fat_g ?? 0),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    meal_category: deriveMealCategory(String(raw.logged_at ?? raw.created_at ?? "")),
  };
}

function deriveMealCategory(iso: string): FoodLogEntry["meal_category"] {
  if (!iso) return "Snack";
  const hour = new Date(iso).getUTCHours();
  if (hour >= 5 && hour < 11) return "Breakfast";
  if (hour >= 11 && hour < 15) return "Lunch";
  if (hour >= 17 && hour < 21) return "Dinner";
  return "Snack";
}

// ── Returns ISO boundaries for today in UTC — identical on server and client
function getTodayBoundariesUTC(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

// ── Stat card ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent?: string;
}

function StatCard({ label, value, icon: Icon, accent = "text-[var(--muted)]" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--surface-overlay)] shrink-0">
          <Icon size={18} className={accent} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--foreground)] leading-none">{value}</p>
          <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main client container ──────────────────────────────────────────────────────
export function DashboardClientContainer({
  initialEntries,
  trainerId,
}: DashboardClientContainerProps) {
  const [entries, setEntries] = useState<FoodLogEntry[]>(initialEntries);

  useEffect(() => {
    // Skip subscription setup until auth is wired and trainerId is available
    if (!trainerId) return;

    const { start, end } = getTodayBoundariesUTC();

    const channel = supabase
      .channel("food_logs_dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_logs",
          filter: `trainer_id=eq.${trainerId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Record<string, unknown>;
            const createdAt = String(row.created_at ?? "");
            // Only show rows that fall within today's UTC boundary
            if (createdAt >= start && createdAt < end) {
              setEntries((prev) => [...prev, parseEntry(row)]);
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Record<string, unknown>;
            const updatedId = String(row.id ?? "");
            setEntries((prev) =>
              prev.map((e) => (e.id === updatedId ? parseEntry(row) : e))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = String(
              (payload.old as Record<string, unknown>).id ?? ""
            );
            setEntries((prev) => prev.filter((e) => e.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainerId]);

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.estimated_calories,
      protein_g: acc.protein_g + e.protein_g,
      carbs_g: acc.carbs_g + e.carbs_g,
      fat_g: acc.fat_g + e.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  return (
    <PageContainer className="space-y-8">
      <PageHeader
        title="Overview"
        description="Your operations at a glance."
      />

      {/* Operations stat strip */}
      <section aria-label="Operations summary">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Active clients" value="—" icon={Users} accent="text-brand-500" />
          <StatCard label="Unread voice notes" value="—" icon={Mic} accent="text-amber-500" />
          <StatCard label="Pending payments" value="—" icon={CreditCard} accent="text-sky-500" />
          <StatCard label="Ghost alerts" value="—" icon={AlertTriangle} accent="text-red-500" />
        </div>
      </section>

      {/* Macro progress grid */}
      <section aria-label="Daily macro progress">
        <h2 className="text-sm font-medium text-[var(--foreground)] mb-3">
          Daily macro progress
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Calories"
            current={totals.calories}
            target={DAILY_TARGETS.calories}
            unit=" kcal"
            accentColor={ACCENT.calories}
          />
          <MetricCard
            label="Protein"
            current={totals.protein_g}
            target={DAILY_TARGETS.protein_g}
            unit="g"
            accentColor={ACCENT.protein}
          />
          <MetricCard
            label="Carbohydrates"
            current={totals.carbs_g}
            target={DAILY_TARGETS.carbs_g}
            unit="g"
            accentColor={ACCENT.carbs}
          />
          <MetricCard
            label="Fat"
            current={totals.fat_g}
            target={DAILY_TARGETS.fat_g}
            unit="g"
            accentColor={ACCENT.fat}
          />
        </div>
      </section>

      {/* Food log table */}
      <section aria-label="Food log">
        <FoodLogTable entries={entries} />
      </section>
    </PageContainer>
  );
}
