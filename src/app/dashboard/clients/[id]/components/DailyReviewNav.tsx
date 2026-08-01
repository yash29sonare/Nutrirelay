"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"

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

export function DailyReviewNav({
  clientId,
  selectedDateKey,
  previousDateKey,
  nextDateKey,
  todayDateKey,
}: DailyReviewNavProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingDateKey, setPendingDateKey] = useState<string | null>(null)
  const nextDisabled = selectedDateKey >= todayDateKey

  useEffect(() => {
    router.prefetch(reviewHref(clientId, previousDateKey))
    router.prefetch(reviewHref(clientId, todayDateKey))
    if (!nextDisabled) {
      router.prefetch(reviewHref(clientId, nextDateKey))
    }
  }, [clientId, nextDateKey, nextDisabled, previousDateKey, router, todayDateKey])

  function goTo(dateKey: string) {
    if (dateKey === selectedDateKey) return
    setPendingDateKey(dateKey)
    startTransition(() => {
      router.push(reviewHref(clientId, dateKey))
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        loading={isPending && pendingDateKey === previousDateKey}
        onClick={() => goTo(previousDateKey)}
      >
        <ChevronLeft size={14} />
        Previous day
      </Button>
      <Button
        type="button"
        size="sm"
        variant={selectedDateKey === todayDateKey ? "brand" : "outline"}
        disabled={isPending || selectedDateKey === todayDateKey}
        loading={isPending && pendingDateKey === todayDateKey}
        onClick={() => goTo(todayDateKey)}
      >
        Today
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={nextDisabled || isPending}
        loading={isPending && pendingDateKey === nextDateKey}
        onClick={() => goTo(nextDateKey)}
      >
        Next day
        <ChevronRight size={14} />
      </Button>
    </div>
  )
}
