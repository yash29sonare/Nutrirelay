"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { toggleActiveStatus, unlinkClientFromRoster } from "./actions";
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

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
        <Input
          type="search"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          aria-label="Search clients by name"
          className="flex-1"
        />
        <Select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          aria-label="Filter by status"
          options={[
            { value: "all", label: "All clients" },
            { value: "risk", label: "At risk (2+ strikes)" },
            { value: "compliant", label: "Compliant (logged today)" },
            { value: "inactive", label: "Inactive (no log today)" },
          ]}
        />
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
        <Table>
          <TableHeader>
            {["Client", "Meals today", "Calories", "Status", "Actions"].map((col) => (
              <TableHeaderCell key={col}>{col}</TableHeaderCell>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const busy  = loadingId === row.client_id;
              const atRisk = row.active_strike_count >= 2;

              return (
                <TableRow key={row.client_id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/clients/${row.client_id}`}
                      className="font-medium text-[var(--foreground)] hover:text-brand-500 transition-colors"
                    >
                      {row.client_name}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums text-[var(--foreground)]">
                    {row.total_meals_logged_today}
                  </TableCell>
                  <TableCell className="tabular-nums text-[var(--foreground)]">
                    {row.total_calories_today} kcal
                  </TableCell>
                  <TableCell>
                    {atRisk ? (
                      <Badge variant="danger">
                        <AlertTriangle size={11} />
                        {row.active_strike_count} strikes
                      </Badge>
                    ) : row.total_meals_logged_today > 0 ? (
                      <Badge variant="brand">
                        On track
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        No log today
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
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
                      <InlineNotice>{errors[row.client_id]}</InlineNotice>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        buildUrl={(page) => buildUrl(pathname, { search, status: currentStatus, page })}
      />
    </div>
  );
}
