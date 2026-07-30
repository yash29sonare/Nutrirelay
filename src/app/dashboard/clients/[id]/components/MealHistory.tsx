"use client"

import { useMemo, useState } from "react"
import type { MealRecord } from "@/types/meal"
import { Badge } from "@/components/ui/Badge"
import { Card, CardHeader } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { formatDate, formatDateTime, formatNumber } from "@/lib/format"
import { formatMealType, formatReviewStatus } from "@/lib/meals/mealFormatting"
import { CalendarDays, UtensilsCrossed } from "lucide-react"
import { NutritionReviewControls } from "./NutritionReviewControls"

function StatusBadge({ record }: { record: MealRecord }) {
  switch (record.review.status) {
    case "verified":
      return <Badge variant="success">{formatReviewStatus(record.review.status)}</Badge>
    case "unverified":
      return <Badge variant="warning">{formatReviewStatus(record.review.status)}</Badge>
    case "pending":
      return <Badge variant="info">{formatReviewStatus(record.review.status)}</Badge>
    default:
      return <Badge variant="default">{formatReviewStatus(record.review.status)}</Badge>
  }
}

interface MealHistoryProps {
  meals: Array<MealRecord & { duplicateCount?: number }>
  title?: string
  description?: string
  enableReviewActions?: boolean
}

function dateKeyFromDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function dayKey(iso: string): string {
  return dateKeyFromDate(new Date(iso))
}

function weekStartKey(iso: string): string {
  const date = new Date(iso)
  const day = date.getDay()
  const diff = (day + 6) % 7
  const start = new Date(date)
  start.setDate(date.getDate() - diff)
  start.setHours(0, 0, 0, 0)
  return dateKeyFromDate(start)
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function SourceBadge({ record }: { record: MealRecord }) {
  switch (record.sourceType) {
    case "image":
      return <Badge variant="info">Image</Badge>
    case "voice":
      return <Badge variant="default">Voice</Badge>
    case "poll":
      return <Badge variant="outline">Poll</Badge>
    case "text":
      return <Badge variant="outline">Text</Badge>
    default:
      return <Badge variant="outline">Log</Badge>
  }
}

function foodLabel(record: MealRecord): string {
  const text = record.sourceText?.trim()
  if (text && text !== "unknown") return text
  return formatMealType(record.mealType)
}

function wholeNumber(value: number): string {
  return formatNumber(Math.round(value))
}

export function MealHistory({ meals, title = "Meal history", description, enableReviewActions = false }: MealHistoryProps) {
  const weeks = useMemo(() => {
    const byWeek = new Map<string, MealRecord[]>()
    for (const meal of meals) {
      const key = weekStartKey(meal.mealTimestamp)
      byWeek.set(key, [...(byWeek.get(key) ?? []), meal])
    }

    return [...byWeek.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([start, weekMeals]) => ({
        start,
        end: addDays(start, 6),
        meals: weekMeals,
      }))
  }, [meals])

  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(
    weeks[0]?.start ?? null,
  )

  const activeWeek = weeks.find((week) => week.start === selectedWeekStart) ?? weeks[0]
  const days = useMemo(() => {
    if (!activeWeek) return []
    const keys = [...new Set(activeWeek.meals.map((meal) => dayKey(meal.mealTimestamp)))]
    return keys.sort((a, b) => b.localeCompare(a))
  }, [activeWeek])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const activeDay = selectedDay && days.includes(selectedDay) ? selectedDay : days[0]
  const visibleMeals = activeWeek && activeDay
    ? activeWeek.meals.filter((meal) => dayKey(meal.mealTimestamp) === activeDay)
    : []

  if (meals.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
              <UtensilsCrossed size={14} />
              {title}
              <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                {visibleMeals.length} on selected day
              </span>
            </h2>
            {description ? (
              <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
          {activeWeek ? (
            <label className="flex flex-col gap-1 text-xs text-[var(--muted)]">
              Week
              <select
                value={activeWeek.start}
                onChange={(event) => {
                  setSelectedWeekStart(event.target.value)
                  setSelectedDay(null)
                }}
                className="h-9 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
              >
                {weeks.map((week) => (
                  <option key={week.start} value={week.start}>
                    {formatDate(week.start)} - {formatDate(week.end)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        {days.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {days.map((dateKey) => (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDay(dateKey)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeDay === dateKey
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                    : "border-[var(--surface-border)] text-[var(--muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--foreground)]",
                ].join(" ")}
              >
                <CalendarDays size={13} />
                {formatDate(dateKey)}
              </button>
            ))}
          </div>
        ) : null}
        {activeDay ? (
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {formatDate(activeDay)}
          </p>
        ) : null}
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--surface-border)]">
              <th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap">
                Logged intake
              </th>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap">
                Source
              </th>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap">
                Time
              </th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-[var(--muted)] whitespace-nowrap">
                kcal
              </th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-[var(--muted)] whitespace-nowrap">
                P
              </th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-[var(--muted)] whitespace-nowrap">
                C
              </th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-[var(--muted)] whitespace-nowrap">
                F
              </th>
              <th className="px-5 py-2.5 text-center text-xs font-medium text-[var(--muted)] whitespace-nowrap">
                Status
              </th>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap">
                AI review
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {visibleMeals.map((meal) => (
              <tr
                key={meal.id}
                className="hover:bg-[var(--surface-overlay)] transition-colors duration-100"
              >
                <td className="px-5 py-3 whitespace-nowrap">
                  <div className="max-w-[280px]">
                    <p className="truncate font-medium text-[var(--foreground)]">
                      {foodLabel(meal)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatMealType(meal.mealType)}
                      {meal.attachment ? " · with photo" : ""}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <SourceBadge record={meal} />
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-xs text-[var(--muted)]">
                  {formatDateTime(meal.mealTimestamp)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-right text-[var(--foreground)]">
                  {wholeNumber(meal.calories)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-right text-[var(--foreground)]">
                  {wholeNumber(meal.proteinG)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-right text-[var(--foreground)]">
                  {wholeNumber(meal.carbsG)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-right text-[var(--foreground)]">
                  {wholeNumber(meal.fatG)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-center">
                  <StatusBadge record={meal} />
                </td>
                <td className="px-5 py-3 align-top">
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={meal.reviewState === "needs_review" ? "warning" : meal.reviewState === "rejected" ? "danger" : "success"}>
                        {meal.reviewState.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant={meal.aiConfidence === "low" ? "danger" : meal.aiConfidence === "medium" ? "warning" : "outline"}>
                        {meal.aiConfidence}
                      </Badge>
                    </div>
                    {meal.reviewReason ? (
                      <p className="text-xs text-[var(--muted)]">{meal.reviewReason.replace(/_/g, " ")}</p>
                    ) : null}
                    {meal.trainerNote ? (
                      <p className="text-xs text-[var(--muted)]">Note: {meal.trainerNote}</p>
                    ) : null}
                    {enableReviewActions ? (
                      <NutritionReviewControls
                        meal={meal}
                        mergeCandidates={visibleMeals.filter((candidate) => candidate.id !== meal.id).slice(0, 5)}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleMeals.length === 0 ? (
          <div className="border-t border-[var(--surface-border)] py-8">
            <EmptyState
              title="No intake logged for this day"
              description="Choose another day or week to review older intake."
            />
          </div>
        ) : null}
      </div>
    </Card>
  )
}
