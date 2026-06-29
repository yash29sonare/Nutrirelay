import { createClient } from "@supabase/supabase-js"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface ClientContext {
  client_id: string
  trainer_id: string
  full_name: string | null
  phone_number: string | null

  goal: {
    goal_type: string | null
    target_weight: number | null
    current_weight: number | null
    starting_weight: number | null
    target_date: string | null
    weekly_target_rate: number | null
  }

  health: {
    age: number | null
    gender: string | null
    height_cm: number | null
    weight_kg: number | null
    diet_type: string | null
    allergies: string[]
    food_restrictions: string[]
    medical_notes: string | null
  }

  preferences: {
    preferred_language: string
    accept_voice_notes: boolean
    accept_polls: boolean
    accept_images: boolean
    quiet_hours_start: string | null
    quiet_hours_end: string | null
    timezone: string
  }

  workout: {
    timezone: string
    workout_time: string | null
    preferred_checkin_time: string | null
    rest_days: string[]
  }

  compliance: {
    compliance_score: number | null
    risk_score: number | null
    status_color: string
    calculated_at: string | null
  }

  recent_meals: Array<{
    logged_at: string
    calories: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
    verification_status: string
  }>

  recent_voice_notes: Array<{
    created_at: string
    processing_status: string
    transcript: string | null
  }>
}

export async function buildClientContext(clientId: string): Promise<ClientContext | null> {
  const db = getDb()

  const { data: tc } = await db
    .from("trainer_clients")
    .select("trainer_id")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .limit(1)
    .single()

  if (!tc) return null
  const trainerId = (tc as { trainer_id: string }).trainer_id

  const [profileRes, goalRes, healthRes, prefRes, workoutRes, complianceRes, mealsRes, voiceRes] =
    await Promise.all([
      db.from("profiles").select("full_name, phone_number").eq("id", clientId).single(),
      db.from("client_goals").select("*").eq("client_id", clientId).eq("goal_status", "ACTIVE").limit(1).maybeSingle(),
      db.from("client_health_profiles").select("*").eq("client_id", clientId).limit(1).maybeSingle(),
      db.from("client_preferences").select("*").eq("client_id", clientId).limit(1).maybeSingle(),
      db.from("client_workout_schedules").select("*").eq("client_id", clientId).limit(1).maybeSingle(),
      db.from("client_compliance_snapshots").select("*").eq("client_id", clientId).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("food_logs").select("logged_at, calories, protein_g, carbs_g, fat_g, verification_status").eq("client_id", clientId).order("logged_at", { ascending: false }).limit(5),
      db.from("voice_notes").select("created_at, processing_status, transcript").eq("client_id", clientId).order("created_at", { ascending: false }).limit(3),
    ])

  const profile = profileRes.data as { full_name: string | null; phone_number: string | null } | null
  const goal = goalRes.data as Record<string, any> | null
  const health = healthRes.data as Record<string, any> | null
  const pref = prefRes.data as Record<string, any> | null
  const workout = workoutRes.data as Record<string, any> | null
  const compliance = complianceRes.data as Record<string, any> | null
  const meals = (mealsRes.data ?? []) as Array<Record<string, any>>
  const voiceNotes = (voiceRes.data ?? []) as Array<Record<string, any>>

  return {
    client_id: clientId,
    trainer_id: trainerId,
    full_name: profile?.full_name ?? null,
    phone_number: profile?.phone_number ?? null,

    goal: {
      goal_type: goal?.goal_type ?? null,
      target_weight: goal?.target_weight ?? null,
      current_weight: goal?.current_weight ?? null,
      starting_weight: goal?.starting_weight ?? null,
      target_date: goal?.target_date ?? null,
      weekly_target_rate: goal?.weekly_target_rate ?? null,
    },

    health: {
      age: health?.age ?? null,
      gender: health?.gender ?? null,
      height_cm: health?.height_cm ?? null,
      weight_kg: health?.weight_kg ?? null,
      diet_type: health?.diet_type ?? null,
      allergies: health?.allergies ?? [],
      food_restrictions: health?.food_restrictions ?? [],
      medical_notes: health?.medical_notes ?? null,
    },

    preferences: {
      preferred_language: pref?.preferred_language ?? "en",
      accept_voice_notes: pref?.accept_voice_notes ?? true,
      accept_polls: pref?.accept_polls ?? true,
      accept_images: pref?.accept_images ?? true,
      quiet_hours_start: pref?.quiet_hours_start ?? null,
      quiet_hours_end: pref?.quiet_hours_end ?? null,
      timezone: pref?.timezone ?? "UTC",
    },

    workout: {
      timezone: workout?.timezone ?? "UTC",
      workout_time: workout?.workout_time ?? null,
      preferred_checkin_time: workout?.preferred_checkin_time ?? null,
      rest_days: workout?.rest_days ?? [],
    },

    compliance: {
      compliance_score: compliance?.compliance_score ?? null,
      risk_score: compliance?.risk_score ?? null,
      status_color: compliance?.status_color ?? "GREEN",
      calculated_at: compliance?.calculated_at ?? null,
    },

    recent_meals: meals.map((m) => ({
      logged_at: m.logged_at,
      calories: m.calories,
      protein_g: m.protein_g,
      carbs_g: m.carbs_g,
      fat_g: m.fat_g,
      verification_status: m.verification_status,
    })),

    recent_voice_notes: voiceNotes.map((v) => ({
      created_at: v.created_at,
      processing_status: v.processing_status,
      transcript: v.transcript,
    })),
  }
}
