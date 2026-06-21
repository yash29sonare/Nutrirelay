"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { toggleActiveStatus, unlinkClientFromRoster } from "./actions";
import { AlertTriangle, ChevronRight, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

export interface RosterRow {
  client_id:                string;
  client_name:              string;
  total_meals_logged_today: number;
  total_calories_today:     number;
  active_strike_count:      number;
}

interface ClientGridProps {
  initialRows:   RosterRow[];
  currentPage:   number;
  totalPages:    number;
  currentSearch: string;
  currentStatus: string;
}

// Build URL with updated params while preserving existing ones
function buildUrl(
  pathname: string,
  updates: Record<string, string | number>
): string {
  const params = new URLSearchParams();
  Object.entries(updates).forEach(([k, v]) => {
    if (String(v)) params.set(k, String(v));
  });
  const qs = params.toString();
  return pathname + (qs ? "?" + qs : "");
}

export function ClientGrid({
  initialRows,
  currentPage,
  totalPages,
  currentSearch,
  currentStatus,
}: ClientGridProps) {
  const router   = useRouter();
  const pathname = usePathname();

  const [rows, setRows]       = useState<RosterRow[]>(initialRows);
  const [search, setSearch]   = useState(currentSearch);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  // Update rows when server re-renders with new data
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  // 300ms debounced search → URL push
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.push(
        buildUrl(pathname, { search: value, status: currentStatus, page: 1 })
      );
    }, 300);
  }

  function handleStatusChange(value: string) {
    router.push(buildUrl(pathname, { search, status: value, page: 1 }));
  }

  async function handleToggle(row: RosterRow, currentActive: boolean) {
    setLoadingId(row.client_id);
    setErrors((prev) => ({ ...prev, [row.client_id]: "" }));
    const result = await toggleActiveStatus(row.client_id, currentActive);
    if (result.error) setErrors((prev) => ({ ...prev, [row.client_id]: result.error! }));
    setLoadingId(null);
  }

  async function handleUnlink(clientId: string) {
    if (!confirm("Remove this client from your roster? This cannot be undone.")) return;
    setLoadingId(clientId);
    const result = await unlinkClientFromRoster(clientId);
    if (result.error) {
      setErrors((prev) => ({ ...prev, [clientId]: result.error! }));
    } else {
      setRows((prev) => prev.filter((r) => r.client_id !== clientId));
    }
    setLoadingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          aria-label="Search clients by name"
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-2 text-sm rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <option value="all">All clients</option>
          <option value="risk">At risk (2+ strikes)</option>
          <option value="compliant">Compliant (logged today)</option>
          <option value="inactive">Inactive (no log today)</option>
        </select>
      </div>

      {/* Grid */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--muted)]">
              No clients match your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--surface-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-border)] bg-[var(--surface-raised)]">
                {["Client", "Meals today", "Calories", "Status", "Actions"].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-5 py-3 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-border)]">
              {rows.map((row) => {
                const busy  = loadingId === row.client_id;
                const atRisk = row.active_strike_count >= 2;

                return (
                  <tr
                    key={row.client_id}
                    className="bg-[var(--background)] hover:bg-[var(--surface-overlay)] transition-colors duration-100"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/clients/${row.client_id}`}
                        className="font-medium text-[var(--foreground)] hover:text-brand-500 transition-colors"
                      >
                        {row.client_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--foreground)]">
                      {row.total_meals_logged_today}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--foreground)]">
                      {row.total_calories_today} kcal
                    </td>
                    <td className="px-5 py-3">
                      {atRisk ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-500">
                          <AlertTriangle size={11} />
                          {row.active_strike_count} strikes
                        </span>
                      ) : row.total_meals_logged_today > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-brand-500/10 text-brand-600 dark:text-brand-400">
                          On track
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--surface-overlay)] text-[var(--muted)]">
                          No log today
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/clients/${row.client_id}`}
                          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline underline-offset-2"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleUnlink(row.client_id)}
                          disabled={busy}
                          className="text-xs text-red-500/60 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          {busy ? "…" : "Remove"}
                        </button>
                      </div>
                      {errors[row.client_id] && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors[row.client_id]}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[var(--muted)]">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={buildUrl(pathname, {
                search,
                status: currentStatus,
                page: Math.max(1, currentPage - 1),
              })}
              aria-disabled={currentPage <= 1}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--surface-border)] transition-colors ${
                currentPage <= 1
                  ? "opacity-40 pointer-events-none"
                  : "hover:bg-[var(--surface-overlay)]"
              } text-[var(--foreground)]`}
            >
              <ChevronLeft size={12} /> Prev
            </Link>
            <Link
              href={buildUrl(pathname, {
                search,
                status: currentStatus,
                page: Math.min(totalPages, currentPage + 1),
              })}
              aria-disabled={currentPage >= totalPages}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--surface-border)] transition-colors ${
                currentPage >= totalPages
                  ? "opacity-40 pointer-events-none"
                  : "hover:bg-[var(--surface-overlay)]"
              } text-[var(--foreground)]`}
            >
              Next <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
