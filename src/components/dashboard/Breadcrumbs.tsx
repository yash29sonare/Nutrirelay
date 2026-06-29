"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getBreadcrumbs } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight size={12} className="text-[var(--muted)]" />
            )}
            {isLast ? (
              <span className="text-[var(--muted)] font-medium">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                )}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
