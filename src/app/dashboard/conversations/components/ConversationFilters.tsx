"use client"

import type { ConversationPriority, ConversationReason } from "@/types/conversation"
import { cn } from "@/lib/utils"
import { formatConversationPriority, formatConversationReason } from "@/lib/conversations/conversationFormatting"

export type ConversationFilterValue = "all" | ConversationPriority | ConversationReason

const PRESETS: { value: ConversationFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High priority" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "missing_attachment", label: "No photo" },
  { value: "low_information", label: "Low info" },
  { value: "negative_review", label: "Rejected" },
  { value: "long_meal_gap", label: "Meal gap" },
]

interface ConversationFiltersProps {
  active: ConversationFilterValue
  onChange: (value: ConversationFilterValue) => void
  counts: Record<string, number>
}

export function ConversationFilters({ active, onChange, counts }: ConversationFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((p) => {
        const isActive = active === p.value
        const count = counts[p.value] ?? 0
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-100",
              isActive
                ? "bg-[var(--surface-overlay)] text-[var(--foreground)] border border-[var(--surface-border)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] border border-transparent",
            )}
          >
            {p.label}
            <span className="ml-1 text-[var(--muted)]">({count})</span>
          </button>
        )
      })}
    </div>
  )
}
