import { NextRequest, NextResponse } from "next/server"
import { createGoal, updateGoal, archiveGoal, getActiveGoal } from "@/lib/operations/goal-management"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = (await params).clientId

  try {
    const trainerId = await requireTrainer()
    const goal = await getActiveGoal(clientId, trainerId)
    return NextResponse.json({ ok: true, goal })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = (await params).clientId
  const body = await req.json()

  try {
    const trainerId = await requireTrainer()

    if (body.action === "archive") {
      await archiveGoal(body.goal_id, trainerId)
      return NextResponse.json({ ok: true, action: "archived" })
    }

    if (body.action === "update") {
      const goal = await updateGoal({
        goal_id: body.goal_id,
        trainer_id: trainerId,
        ...body.updates,
      })
      return NextResponse.json({ ok: true, goal })
    }

    const goal = await createGoal({
      client_id: clientId,
      trainer_id: trainerId,
      goal_type: body.goal_type,
      target_weight: body.target_weight,
      starting_weight: body.starting_weight,
      current_weight: body.current_weight,
      target_date: body.target_date,
      weekly_target_rate: body.weekly_target_rate,
    })
    return NextResponse.json({ ok: true, goal })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
