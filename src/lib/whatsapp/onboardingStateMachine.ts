import type { ClientRoutineTiming } from "@/lib/reminders/reminderPlanner"

export type ClientOnboardingStatus = "not_started" | "in_progress" | "completed" | "paused"

export type ClientOnboardingStep =
  | "height"
  | "weight"
  | "goal"
  | "target_weight"
  | "allergies"
  | "food_preferences"
  | "routine_times"
  | "workout_schedule"
  | "checkin_preference"
  | "complete"

export interface ClientOnboardingStateRow {
  onboarding_status: ClientOnboardingStatus
  current_step: ClientOnboardingStep
  collected_data: Record<string, unknown> | null
}

export interface ParsedOnboardingAnswer {
  value: Record<string, unknown>
  summary: string | null
}

export interface OnboardingStepResult {
  ok: boolean
  nextStep: ClientOnboardingStep
  updates?: ParsedOnboardingAnswer
  clarificationMessage?: string
  completionMessage?: string
}

const STEP_ORDER: ClientOnboardingStep[] = [
  "height",
  "weight",
  "goal",
  "target_weight",
  "allergies",
  "food_preferences",
  "routine_times",
  "workout_schedule",
  "checkin_preference",
  "complete",
]

const DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const
const DAY_NAME_SET = new Set<string>(DAY_NAMES)

function nextStep(step: ClientOnboardingStep): ClientOnboardingStep {
  const index = STEP_ORDER.indexOf(step)
  return index >= 0 && index < STEP_ORDER.length - 1 ? STEP_ORDER[index + 1] : "complete"
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function parseSimpleNumber(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function toTimeString(hours: number, minutes: number): string | null {
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

function parseTimeToken(token: string, context: "breakfast" | "lunch" | "snack" | "dinner" | "workout" | "checkin"): string | null {
  const normalized = normalizeText(token)
  const rangeWithMeridiem = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*-\s*\d{1,2}(?::\d{2})?\s*(am|pm)/)
  if (rangeWithMeridiem) {
    return parseTimeToken(`${rangeWithMeridiem[1]}:${rangeWithMeridiem[2] ?? "00"} ${rangeWithMeridiem[3]}`, context)
  }

  const ampmMatch = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/)
  if (ampmMatch) {
    let hours = Number(ampmMatch[1])
    const minutes = Number(ampmMatch[2] ?? "0")
    const meridiem = ampmMatch[3]
    if (meridiem === "pm" && hours < 12) hours += 12
    if (meridiem === "am" && hours === 12) hours = 0
    return toTimeString(hours, minutes)
  }

  if (normalized.includes("morning")) return context === "workout" ? "07:00" : "08:00"
  if (normalized.includes("afternoon")) return "14:00"
  if (normalized.includes("evening")) return context === "workout" ? "19:00" : "20:00"
  if (normalized.includes("night")) return "21:00"

  const numeric = normalized.match(/(^|\s)(\d{1,2})(?::(\d{2}))?($|\s)/)
  if (!numeric) return null

  let hours = Number(numeric[2])
  const minutes = Number(numeric[3] ?? "0")

  if (context === "breakfast" && hours <= 12) return toTimeString(hours === 12 ? 8 : hours, minutes)
  if (context === "lunch" && hours < 12) hours += 12
  if (context === "snack" && hours < 12) hours += 12
  if ((context === "dinner" || context === "workout" || context === "checkin") && hours < 12) hours += 12

  return toTimeString(hours, minutes)
}

function addMinutesToClock(time: string, minutesToAdd: number): string | null {
  const [hourText, minuteText] = time.split(":")
  const hour = Number.parseInt(hourText ?? "", 10)
  const minute = Number.parseInt(minuteText ?? "", 10)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null

  const total = (((hour * 60 + minute + minutesToAdd) % 1440) + 1440) % 1440
  return toTimeString(Math.floor(total / 60), total % 60)
}

function minutesBetween(start: string, end: string): number | null {
  const [startHour, startMinute] = start.split(":").map((part) => Number.parseInt(part, 10))
  const [endHour, endMinute] = end.split(":").map((part) => Number.parseInt(part, 10))
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return null

  const startTotal = startHour * 60 + startMinute
  let endTotal = endHour * 60 + endMinute
  if (endTotal <= startTotal) endTotal += 24 * 60
  return endTotal - startTotal
}

export function parseHeightCm(text: string): number | null {
  const normalized = normalizeText(text)
  const cmMatch = normalized.match(/(\d{3}(?:\.\d+)?)\s*cm/)
  if (cmMatch) {
    const cm = Number(cmMatch[1])
    return cm >= 120 && cm <= 250 ? Math.round(cm * 10) / 10 : null
  }

  const ftMatch = normalized.match(/(\d)\s*(?:ft|feet|foot|')\s*(\d{1,2})?/)
  if (ftMatch) {
    const feet = Number(ftMatch[1])
    const inches = Number(ftMatch[2] ?? "0")
    const totalInches = feet * 12 + inches
    const cm = totalInches * 2.54
    return Math.round(cm * 10) / 10
  }

  return null
}

export function parseWeightKg(text: string): number | null {
  const normalized = normalizeText(text)
  const match = normalized.match(/(\d{2,3}(?:\.\d+)?)\s*kg?/)
  if (!match) return null
  const weight = Number(match[1])
  return weight >= 25 && weight <= 300 ? Math.round(weight * 10) / 10 : null
}

export function parseGoalType(text: string): "LOSE_WEIGHT" | "GAIN_WEIGHT" | "MAINTAIN_WEIGHT" | "RECOMPOSITION" | null {
  const normalized = normalizeText(text)
  if (normalized.includes("fat loss") || normalized.includes("weight loss") || normalized.includes("lose")) {
    return "LOSE_WEIGHT"
  }
  if (normalized.includes("muscle gain") || normalized.includes("gain")) {
    return "GAIN_WEIGHT"
  }
  if (normalized.includes("maint")) {
    return "MAINTAIN_WEIGHT"
  }
  if (normalized.includes("recomp")) {
    return "RECOMPOSITION"
  }
  return null
}

export function parseAllergies(text: string): string[] {
  const normalized = normalizeText(text)
  if (/(^|\s)(no|none|nothing)(\s|$)/.test(normalized)) {
    return []
  }

  const detected = new Set<string>()
  if (normalized.includes("peanut")) detected.add("peanut")
  if (normalized.includes("dairy") || normalized.includes("lactose")) detected.add("dairy")
  if (normalized.includes("egg")) detected.add("egg")
  if (normalized.includes("gluten")) detected.add("gluten")

  if (detected.size > 0) {
    return [...detected]
  }

  return normalized ? [text.trim()] : []
}

export function parseFoodPreferences(text: string): { dietType: string | null; dislikes: string[] } | null {
  const normalized = normalizeText(text)
  const dislikesMatch = normalized.match(/(?:dislike|hate|avoid)\s+(.+)/)
  const dislikes = dislikesMatch
    ? dislikesMatch[1].split(/,|and/).map((item) => item.trim()).filter(Boolean)
    : []

  if (normalized.includes("jain")) return { dietType: "jain", dislikes }
  if (normalized.includes("vegan")) return { dietType: "vegan", dislikes }
  if (normalized.includes("non-veg") || normalized.includes("non veg")) return { dietType: "non_vegetarian", dislikes }
  if (normalized.includes("veg") && normalized.includes("egg")) return { dietType: "veg_eggs_allowed", dislikes }
  if (normalized.includes("veg")) return { dietType: "vegetarian", dislikes }
  if (normalized.includes("egg")) return { dietType: "egg_allowed", dislikes }

  if (normalized) {
    return { dietType: text.trim(), dislikes }
  }

  return null
}

export interface ParsedRoutineTimes {
  breakfast?: string
  lunch?: string
  snack?: string
  dinner?: string
  skippedMeals?: string[]
}

function detectSkippedBreakfast(normalized: string): boolean {
  const patterns = [
    /\bi\s*(?:do not|don't|dont)\s*(?:eat|have)?\s*breakfast\b/,
    /\bno\s+breakfast\b/,
    /\bi\s+skip\s+breakfast\b/,
    /\bbreakfast\s+skip(?:ped)?\b/,
    /\bonly\s+lunch(?:\s*[,/]\s*|\s+)?snack(?:s)?(?:\s*[,/]\s*|\s+)?dinner\b/,
    /\b(?:just|only)\s+(?:have\s+)?tea\/coffee(?:,\s*)?no\s+breakfast\b/,
    /\bmorning\s+(?:sirf|only)\s+chai(?:\/coffee)?(?:,\s*)?no\s+breakfast\b/,
    /\bbreakfast\s+nahi\s+karta\b/,
    /\bmain\s+breakfast\s+skip\s+karta\s*h(?:u|oon)\b/,
    /\bnashta\s+nahi\s+kart(?:a|i)\b/,
    /\bsubah\s+sirf\s+(?:chai|coffee)\b/,
  ]

  return patterns.some((pattern) => pattern.test(normalized))
}

export function parseRoutineTimes(text: string): ParsedRoutineTimes | null {
  const normalized = normalizeText(text)
  const result: ParsedRoutineTimes = {}
  const patterns: Array<["breakfast" | "lunch" | "snack" | "dinner", RegExp]> = [
    ["breakfast", /breakfast\s*(?:at|around)?\s*([0-9: apmnightmorningevening-]+)/],
    ["lunch", /lunch\s*(?:at|around)?\s*([0-9: apmnightmorningevening-]+)/],
    ["snack", /snack(?:s)?\s*(?:at|around)?\s*([0-9: apmnightmorningevening-]+)/],
    ["dinner", /dinner\s*(?:at|around)?\s*([0-9: apmnightmorningevening-]+)/],
  ]

  for (const [label, pattern] of patterns) {
    const match = normalized.match(pattern)
    const parsed = match ? parseTimeToken(match[1], label) : null
    if (parsed) result[label] = parsed
  }

  const skippedMeals = new Set<string>()
  if (detectSkippedBreakfast(normalized)) skippedMeals.add("breakfast")
  if (skippedMeals.size > 0) result.skippedMeals = [...skippedMeals]

  return Object.keys(result).length > 0 ? result : null
}

export interface ParsedWorkoutSchedule {
  workoutTime: string | null
  workoutEndTime?: string | null
  workoutDurationMinutes?: number | null
  restDays: string[]
  workoutDays: string[]
  workoutFrequency?: number | null
  noWorkoutCurrently?: boolean
  postWorkoutDelayMinutes?: number | null
}

function extractMentionedDays(normalized: string, words: string[]): string[] {
  return DAY_NAMES.filter((day) => {
    const dayMentioned = new RegExp(`\\b${day}\\b`).test(normalized)
    if (!dayMentioned) return false
    return words.some((word) => new RegExp(`\\b${day}\\b.{0,24}\\b${word}\\b|\\b${word}\\b.{0,24}\\b${day}\\b`).test(normalized))
  })
}

export function parseWorkoutSchedule(text: string): ParsedWorkoutSchedule | null {
  const normalized = normalizeText(text)
  if (/(?:no|not|don't|do not|dont)\s+(?:workout|work out|gym|exercise)|(?:no workout currently)/.test(normalized)) {
    return {
      workoutTime: null,
      workoutEndTime: null,
      workoutDurationMinutes: null,
      restDays: [],
      workoutDays: [],
      workoutFrequency: 0,
      noWorkoutCurrently: true,
      postWorkoutDelayMinutes: null,
    }
  }

  const startPatterns = [
    /(?:workout|work out|gym|exercise)(?:\s*at|\s*from)?\s*([0-9:]+\s*(?:am|pm)?|morning|evening|night)(?:\s*(?:to|-)\s*([0-9:]+\s*(?:am|pm)?))?/,
    /([0-9:]+\s*(?:am|pm)?|morning|evening|night)\s*(?:workout|work out|gym|exercise)(?:\s*(?:to|-)\s*([0-9:]+\s*(?:am|pm)?))?/,
    /([0-9:]+\s*(?:am|pm)?)\s*(?:to|-)\s*([0-9:]+\s*(?:am|pm)?)\s*(?:daily\s*)?(?:workout|work out|gym|exercise)?/,
  ]

  let workoutTime: string | null = null
  let workoutEndTime: string | null = null
  for (const pattern of startPatterns) {
    const match = normalized.match(pattern)
    if (!match) continue
    workoutTime = parseTimeToken(match[1], "workout")
    if (workoutTime && match[2]) {
      const endToken = /am|pm/.test(match[2]) || !/(am|pm)/.test(match[1])
        ? match[2]
        : `${match[2]} ${match[1].includes("pm") ? "pm" : "am"}`
      workoutEndTime = parseTimeToken(endToken, "workout")
    }
    if (workoutTime) break
  }

  const explicitRestDays = extractMentionedDays(normalized, ["rest", "off", "holiday"])
  let workoutDays = extractMentionedDays(normalized, ["workout", "gym", "exercise"])
    .filter((day) => !explicitRestDays.includes(day))

  const frequencyMatch = normalized.match(/(\d+)\s*(?:days?|x)\s*(?:a\s*)?(?:week|weekly)/)
  const workoutFrequency = frequencyMatch ? Number(frequencyMatch[1]) : normalized.includes("daily") ? 7 : null
  const inferredRestDays = workoutFrequency && workoutFrequency < 7
    ? explicitRestDays
    : explicitRestDays
  const restDays = [...new Set(inferredRestDays)].filter((day) => DAY_NAME_SET.has(day))
  if (workoutDays.length === 0 && workoutFrequency && restDays.length > 0 && workoutFrequency === DAY_NAMES.length - restDays.length) {
    workoutDays = DAY_NAMES.filter((day) => !restDays.includes(day))
  }
  const workoutDurationMinutes = workoutTime && workoutEndTime ? minutesBetween(workoutTime, workoutEndTime) : null
  const postWorkoutDelayMinutes = workoutDurationMinutes && workoutDurationMinutes > 60
    ? Math.max(0, workoutDurationMinutes - 60 + 30)
    : workoutTime
      ? 30
      : null

  const hasEssentialTime = Boolean(workoutTime)
  const hasEssentialDays = restDays.length > 0 || workoutDays.length > 0 || Boolean(workoutFrequency)

  if (!hasEssentialTime && !hasEssentialDays && !normalized.includes("morning") && !normalized.includes("evening")) {
    return null
  }

  return {
    workoutTime: workoutTime ?? (normalized.includes("morning") ? "07:00" : normalized.includes("evening") ? "19:00" : null),
    workoutEndTime: workoutEndTime ?? (workoutTime && workoutDurationMinutes ? addMinutesToClock(workoutTime, workoutDurationMinutes) : null),
    workoutDurationMinutes,
    restDays,
    workoutDays,
    workoutFrequency,
    noWorkoutCurrently: false,
    postWorkoutDelayMinutes,
  }
}

export function parseCheckinPreference(text: string): { preference: string; preferredTime: string | null } | null {
  const normalized = normalizeText(text)
  if (/\b(workout|work out|gym|exercise|rest day|rest on|sunday rest|rest)\b/.test(normalized)) return null
  if (normalized.includes("morning")) return { preference: "morning", preferredTime: "08:00" }
  if (normalized.includes("afternoon")) return { preference: "afternoon", preferredTime: "14:00" }
  if (normalized.includes("evening")) return { preference: "evening", preferredTime: "20:00" }
  const preferredTime = parseTimeToken(text, "checkin")
  if (preferredTime) return { preference: "custom", preferredTime }
  return null
}

export function getOnboardingQuestion(step: ClientOnboardingStep): string {
  switch (step) {
    case "height":
      return "What is your height? You can reply like 170 cm or 5'7."
    case "weight":
      return "What is your current weight? Example: 72 kg."
    case "goal":
      return "What is your main goal? Fat loss, muscle gain, maintenance, or something else?"
    case "target_weight":
      return "Do you have a target weight or target date? You can reply like 65 kg, by October, or no target."
    case "allergies":
      return "Do you have any allergies or foods you must avoid?"
    case "food_preferences":
      return "Are you veg, non-veg, egg-eating, vegan, Jain, or anything else?"
    case "routine_times":
      return "What time do you usually eat breakfast, lunch, snacks, and dinner?"
    case "workout_schedule":
      return "What time do you usually work out, and which days are rest days?"
    case "checkin_preference":
      return "When should I check in with you daily?"
    case "complete":
      return "Got it. Your trainer can now see your routine and preferences."
  }
}

export function buildRoutineTimingFromSchedule(
  schedule: Record<string, unknown> | null | undefined,
  collectedData?: Record<string, unknown> | null,
): ClientRoutineTiming | null {
  if (!schedule) return null
  const routineTimes = collectedData?.routine_times
  const skippedMeals = Array.isArray((routineTimes as Record<string, unknown> | undefined)?.skippedMeals)
    ? ((routineTimes as Record<string, unknown>).skippedMeals as unknown[]).filter((meal): meal is string => typeof meal === "string")
    : []

  return {
    breakfastTime: typeof schedule.breakfast_time === "string" ? schedule.breakfast_time : null,
    lunchTime: typeof schedule.lunch_time === "string" ? schedule.lunch_time : null,
    snackTime: typeof schedule.snack_time === "string" ? schedule.snack_time : null,
    dinnerTime: typeof schedule.dinner_time === "string" ? schedule.dinner_time : null,
    wakeTime: typeof schedule.preferred_checkin_time === "string" ? schedule.preferred_checkin_time : null,
    workoutTime: typeof schedule.workout_time === "string" ? schedule.workout_time : null,
    restDays: Array.isArray(schedule.rest_days) ? schedule.rest_days.filter((day): day is string => typeof day === "string") : [],
    postWorkoutDelayMinutes: typeof schedule.post_workout_delay_minutes === "number" ? schedule.post_workout_delay_minutes : null,
    preWorkoutOffsetMinutes: typeof schedule.pre_workout_offset_minutes === "number" ? schedule.pre_workout_offset_minutes : null,
    skippedMeals,
  }
}

export function advanceOnboardingState(state: ClientOnboardingStateRow, answerText: string): OnboardingStepResult {
  switch (state.current_step) {
    case "height": {
      const heightCm = parseHeightCm(answerText)
      if (!heightCm) return { ok: false, nextStep: "height", clarificationMessage: getOnboardingQuestion("height") }
      return { ok: true, nextStep: "weight", updates: { value: { height_cm: heightCm }, summary: `${heightCm} cm` } }
    }
    case "weight": {
      const weightKg = parseWeightKg(answerText)
      if (!weightKg) return { ok: false, nextStep: "weight", clarificationMessage: getOnboardingQuestion("weight") }
      return { ok: true, nextStep: "goal", updates: { value: { weight_kg: weightKg }, summary: `${weightKg} kg` } }
    }
    case "goal": {
      const goalType = parseGoalType(answerText)
      if (!goalType) return { ok: false, nextStep: "goal", clarificationMessage: getOnboardingQuestion("goal") }
      return { ok: true, nextStep: "target_weight", updates: { value: { goal_type: goalType }, summary: goalType } }
    }
    case "target_weight": {
      const normalized = normalizeText(answerText)
      if (/(^|\s)(no|none|skip)(\s|$)/.test(normalized)) {
        return { ok: true, nextStep: "allergies", updates: { value: { target_weight: null, target_timeline: null }, summary: "No target set" } }
      }
      const targetWeight = parseWeightKg(answerText)
      if (targetWeight !== null) {
        return { ok: true, nextStep: "allergies", updates: { value: { target_weight: targetWeight }, summary: `${targetWeight} kg` } }
      }
      if (normalized) {
        return { ok: true, nextStep: "allergies", updates: { value: { target_timeline: answerText.trim() }, summary: answerText.trim() } }
      }
      return { ok: false, nextStep: "target_weight", clarificationMessage: getOnboardingQuestion("target_weight") }
    }
    case "allergies": {
      const allergies = parseAllergies(answerText)
      return { ok: true, nextStep: "food_preferences", updates: { value: { allergies }, summary: allergies.join(", ") || "None" } }
    }
    case "food_preferences": {
      const preferences = parseFoodPreferences(answerText)
      if (!preferences) return { ok: false, nextStep: "food_preferences", clarificationMessage: getOnboardingQuestion("food_preferences") }
      return {
        ok: true,
        nextStep: "routine_times",
        updates: { value: { diet_type: preferences.dietType, disliked_foods: preferences.dislikes }, summary: preferences.dietType },
      }
    }
    case "routine_times": {
      const times = parseRoutineTimes(answerText)
      if (!times) return { ok: false, nextStep: "routine_times", clarificationMessage: getOnboardingQuestion("routine_times") }
      return { ok: true, nextStep: "workout_schedule", updates: { value: { routine_times: times }, summary: Object.entries(times).map(([k, v]) => `${k} ${v}`).join(", ") } }
    }
    case "workout_schedule": {
      const schedule = parseWorkoutSchedule(answerText)
      if (!schedule) return { ok: false, nextStep: "workout_schedule", clarificationMessage: getOnboardingQuestion("workout_schedule") }
      return { ok: true, nextStep: "checkin_preference", updates: { value: { workout_schedule: schedule }, summary: schedule.workoutTime } }
    }
    case "checkin_preference": {
      const preference = parseCheckinPreference(answerText)
      if (!preference) return { ok: false, nextStep: "checkin_preference", clarificationMessage: getOnboardingQuestion("checkin_preference") }
      return {
        ok: true,
        nextStep: "complete",
        updates: { value: { checkin_preference: preference.preference, preferred_checkin_time: preference.preferredTime }, summary: preference.preference },
        completionMessage: getOnboardingQuestion("complete"),
      }
    }
    case "complete":
      return { ok: true, nextStep: "complete" }
  }
}
