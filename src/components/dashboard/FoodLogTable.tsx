"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export interface FoodLogEntry {
  id: string;
  food_name: string;
  estimated_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string; // ISO 8601 string from Supabase
  meal_category?: "Breakfast" | "Lunch" | "Dinner" | "Snack";
}

interface FoodLogTableProps {
  entries: FoodLogEntry[];
}

const CATEGORY_STYLES: Record<
  NonNullable<FoodLogEntry["meal_category"]>,
  string
> = {
  Breakfast: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Lunch: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Dinner: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  Snack: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

function CategoryBadge({
  category,
}: {
  category: FoodLogEntry["meal_category"];
}) {
  if (!category) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${CATEGORY_STYLES[category]}`}
    >
      {category}
    </span>
  );
}

function FormattedTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string>("—");

  // Hydration guard: only format on the client after mount to prevent
  // server/client timestamp mismatch warnings in Next.js RSC hydration.
  useEffect(() => {
    const d = new Date(iso);
    setLabel(
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  }, [iso]);

  return <span>{label}</span>;
}

export function FoodLogTable({ entries }: FoodLogTableProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-[var(--foreground)]">
            Today&apos;s food log
          </h2>
        </CardHeader>
        <CardContent className="py-12 flex flex-col items-center gap-2">
          <p className="text-sm text-[var(--muted)]">No meals logged yet.</p>
          <p className="text-xs text-[var(--muted)]">
            Entries will appear here as clients log their meals via WhatsApp.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium text-[var(--foreground)]">
          Today&apos;s food log
          <span className="ml-2 text-xs font-normal text-[var(--muted)]">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </h2>
      </CardHeader>

      {/* Scroll wrapper for small viewports */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--surface-border)]">
              {[
                "Item",
                "Category",
                "Calories",
                "Protein",
                "Carbs",
                "Fat",
                "Time",
              ].map((col) => (
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
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-[var(--surface-overlay)] transition-colors duration-100"
              >
                {/* Food name — truncate long descriptions */}
                <td className="px-5 py-3 max-w-[200px]">
                  <span
                    className="block truncate font-medium text-[var(--foreground)]"
                    title={entry.food_name}
                  >
                    {entry.food_name}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <CategoryBadge category={entry.meal_category} />
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-[var(--foreground)]">
                  {entry.estimated_calories} kcal
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-[var(--foreground)]">
                  {entry.protein_g}g
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-[var(--foreground)]">
                  {entry.carbs_g}g
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-[var(--foreground)]">
                  {entry.fat_g}g
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-[var(--muted)] text-xs">
                  <FormattedTime iso={entry.created_at} />
                </td>
              </tr>
            ))}
          </tbody>

          {/* Totals row */}
          <tfoot>
            <tr className="border-t-2 border-[var(--surface-border)] bg-[var(--surface-overlay)]">
              <td className="px-5 py-2.5 text-xs font-semibold text-[var(--muted)]">
                Total
              </td>
              <td className="px-5 py-2.5" />
              <td className="px-5 py-2.5 text-xs font-semibold tabular-nums text-[var(--foreground)]">
                {entries.reduce((s, e) => s + e.estimated_calories, 0)} kcal
              </td>
              <td className="px-5 py-2.5 text-xs font-semibold tabular-nums text-[var(--foreground)]">
                {entries.reduce((s, e) => s + e.protein_g, 0)}g
              </td>
              <td className="px-5 py-2.5 text-xs font-semibold tabular-nums text-[var(--foreground)]">
                {entries.reduce((s, e) => s + e.carbs_g, 0)}g
              </td>
              <td className="px-5 py-2.5 text-xs font-semibold tabular-nums text-[var(--foreground)]">
                {entries.reduce((s, e) => s + e.fat_g, 0)}g
              </td>
              <td className="px-5 py-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
