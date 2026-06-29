import type { MealRecord } from "@/types/meal"
import { Badge } from "@/components/ui/Badge"
import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { formatDateTime, formatNumber } from "@/lib/format"
import { formatMealType, formatReviewStatus } from "@/lib/meals/mealFormatting"
import { UtensilsCrossed } from "lucide-react"

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
  meals: MealRecord[]
}

export function MealHistory({ meals }: MealHistoryProps) {
  if (meals.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium text-[var(--foreground)] flex items-center gap-1.5">
          <UtensilsCrossed size={14} />
          Meal history
          <span className="ml-2 text-xs font-normal text-[var(--muted)]">
            {meals.length} {meals.length === 1 ? "entry" : "entries"}
          </span>
        </h2>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--surface-border)]">
              <th className="px-5 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap">
                Type
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
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border)]">
            {meals.map((meal) => (
              <tr
                key={meal.id}
                className="hover:bg-[var(--surface-overlay)] transition-colors duration-100"
              >
                <td className="px-5 py-3 whitespace-nowrap">
                  <span className="font-medium text-[var(--foreground)]">
                    {formatMealType(meal.mealType)}
                  </span>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
