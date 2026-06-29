import type { MealType } from "@/types/meal"

const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"]

export interface ValidationError {
  field: string
  message: string
}

export function validateMealType(value: string): ValidationError | null {
  if (!VALID_MEAL_TYPES.includes(value as MealType)) {
    return {
      field: "mealType",
      message: `Invalid meal type. Must be one of: ${VALID_MEAL_TYPES.join(", ")}`,
    }
  }
  return null
}

export function validateMacros(value: number | undefined | null, field: string): ValidationError | null {
  if (value === undefined || value === null) return null
  if (!Number.isFinite(value) || value < 0) {
    return { field, message: `${field} must be a non-negative number` }
  }
  if (value > 10000) {
    return { field, message: `${field} exceeds maximum value (10000)` }
  }
  return null
}

export function validateMealRecord(input: {
  mealType: string
  calories?: number | null
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
}): ValidationError[] {
  const errors: ValidationError[] = []

  const typeErr = validateMealType(input.mealType)
  if (typeErr) errors.push(typeErr)

  const calErr = validateMacros(input.calories, "calories")
  if (calErr) errors.push(calErr)

  const protErr = validateMacros(input.proteinG, "proteinG")
  if (protErr) errors.push(protErr)

  const carbErr = validateMacros(input.carbsG, "carbsG")
  if (carbErr) errors.push(carbErr)

  const fatErr = validateMacros(input.fatG, "fatG")
  if (fatErr) errors.push(fatErr)

  return errors
}

export function isValidReviewStatus(status: string): boolean {
  return ["recorded", "verified", "unverified", "pending"].includes(status)
}
