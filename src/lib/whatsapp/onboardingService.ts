import { createClient } from "@supabase/supabase-js"
import { sendMessage } from "@/lib/whatsapp/send"
import {
  advanceOnboardingState,
  buildRoutineTimingFromSchedule,
  getOnboardingQuestion,
  type ClientOnboardingStateRow,
  type ClientOnboardingStatus,
  type ClientOnboardingStep,
} from "@/lib/whatsapp/onboardingStateMachine"

const ONBOARDING_TEMPLATE_FALLBACK_PARAMS = ["there", "your trainer", "NutriRelay"] satisfies [string, string, string]

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

interface OnboardingStateDbRow {
  id: string
  client_id: string
  trainer_id: string
  onboarding_status: ClientOnboardingStatus
  current_step: ClientOnboardingStep
  collected_data: Record<string, unknown> | null
  last_question_sent_at: string | null
  last_answer_received_at: string | null
  completed_at: string | null
}

export interface OnboardingHandleResult {
  handled: boolean
  completed: boolean
}

export async function getClientOnboardingState(clientId: string, trainerId: string): Promise<OnboardingStateDbRow | null> {
  const db = getDb()
  const { data } = await db
    .from("client_onboarding_states")
    .select("*")
    .eq("client_id", clientId)
    .eq("trainer_id", trainerId)
    .limit(1)
    .maybeSingle()

  return (data as OnboardingStateDbRow | null) ?? null
}

async function upsertOnboardingState(input: {
  clientId: string
  trainerId: string
  onboardingStatus: ClientOnboardingStatus
  currentStep: ClientOnboardingStep
  collectedData?: Record<string, unknown> | null
  lastQuestionSentAt?: string | null
  lastAnswerReceivedAt?: string | null
  completedAt?: string | null
}): Promise<void> {
  const db = getDb()
  await db.from("client_onboarding_states").upsert({
    client_id: input.clientId,
    trainer_id: input.trainerId,
    onboarding_status: input.onboardingStatus,
    current_step: input.currentStep,
    collected_data: input.collectedData ?? {},
    last_question_sent_at: input.lastQuestionSentAt ?? null,
    last_answer_received_at: input.lastAnswerReceivedAt ?? null,
    completed_at: input.completedAt ?? null,
  }, { onConflict: "client_id" })
}

async function ensureHealthProfile(clientId: string, patch: Record<string, unknown>): Promise<void> {
  const db = getDb()
  const { data: existing } = await db
    .from("client_health_profiles")
    .select("*")
    .eq("client_id", clientId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    await db.from("client_health_profiles").update({
      ...patch,
      updated_at: new Date().toISOString(),
    }).eq("client_id", clientId)
    return
  }

  await db.from("client_health_profiles").insert({
    client_id: clientId,
    ...patch,
  })
}

async function ensureWorkoutSchedule(clientId: string, patch: Record<string, unknown>): Promise<void> {
  const db = getDb()
  const { data: existing } = await db
    .from("client_workout_schedules")
    .select("id")
    .eq("client_id", clientId)
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    await db.from("client_workout_schedules").update({
      ...patch,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id)
    return
  }

  await db.from("client_workout_schedules").insert({
    client_id: clientId,
    timezone: "Asia/Kolkata",
    ...patch,
  })
}

async function ensureGoal(clientId: string, trainerId: string, patch: Record<string, unknown>): Promise<void> {
  const db = getDb()
  const { data: existing } = await db
    .from("client_goals")
    .select("*")
    .eq("client_id", clientId)
    .eq("goal_status", "ACTIVE")
    .limit(1)
    .maybeSingle()

  if (existing) {
    await db.from("client_goals").update({
      ...patch,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id)
    return
  }

  await db.from("client_goals").insert({
    client_id: clientId,
    trainer_id: trainerId,
    goal_status: "ACTIVE",
    ...patch,
  })
}

async function applyCollectedAnswer(input: {
  clientId: string
  trainerId: string
  currentStep: ClientOnboardingStep
  value: Record<string, unknown>
  collectedData: Record<string, unknown>
}): Promise<void> {
  const merged = { ...input.collectedData, ...input.value }

  switch (input.currentStep) {
    case "height":
      await ensureHealthProfile(input.clientId, { height_cm: merged.height_cm })
      break
    case "weight":
      await ensureHealthProfile(input.clientId, { weight_kg: merged.weight_kg })
      await ensureGoal(input.clientId, input.trainerId, {
        current_weight: merged.weight_kg,
        starting_weight: merged.weight_kg,
      })
      break
    case "goal":
      await ensureGoal(input.clientId, input.trainerId, { goal_type: merged.goal_type })
      break
    case "target_weight":
      await ensureGoal(input.clientId, input.trainerId, {
        target_weight: merged.target_weight ?? null,
      })
      break
    case "allergies":
      await ensureHealthProfile(input.clientId, { allergies: merged.allergies ?? [] })
      break
    case "food_preferences":
      await ensureHealthProfile(input.clientId, {
        diet_type: merged.diet_type ?? null,
        food_restrictions: merged.disliked_foods ?? [],
      })
      break
    case "routine_times": {
      const routine = merged.routine_times as Record<string, unknown> | undefined
      await ensureWorkoutSchedule(input.clientId, {
        breakfast_time: routine?.breakfast ?? null,
        lunch_time: routine?.lunch ?? null,
        snack_time: routine?.snack ?? null,
        dinner_time: routine?.dinner ?? null,
      })
      break
    }
    case "workout_schedule": {
      const schedule = merged.workout_schedule as Record<string, unknown> | undefined
      await ensureWorkoutSchedule(input.clientId, {
        workout_time: schedule?.workoutTime ?? null,
        rest_days: schedule?.restDays ?? [],
        workout_days: schedule?.workoutDays ?? [],
        post_workout_delay_minutes: schedule?.postWorkoutDelayMinutes ?? null,
      })
      break
    }
    case "checkin_preference":
      await ensureWorkoutSchedule(input.clientId, {
        checkin_preference: merged.checkin_preference ?? null,
        preferred_checkin_time: merged.preferred_checkin_time ?? null,
      })
      break
    case "complete":
      break
  }
}

export async function startClientOnboarding(input: {
  clientId: string
  trainerId: string
  clientPhone: string | null
}): Promise<void> {
  await upsertOnboardingState({
    clientId: input.clientId,
    trainerId: input.trainerId,
    onboardingStatus: "in_progress",
    currentStep: "height",
    collectedData: {},
  })

  if (!input.clientPhone) return

  try {
    await sendMessage(
      input.trainerId,
      input.clientPhone,
      getOnboardingQuestion("height"),
      "nutrirelay_client_onboarding",
      ONBOARDING_TEMPLATE_FALLBACK_PARAMS,
    )

    await upsertOnboardingState({
      clientId: input.clientId,
      trainerId: input.trainerId,
      onboardingStatus: "in_progress",
      currentStep: "height",
      collectedData: {},
      lastQuestionSentAt: new Date().toISOString(),
    })
  } catch {
    await upsertOnboardingState({
      clientId: input.clientId,
      trainerId: input.trainerId,
      onboardingStatus: "paused",
      currentStep: "height",
      collectedData: {},
    })
  }
}

export async function handleClientOnboardingAnswer(input: {
  clientId: string
  trainerId: string
  clientPhone: string
  answerText: string
  receivedAt?: string
}): Promise<OnboardingHandleResult> {
  const state = await getClientOnboardingState(input.clientId, input.trainerId)
  if (!state || state.onboarding_status === "completed") {
    return { handled: false, completed: false }
  }

  const stateForAdvance: ClientOnboardingStateRow = {
    onboarding_status: state.onboarding_status,
    current_step: state.current_step,
    collected_data: state.collected_data,
  }

  const result = advanceOnboardingState(stateForAdvance, input.answerText)
  const collectedData = {
    ...(state.collected_data ?? {}),
    ...(result.updates?.value ?? {}),
  }

  if (!result.ok) {
    await upsertOnboardingState({
      clientId: input.clientId,
      trainerId: input.trainerId,
      onboardingStatus: "in_progress",
      currentStep: state.current_step,
      collectedData,
      lastAnswerReceivedAt: input.receivedAt ?? new Date().toISOString(),
      lastQuestionSentAt: new Date().toISOString(),
    })
    try {
      await sendMessage(
        input.trainerId,
        input.clientPhone,
        result.clarificationMessage ?? getOnboardingQuestion(state.current_step),
        "nutrirelay_client_onboarding",
        ONBOARDING_TEMPLATE_FALLBACK_PARAMS,
      )
    } catch {
      // Keep stored onboarding state even if the follow-up send fails.
    }
    return { handled: true, completed: false }
  }

  if (result.updates) {
    await applyCollectedAnswer({
      clientId: input.clientId,
      trainerId: input.trainerId,
      currentStep: state.current_step,
      value: result.updates.value,
      collectedData,
    })
  }

  const completed = result.nextStep === "complete"
  await upsertOnboardingState({
    clientId: input.clientId,
    trainerId: input.trainerId,
    onboardingStatus: completed ? "completed" : "in_progress",
    currentStep: result.nextStep,
    collectedData,
    lastAnswerReceivedAt: input.receivedAt ?? new Date().toISOString(),
    lastQuestionSentAt: completed ? state.last_question_sent_at : new Date().toISOString(),
    completedAt: completed ? new Date().toISOString() : null,
  })

  if (completed) {
    const db = getDb()
    await db.from("client_lifecycle").update({
      status: "ACTIVE",
      updated_at: new Date().toISOString(),
    })
      .eq("client_id", input.clientId)
      .eq("trainer_id", input.trainerId)
  }

  try {
    await sendMessage(
      input.trainerId,
      input.clientPhone,
      completed ? (result.completionMessage ?? getOnboardingQuestion("complete")) : getOnboardingQuestion(result.nextStep),
      "nutrirelay_client_onboarding",
      ONBOARDING_TEMPLATE_FALLBACK_PARAMS,
    )
  } catch {
    // Keep stored onboarding state even if the follow-up send fails.
  }

  return { handled: true, completed }
}

export function buildRoutineTimingForScheduler(
  schedule: Record<string, unknown> | null | undefined,
  collectedData?: Record<string, unknown> | null,
) {
  return buildRoutineTimingFromSchedule(schedule, collectedData)
}
