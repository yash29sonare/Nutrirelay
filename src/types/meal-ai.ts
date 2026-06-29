export type ConfidenceLevel = "high" | "medium" | "low"

export interface DetectedFood {
  name: string
  estimatedPortion: string
  confidence: ConfidenceLevel
  alternativeMatches?: string[]
}

export interface ConfidenceScore {
  overall: ConfidenceLevel
  macos: ConfidenceLevel
  foodDetection: ConfidenceLevel
}

export interface MissingInformation {
  field: string
  description: string
}

export interface AIClientQuestion {
  question: string
  reason: string
}

export interface NutritionObservation {
  category: string
  observation: string
  confidence: ConfidenceLevel
}

export interface MealAIResult {
  mealId: string
  detectedFoods: DetectedFood[]
  confidence: ConfidenceScore
  missingInformation: MissingInformation[]
  questions: AIClientQuestion[]
  observations: NutritionObservation[]
  summary: string
}
