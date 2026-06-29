"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const STATUS_OPTIONS = [
  { value: "all", label: "All Clients" },
  { value: "risk", label: "At Risk" },
  { value: "compliant", label: "Compliant" },
  { value: "inactive", label: "Inactive Today" },
];

export function ClientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status && status !== "all") params.set("status", status);
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    }, 300);
    return () => clearTimeout(t);
  }, [query, status, router, pathname]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Input
        type="search"
        placeholder="Search clients by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        aria-label="Search clients"
        icon={<Search size={14} />}
        className="flex-1"
      />
      <Select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Filter by status"
        options={STATUS_OPTIONS}
      />
    </div>
  );
}
