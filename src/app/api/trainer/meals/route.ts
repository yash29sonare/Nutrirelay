import { NextRequest, NextResponse } from "next/server"
import { approveMeal, rejectMeal, editMeal, markVerified, markUnverified } from "@/lib/operations/meal-review"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, food_log_id, reason, edits } = body

  if (!food_log_id || !action) {
    return NextResponse.json({ error: "food_log_id and action required" }, { status: 400 })
  }

  try {
    const trainerId = await requireTrainer()
    let result
    switch (action) {
      case "approve":
        result = await approveMeal(food_log_id, trainerId)
        break
      case "reject":
        result = await rejectMeal(food_log_id, trainerId, reason)
        break
      case "edit":
        result = await editMeal({ food_log_id, trainer_id: trainerId, ...edits })
        break
      case "mark_verified":
        result = await markVerified(food_log_id, trainerId)
        break
      case "mark_unverified":
        result = await markUnverified(food_log_id, trainerId, reason)
        break
      default:
        return NextResponse.json({ error: "Invalid action. Valid: approve, reject, edit, mark_verified, mark_unverified" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
