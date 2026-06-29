import { NextRequest, NextResponse } from "next/server"
import { getPendingPhotos, verifyPhoto, rejectPhoto } from "@/lib/operations/photo-verification"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const trainerId = await requireTrainer()
    const photos = await getPendingPhotos(trainerId)
    return NextResponse.json({ ok: true, photos })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, food_log_id, reason } = body

  if (!food_log_id || !action) {
    return NextResponse.json({ error: "food_log_id and action required" }, { status: 400 })
  }

  try {
    const trainerId = await requireTrainer()
    let result
    switch (action) {
      case "verify":
        result = await verifyPhoto(food_log_id, trainerId)
        break
      case "reject":
        result = await rejectPhoto(food_log_id, trainerId, reason)
        break
      default:
        return NextResponse.json({ error: `Invalid action. Valid: verify, reject` }, { status: 400 })
    }
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
