import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { getTrainerProfile } from "@/lib/operations/trainer"

export interface TrainerContext {
  authUserId: string
  trainerId: string
}

export async function requireTrainerContext(): Promise<TrainerContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) throw new Error("Unauthorized — no active session")

  const trainer = await getTrainerProfile(user.id)
  if (!trainer?.trainer_id) {
    throw new Error("Trainer profile not found")
  }

  return {
    authUserId: user.id,
    trainerId: trainer.trainer_id,
  }
}

export async function requireTrainer(): Promise<string> {
  const trainer = await requireTrainerContext()
  return trainer.trainerId
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
