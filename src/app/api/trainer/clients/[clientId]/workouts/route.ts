import { NextRequest, NextResponse } from "next/server"
import { createWorkoutSchedule, updateWorkoutSchedule, pauseWorkoutSchedule, deleteWorkoutSchedule } from "@/lib/operations/workout-management"
import { requireTrainer, unauthorized } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const clientId = (await params).clientId
  const body = await req.json()

  try {
    const trainerId = await requireTrainer()

    if (body.action === "update") {
      const schedule = await updateWorkoutSchedule(body.schedule_id, trainerId, body.updates)
      return NextResponse.json({ ok: true, schedule })
    }
    if (body.action === "pause") {
      await pauseWorkoutSchedule(body.schedule_id, trainerId)
      return NextResponse.json({ ok: true, action: "paused" })
    }
    if (body.action === "delete") {
      await deleteWorkoutSchedule(body.schedule_id, trainerId)
      return NextResponse.json({ ok: true, action: "deleted" })
    }

    const schedule = await createWorkoutSchedule({
      client_id: clientId,
      trainer_id: trainerId,
      timezone: body.timezone,
      workout_time: body.workout_time,
      preferred_checkin_time: body.preferred_checkin_time,
      rest_days: body.rest_days,
    })
    return NextResponse.json({ ok: true, schedule })
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized — no active session") {
      return unauthorized()
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
