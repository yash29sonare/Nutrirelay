import type { MealRecord, MealStatus, MealType } from "@/types/meal"
import { formatNumber } from "@/lib/format"

export function formatCalories(calories: number): string {
  return `${formatNumber(calories)} kcal`
}

export function formatProtein(grams: number): string {
  return `${formatNumber(grams)}g protein`
}

export function formatMacroSummary(record: MealRecord): string {
  const parts: string[] = []
  if (record.calories > 0) parts.push(`${formatNumber(record.calories)} kcal`)
  if (record.proteinG > 0) parts.push(`${formatNumber(record.proteinG)}g protein`)
  return parts.join(" · ") || "No macro data"
}

export function formatMealType(type: MealType): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function formatReviewStatus(status: MealStatus): string {
  switch (status) {
    case "recorded":   return "Recorded"
    case "verified":   return "Verified"
    case "unverified": return "Unverified"
    case "pending":    return "Pending review"
  }
}

export function formatMealSummary(record: MealRecord): string {
  const mealType = formatMealType(record.mealType)
  const macros = formatMacroSummary(record)
  return `${mealType} — ${macros}`
}
