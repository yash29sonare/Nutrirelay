import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/shared/types/supabase"

type ServiceDb = ReturnType<typeof getDb>

function getDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export class EntitlementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EntitlementError"
  }
}

async function resolvePlanId(db: ServiceDb, trainerId: string): Promise<string> {
  const { data: tsRow } = await db
    .from("trainer_subscriptions")
    .select("plan_id")
    .eq("trainer_id", trainerId)
    .in("status", ["active", "grace_period"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (tsRow) return tsRow.plan_id

  const { data: trainer } = await db
    .from("trainers")
    .select("subscription_plan")
    .eq("auth_user_id", trainerId)
    .single()

  return (trainer?.subscription_plan ?? "STARTER") as string
}

async function getPlan(db: ServiceDb, planId: string) {
  const { data } = await db
    .from("plans")
    .select("max_clients, feature_flags")
    .eq("plan_id", planId)
    .single()

  return data ?? null
}

export async function checkClientLimit(trainerId: string): Promise<void> {
  const db = getDb()

  const planId = await resolvePlanId(db, trainerId)
  const plan = await getPlan(db, planId)
  if (!plan) throw new EntitlementError("Plan not found")

  const maxClients = plan.max_clients
  if (maxClients <= 0) return

  const { count } = await db
    .from("client_lifecycle")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", trainerId)
    .in("status", ["ACTIVE", "INVITED"])

  if ((count ?? 0) >= maxClients) {
    throw new EntitlementError(`Client limit reached (${maxClients}). Upgrade your plan to add more clients.`)
  }
}

export async function checkFeatureAccess(
  trainerId: string,
  featureKey: string,
): Promise<boolean> {
  const db = getDb()

  const planId = await resolvePlanId(db, trainerId)
  const plan = await getPlan(db, planId)
  if (!plan) return true

  const flags = plan.feature_flags as Record<string, boolean> | null
  return flags?.[featureKey] ?? false
}
