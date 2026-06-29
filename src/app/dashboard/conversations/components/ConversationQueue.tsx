"use client"

import { useState, useMemo } from "react"
import type { ConversationPlan } from "@/types/conversation"
import { ConversationSummary } from "./ConversationSummary"
import { ConversationFilters, type ConversationFilterValue } from "./ConversationFilters"
import { ConversationCard } from "./ConversationCard"
import { ConversationEmptyState } from "./ConversationEmptyState"

interface ConversationQueueProps {
  initialPlans: ConversationPlan[]
  clientNames: Record<string, string>
}

export function ConversationQueue({ initialPlans, clientNames }: ConversationQueueProps) {
  const [activeFilter, setActiveFilter] = useState<ConversationFilterValue>("all")
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set())

  const visiblePlans = useMemo(() => {
    return initialPlans.filter((p) => {
      if (handledIds.has(p.id)) return false
      if (activeFilter === "all") return true
      if (activeFilter === "high" || activeFilter === "medium" || activeFilter === "low") {
        return p.priority === activeFilter
      }
      return p.reason === activeFilter
    })
  }, [initialPlans, activeFilter, handledIds])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 }
    for (const p of initialPlans) {
      if (handledIds.has(p.id)) continue
      c.all = (c.all ?? 0) + 1
      c[p.priority] = (c[p.priority] ?? 0) + 1
      c[p.reason] = (c[p.reason] ?? 0) + 1
    }
    return c
  }, [initialPlans, handledIds])

  const highCount = useMemo(
    () => initialPlans.filter((p) => !handledIds.has(p.id) && p.priority === "high").length,
    [initialPlans, handledIds],
  )

  const uniqueClients = useMemo(
    () => new Set(visiblePlans.map((p) => p.context.clientId)).size,
    [visiblePlans],
  )

  function handleAction() {
    setHandledIds((prev) => {
      const next = new Set(prev)
      return next
    })
  }

  function handleOptimisticRemove(id: string) {
    setHandledIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-5">
      <ConversationSummary
        total={counts.all ?? 0}
        highPriority={highCount}
        uniqueClients={uniqueClients}
      />

      <ConversationFilters active={activeFilter} onChange={setActiveFilter} counts={counts} />

      {visiblePlans.length === 0 ? (
        <ConversationEmptyState />
      ) : (
        <div className="space-y-3">
          {visiblePlans.map((plan) => (
            <ConversationCard
              key={plan.id}
              plan={plan}
              clientName={clientNames[plan.context.clientId]}
              onAction={() => handleOptimisticRemove(plan.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
