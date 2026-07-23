import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "./audit"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface TrainerProfile {
  trainer_id: string
  auth_user_id: string
  onboarding_status: string
  subscription_plan: string
  subscription_status: string
  max_clients: number
  business_name: string | null
  timezone: string | null
  country: string | null
  coaching_style: string | null
  experience_years: string | null
  specialties: string[]
  languages: string[]
  default_availability: string | null
  expected_client_count: string | null
  coaching_goals: string | null
  created_at: string
  updated_at: string
}

export interface OnboardingDataInput {
  businessName: string
  timezone: string
  country: string
}

export async function getTrainerProfile(authUserId: string): Promise<TrainerProfile | null> {
  const db = getDb()

  const { data } = await db
    .from("trainers")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  if (!data) return null

  const row = data as Record<string, unknown>

  return {
    trainer_id: row.trainer_id as string,
    auth_user_id: row.auth_user_id as string,
    onboarding_status: row.onboarding_status as string,
    subscription_plan: row.subscription_plan as string,
    subscription_status: row.subscription_status as string,
    max_clients: row.max_clients as number,
    business_name: (row.business_name as string) ?? null,
    timezone: (row.timezone as string) ?? null,
    country: (row.country as string) ?? null,
    coaching_style: (row.coaching_style as string) ?? null,
    experience_years: (row.experience_years as string) ?? null,
    specialties: JSON.parse(JSON.stringify(row.specialties ?? [])),
    languages: JSON.parse(JSON.stringify(row.languages ?? [])),
    default_availability: (row.default_availability as string) ?? null,
    expected_client_count: (row.expected_client_count as string) ?? null,
    coaching_goals: (row.coaching_goals as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export type TrainerReadiness =
  | { exists: true; status: 'active' | 'invited' | 'onboarding' }
  | { exists: false; status: 'missing' }

export async function checkTrainerReady(authUserId: string): Promise<TrainerReadiness> {
  const db = getDb()

  const { data, error } = await db
    .from("trainers")
    .select("onboarding_status")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  if (error || !data) {
    return { exists: false, status: 'missing' }
  }

  return { exists: true, status: data.onboarding_status as 'active' | 'invited' | 'onboarding' }
}

export async function ensureTrainerRow(authUserId: string, displayName?: string): Promise<void> {
  const db = getDb()

  // 1. Ensure the profile exists with role='trainer'
  const { error: profileError } = await db
    .from("profiles")
    .upsert({
      id: authUserId,
      role: "trainer",
      full_name: displayName ?? null,
    }, { onConflict: "id" })

  if (profileError) {
    throw new Error(`Failed to ensure trainer profile: ${profileError.message}`)
  }

  // 2. Ensure the trainers row exists
  const { error: trainerError } = await db
    .from("trainers")
    .upsert({
      auth_user_id: authUserId,
      onboarding_status: "invited",
    }, { onConflict: "auth_user_id" })

  if (trainerError) {
    throw new Error(`Failed to ensure trainer row: ${trainerError.message}`)
  }
}

export async function requireTrainerRow(authUserId: string): Promise<TrainerProfile> {
  const profile = await getTrainerProfile(authUserId)
  if (!profile) {
    throw new Error(
      "Trainer profile not found. The database trigger should have created the trainers row during registration. Contact support."
    )
  }
  return profile
}

export async function saveOnboardingData(authUserId: string, input: OnboardingDataInput): Promise<void> {
  const db = getDb()

  await requireTrainerRow(authUserId)

  const { error } = await db
    .from("trainers")
    .update({
      business_name: input.businessName,
      timezone: input.timezone,
      country: input.country,
    })
    .eq("auth_user_id", authUserId)

  if (error) {
    throw new Error(`Failed to save onboarding data: ${error.message}`)
  }
}

export async function completeOnboarding(authUserId: string): Promise<void> {
  const db = getDb()

  await requireTrainerRow(authUserId)

  const { error } = await db
    .from("trainers")
    .update({
      onboarding_status: "active",
    })
    .eq("auth_user_id", authUserId)

  if (error) {
    throw new Error(`Failed to complete onboarding: ${error.message}`)
  }

  try {
    await writeAuditLog({
      trainer_id: authUserId,
      actor_id: authUserId,
      event_type: "onboarding_complete",
      entity_type: "trainers",
      entity_id: authUserId,
      metadata: { onboarding_status: "active" },
    })
  } catch {
    console.error("[trainer] audit log write failed (non-fatal):", authUserId)
  }
}
