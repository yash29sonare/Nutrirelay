import { NextRequest, NextResponse } from "next/server"
import { requireTrainerContext, unauthorized } from "@/lib/api-auth"
import { updateMealReviewWorkflow } from "@/lib/meals/mealOperations"
import type { MealReviewReason, MealReviewState, NutritionConfidence } from "@/types/meal"

export const dynamic = "force-dynamic"

const REVIEW_STATES: MealReviewState[] = ["auto_logged", "needs_review", "reviewed", "corrected", "rejected", "merged"]
const CONFIDENCE: NutritionConfidence[] = ["high", "medium", "low"]
const REASONS: MealReviewReason[] = [
  "unclear_quantity",
  "unknown_food",
  "image_only",
  "conflicting_input",
  "duplicate_possible",
  "low_confidence_ai",
  "client_correction",
  "trainer_requested",
]

function optionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error("Invalid numeric value")
  return parsed
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ mealId: string }> }) {
  const mealId = (await params).mealId

  try {
    const { authUserId } = await requireTrainerContext()
    const body = await req.json()

    const reviewState = body.reviewState as MealReviewState | undefined
    const aiConfidence = body.aiConfidence as NutritionConfidence | undefined
    const reviewReason = body.reviewReason as MealReviewReason | null | undefined

    if (reviewState !== undefined && !REVIEW_STATES.includes(reviewState)) {
      return NextResponse.json({ error: "Invalid reviewState" }, { status: 400 })
    }
    if (aiConfidence !== undefined && !CONFIDENCE.includes(aiConfidence)) {
      return NextResponse.json({ error: "Invalid aiConfidence" }, { status: 400 })
    }
    if (reviewReason !== undefined && reviewReason !== null && !REASONS.includes(reviewReason)) {
      return NextResponse.json({ error: "Invalid reviewReason" }, { status: 400 })
    }

    const meal = await updateMealReviewWorkflow(mealId, authUserId, {
      reviewState,
      aiConfidence,
      reviewReason,
      trainerNote: typeof body.trainerNote === "string" ? body.trainerNote : undefined,
      foodText: typeof body.foodText === "string" ? body.foodText : undefined,
      calories: optionalNumber(body.calories),
      proteinG: optionalNumber(body.proteinG),
      carbsG: optionalNumber(body.carbsG),
      fatG: optionalNumber(body.fatG),
      mergedIntoId: typeof body.mergedIntoId === "string" ? body.mergedIntoId : undefined,
    })

    return NextResponse.json({ ok: true, meal })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to update nutrition review" }, { status: 400 })
  }
}
