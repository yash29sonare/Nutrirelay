import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage: number
  totalPages: number
  buildUrl: (page: number) => string
  className?: string
}

export function Pagination({ currentPage, totalPages, buildUrl, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={cn("flex items-center justify-between pt-2", className)}>
      <p className="text-xs text-[var(--muted)]">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={buildUrl(Math.max(1, currentPage - 1))}
          aria-disabled={currentPage <= 1}
          className={cn(
            "inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--surface-border)] transition-colors text-[var(--foreground)]",
            currentPage <= 1
              ? "opacity-40 pointer-events-none"
              : "hover:bg-[var(--surface-overlay)]"
          )}
        >
          <ChevronLeft size={12} /> Prev
        </Link>
        <Link
          href={buildUrl(Math.min(totalPages, currentPage + 1))}
          aria-disabled={currentPage >= totalPages}
          className={cn(
            "inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--surface-border)] transition-colors text-[var(--foreground)]",
            currentPage >= totalPages
              ? "opacity-40 pointer-events-none"
              : "hover:bg-[var(--surface-overlay)]"
          )}
        >
          Next <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}
