import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function requireTrainer(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) throw new Error("Unauthorized — no active session")
  return user.id
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
