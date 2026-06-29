import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/shared/types/supabase"

type ServiceDb = ReturnType<typeof createServiceDb>

export function createServiceDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function verifyClientOwnership(
  db: ServiceDb,
  clientId: string,
  trainerId: string,
): Promise<boolean> {
  const { data } = await db
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", trainerId)
    .eq("client_id", clientId)
    .limit(1)
    .maybeSingle()
  return !!data
}
