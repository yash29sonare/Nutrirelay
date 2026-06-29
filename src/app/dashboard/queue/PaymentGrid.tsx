"use client";

import { useState, useTransition } from "react";
import { approvePayment, rejectPayment } from "./actions";
import { formatDate, formatCurrency } from "@/lib/format";
import { InlineNotice } from "@/components/ui/InlineNotice";
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
    <Table>
      <TableHeader>
        {["Client", "UTR Number", "Amount", "Submitted", "Receipt", "Actions"].map((col) => (
          <TableHeaderCell key={col}>{col}</TableHeaderCell>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const busy = loadingId === row.id;
          return (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-[var(--foreground)] whitespace-nowrap">
                {row.client_name}
              </TableCell>
              <TableCell className="font-mono text-xs text-[var(--foreground)] whitespace-nowrap">
                {row.utr_number}
              </TableCell>
              <TableCell className="tabular-nums text-[var(--foreground)] whitespace-nowrap">
                {formatCurrency(row.amount)}
              </TableCell>
              <TableCell className="text-[var(--muted)] whitespace-nowrap text-xs">
                {formatDate(row.created_at)}
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => handleApprove(row.id)}
                    disabled={busy}
                    aria-label={`Approve payment ${row.utr_number}`}
                    icon={busy ? undefined : <CheckCircle size={12} />}
                    loading={busy}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleReject(row.id)}
                    disabled={busy}
                    aria-label={`Reject payment ${row.utr_number}`}
                    icon={<XCircle size={12} />}
                  >
                    Reject
                  </Button>
                </div>
                {errors[row.id] && (
                  <InlineNotice>{errors[row.id]}</InlineNotice>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
