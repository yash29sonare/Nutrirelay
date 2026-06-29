import type { MealRecord } from "@/types/meal"
import type { MealAIResult, DetectedFood, ConfidenceScore, MissingInformation, AIClientQuestion, NutritionObservation, ConfidenceLevel } from "@/types/meal-ai"
import { runAI } from "@/ai/aiGateway"

function buildMealContext(meal: MealRecord): string {
  const lines: string[] = [
    `Meal type: ${meal.mealType}`,
    `Calories: ${meal.calories} kcal`,
    `Protein: ${meal.proteinG}g`,
    `Carbs: ${meal.carbsG}g`,
    `Fat: ${meal.fatG}g`,
    `Review status: ${meal.review.status}`,
  ]
  if (meal.notes) lines.push(`Client notes: ${meal.notes}`)
  if (meal.attachment) lines.push(`Has photo evidence: yes`)
  return lines.join("\n")
}

const SYSTEM_PROMPT = `You are a nutrition AI analyzing a meal record. Given the meal's macro data and any notes, produce a structured JSON analysis.

Return ONLY valid JSON with no markdown formatting, no code fences, no explanation.

Schema:
{
  "detectedFoods": [
    {
      "name": "likely food name",
      "estimatedPortion": "estimated portion description",
      "confidence": "high|medium|low",
      "alternativeMatches": ["alternative1", "alternative2"]
    }
  ],
  "confidence": {
    "overall": "high|medium|low",
    "macos": "high|medium|low",
    "foodDetection": "high|medium|low"
  },
  "missingInformation": [
    {
      "field": "field name",
      "description": "what is missing"
    }
  ],
  "questions": [
    {
      "question": "clarifying question",
      "reason": "why this question is needed"
    }
  ],
  "observations": [
    {
      "category": "observation category",
      "observation": "observation text",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "one-sentence summary of the meal analysis"
}`

function parseMealAIResult(mealId: string, text: string): MealAIResult {
  try {
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim()
    const parsed = JSON.parse(cleaned)

    return {
      mealId,
      detectedFoods: Array.isArray(parsed.detectedFoods)
        ? parsed.detectedFoods.map((f: Record<string, unknown>) => ({
            name: String(f.name ?? "Unknown food"),
            estimatedPortion: String(f.estimatedPortion ?? "Standard serving"),
            confidence: parseConfidence(f.confidence),
            alternativeMatches: Array.isArray(f.alternativeMatches)
              ? f.alternativeMatches.map(String)
              : undefined,
          }))
        : [],
      confidence: {
        overall: parseConfidence(parsed.confidence?.overall),
        macos: parseConfidence(parsed.confidence?.macos),
        foodDetection: parseConfidence(parsed.confidence?.foodDetection),
      },
      missingInformation: Array.isArray(parsed.missingInformation)
        ? parsed.missingInformation.map((m: Record<string, unknown>) => ({
            field: String(m.field ?? ""),
            description: String(m.description ?? ""),
          }))
        : [],
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.map((q: Record<string, unknown>) => ({
            question: String(q.question ?? ""),
            reason: String(q.reason ?? ""),
          }))
        : [],
      observations: Array.isArray(parsed.observations)
        ? parsed.observations.map((o: Record<string, unknown>) => ({
            category: String(o.category ?? ""),
            observation: String(o.observation ?? ""),
            confidence: parseConfidence(o.confidence),
          }))
        : [],
      summary: String(parsed.summary ?? "Meal analysis completed."),
    }
  } catch {
    return fallbackResult(mealId)
  }
}

function parseConfidence(value: unknown): ConfidenceLevel {
  if (value === "high" || value === "medium" || value === "low") return value
  return "medium"
}

function fallbackResult(mealId: string): MealAIResult {
  return {
    mealId,
    detectedFoods: [],
    confidence: { overall: "low", macos: "low", foodDetection: "low" },
    missingInformation: [],
    questions: [],
    observations: [],
    summary: "Unable to analyze meal.",
  }
}

export async function analyzeMeal(meal: MealRecord): Promise<MealAIResult> {
  const context = buildMealContext(meal)

  const response = await runAI({
    system: SYSTEM_PROMPT,
    prompt: `Analyze this meal record:\n\n${context}`,
    feature: "meal-logging",
    workflow: "mealUnderstanding",
  })

  return parseMealAIResult(meal.id, response.text)
}

export async function analyzeMeals(meals: MealRecord[]): Promise<MealAIResult[]> {
  return Promise.all(meals.map(analyzeMeal))
}
