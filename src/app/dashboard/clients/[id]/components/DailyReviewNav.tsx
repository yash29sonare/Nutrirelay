"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface DailyReviewNavProps {
  clientId: string
  selectedDateKey: string
  previousDateKey: string
  nextDateKey: string
  todayDateKey: string
}

function reviewHref(clientId: string, dateKey: string) {
  return `/dashboard/clients/${clientId}?date=${dateKey}`
}

const navItemClassName = cn(
  "inline-flex items-center justify-center font-medium transition-all duration-150",
  "bg-transparent text-[var(--foreground)] border border-[var(--surface-border)] hover:bg-white/5",
  "px-3 py-1.5 text-xs rounded-md gap-1.5"
)

const disabledNavItemClassName = cn(
  navItemClassName,
  "opacity-50 cursor-not-allowed hover:bg-transparent"
)

export function DailyReviewNav({
  clientId,
  selectedDateKey,
  previousDateKey,
  nextDateKey,
  todayDateKey,
}: DailyReviewNavProps) {
  const router = useRouter()
  const nextDisabled = selectedDateKey >= todayDateKey
  const todayDisabled = selectedDateKey === todayDateKey
  const previousHref = reviewHref(clientId, previousDateKey)
  const todayHref = reviewHref(clientId, todayDateKey)
  const nextHref = reviewHref(clientId, nextDateKey)

  useEffect(() => {
    router.prefetch(previousHref)
    router.prefetch(todayHref)
    if (!nextDisabled) {
      router.prefetch(nextHref)
    }
  }, [nextDisabled, nextHref, previousHref, router, todayHref])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={previousHref} prefetch className={navItemClassName}>
        <ChevronLeft size={14} />
        Previous day
      </Link>
      {todayDisabled ? (
        <span aria-disabled="true" className={disabledNavItemClassName}>
          Today
        </span>
      ) : (
        <Link href={todayHref} prefetch className={navItemClassName}>
          Today
        </Link>
      )}
      {nextDisabled ? (
        <span aria-disabled="true" className={disabledNavItemClassName}>
          Next day
          <ChevronRight size={14} />
        </span>
      ) : (
        <Link href={nextHref} prefetch className={navItemClassName}>
          Next day
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  )
}
