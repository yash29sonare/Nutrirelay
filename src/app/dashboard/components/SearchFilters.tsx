"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function SearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");

  // Debounced URL sync
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status && status !== "all") params.set("status", status);
      const qs = params.toString();
      router.push(pathname + (qs ? "?" + qs : ""));
    }, 300);
    return () => clearTimeout(t);
  }, [query, status, router, pathname]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <input
        type="search"
        placeholder="Search clients…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search clients by name"
        className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Filter by client status"
        className="px-3 py-2 text-sm rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      >
        <option value="all">All Clients</option>
        <option value="risk">At Risk (2+ Strikes)</option>
        <option value="compliant">Compliant</option>
      </select>
    </div>
  );
}
