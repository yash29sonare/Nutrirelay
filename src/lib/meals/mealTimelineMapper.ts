import type { TimelineEntry, TimelineSeverity, TimelineCategory } from "@/types/timeline"
import type { MealRecord } from "@/types/meal"
import { formatMealType } from "./mealFormatting"

function mealSeverity(record: MealRecord): TimelineSeverity {
  switch (record.review.status) {
    case "verified":   return "success"
    case "unverified": return "warning"
    case "pending":    return "info"
    default:           return "info"
  }
}

function mealCategory(record: MealRecord): TimelineCategory {
  return "compliance"
}

function mealIcon(record: MealRecord): string {
  switch (record.review.status) {
    case "verified":   return "checkCircle"
    case "unverified": return "xCircle"
    case "pending":    return "clock"
    default:           return "utensilsCrossed"
  }
}

function buildDescription(record: MealRecord): string {
  const parts: string[] = []
  if (record.calories > 0) parts.push(`${record.calories} kcal`)
  if (record.proteinG > 0) parts.push(`${record.proteinG}g protein`)
  if (record.carbsG > 0) parts.push(`${record.carbsG}g carbs`)
  if (record.fatG > 0) parts.push(`${record.fatG}g fat`)
  if (record.attachment) parts.push("with photo")
  return parts.join(" · ") || "No macro data"
}

export function mapMealRecordToTimelineEntry(record: MealRecord): TimelineEntry {
  const mealType = formatMealType(record.mealType)
  const statusLabel =
    record.review.status === "verified"
      ? "Verified"
      : record.review.status === "unverified"
        ? "Unverified"
        : "Recorded"

  return {
    id: `meal-${record.id}`,
    timestamp: record.mealTimestamp,
    clientId: record.clientId,
    eventType: `MEAL_${record.review.status.toUpperCase()}`,
    title: `${mealType} — ${statusLabel}`,
    description: buildDescription(record),
    icon: mealIcon(record),
    severity: mealSeverity(record),
    source: "food_log",
    category: mealCategory(record),
    metadata: {
      mealId: record.id,
      calories: record.calories,
      proteinG: record.proteinG,
      carbsG: record.carbsG,
      fatG: record.fatG,
      reviewStatus: record.review.status,
      hasAttachment: !!record.attachment,
    },
  }
}

export function mapMealRecordsToTimelineEntries(records: MealRecord[]): TimelineEntry[] {
  return records.map(mapMealRecordToTimelineEntry)
}
