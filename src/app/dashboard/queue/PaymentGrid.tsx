"use client";

import { useState, useTransition } from "react";
import { approvePayment, rejectPayment } from "./actions";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

export interface PaymentRow {
  id: string;
  utr_number: string;
  amount: number;
  client_name: string;
  created_at: string;
  billing_screenshot_url: string | null;
}

interface PaymentGridProps {
  initialRows: PaymentRow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PaymentGrid({ initialRows }: PaymentGridProps) {
  const [rows, setRows] = useState<PaymentRow[]>(initialRows);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  async function handleApprove(id: string) {
    setLoadingId(id);
    setErrors((prev) => ({ ...prev, [id]: "" }));
    startTransition(async () => {
      const result = await approvePayment(id);
      if (result.error) {
        setErrors((prev) => ({ ...prev, [id]: result.error! }));
      } else {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
      setLoadingId(null);
    });
  }

  async function handleReject(id: string) {
    setLoadingId(id);
    setErrors((prev) => ({ ...prev, [id]: "" }));
    startTransition(async () => {
      const result = await rejectPayment(id);
      if (result.error) {
        setErrors((prev) => ({ ...prev, [id]: result.error! }));
      } else {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
      setLoadingId(null);
    });
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-[var(--muted)]">
            No pending payments. All clear.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--surface-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--surface-border)] bg-[var(--surface-raised)]">
            {["Client", "UTR Number", "Amount", "Submitted", "Receipt", "Actions"].map(
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
            const busy = loadingId === row.id;
            return (
              <tr
                key={row.id}
                className="bg-[var(--background)] hover:bg-[var(--surface-overlay)] transition-colors duration-100"
              >
                <td className="px-5 py-3 font-medium text-[var(--foreground)] whitespace-nowrap">
                  {row.client_name}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-[var(--foreground)] whitespace-nowrap">
                  {row.utr_number}
                </td>
                <td className="px-5 py-3 tabular-nums text-[var(--foreground)] whitespace-nowrap">
                  ₹{row.amount.toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-3 text-[var(--muted)] whitespace-nowrap text-xs">
                  {formatDate(row.created_at)}
                </td>
                <td className="px-5 py-3">
                  {row.billing_screenshot_url ? (
                    <a
                      href={row.billing_screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600"
                    >
                      View <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">No receipt</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(row.id)}
                      disabled={busy}
                      aria-label={`Approve payment ${row.utr_number}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busy ? (
                        <span className="w-3 h-3 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
                      ) : (
                        <CheckCircle size={12} />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(row.id)}
                      disabled={busy}
                      aria-label={`Reject payment ${row.utr_number}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle size={12} />
                      Reject
                    </button>
                  </div>
                  {errors[row.id] && (
                    <p className="mt-1 text-xs text-red-500">{errors[row.id]}</p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
