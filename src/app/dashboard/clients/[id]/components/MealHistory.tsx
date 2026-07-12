import type { MealRecord } from "@/types/meal"
import { Badge } from "@/components/ui/Badge"
import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { formatDateTime, formatNumber } from "@/lib/format"
import { formatMealType, formatReviewStatus } from "@/lib/meals/mealFormatting"
import { UtensilsCrossed } from "lucide-react"
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

export function MealHistory({ meals, title = "Meal history", description, enableReviewActions = false }: MealHistoryProps) {
  if (meals.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium text-[var(--foreground)] flex items-center gap-1.5">
          <UtensilsCrossed size={14} />
          {title}
          <span className="ml-2 text-xs font-normal text-[var(--muted)]">
            {meals.length} {meals.length === 1 ? "entry" : "entries"}
          </span>
        </h2>
        {description ? (
          <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
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
            {meals.map((meal) => (
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
                      {meal.duplicateCount && meal.duplicateCount > 1 ? ` · grouped ${meal.duplicateCount} similar logs` : ""}
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
                  {formatNumber(meal.calories)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-right text-[var(--foreground)]">
                  {formatNumber(meal.proteinG)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-right text-[var(--foreground)]">
                  {formatNumber(meal.carbsG)}
                </td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums text-right text-[var(--foreground)]">
                  {formatNumber(meal.fatG)}
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
                        mergeCandidates={meals.filter((candidate) => candidate.id !== meal.id).slice(0, 5)}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
