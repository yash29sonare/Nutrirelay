import { createClient } from "@supabase/supabase-js"

const MS_PER_DAY = 24 * 60 * 60 * 1000
const COMPLIANCE_WINDOW_DAYS = 7
const MISSED_THRESHOLD_HOURS = 28

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface ComplianceInput {
  clientId: string
  trainerId: string
  timezone?: string
}

export interface ComplianceResult {
  compliance_score: number
  risk_score: number
  status_color: "GREEN" | "YELLOW" | "RED"
  missed_meals: number
  missed_days: number
  response_rate: number
}

function scoreToColor(score: number): "GREEN" | "YELLOW" | "RED" {
  if (score >= 70) return "GREEN"
  if (score >= 40) return "YELLOW"
  return "RED"
}

export async function calculateCompliance(input: ComplianceInput): Promise<ComplianceResult> {
  const db = getDb()
  const now = Date.now()
  const windowStart = new Date(now - COMPLIANCE_WINDOW_DAYS * MS_PER_DAY).toISOString()

  const { data: meals } = await db
    .from("food_logs")
    .select("logged_at, verification_status")
    .eq("client_id", input.clientId)
    .gte("logged_at", windowStart)

  const mealRows = (meals ?? []) as Array<{ logged_at: string; verification_status: string }>
  const totalMeals = mealRows.length

  const daysWithLogs = new Set(mealRows.map((m) => m.logged_at.slice(0, 10)))
  const missedDays = COMPLIANCE_WINDOW_DAYS - daysWithLogs.size

  const verifiedCount = mealRows.filter((m) => m.verification_status === "VERIFIED").length
  const verifiedRatio = totalMeals > 0 ? verifiedCount / totalMeals : 0

  const expectedMealsPerDay = 3
  const expectedMeals = COMPLIANCE_WINDOW_DAYS * expectedMealsPerDay
  const missedMeals = Math.max(0, expectedMeals - totalMeals)

  const mealScore = totalMeals > 0 ? Math.min(100, (totalMeals / expectedMeals) * 100) : 0
  const verificationScore = verifiedRatio * 100
  const consistencyScore = daysWithLogs.size >= 5 ? 100 : (daysWithLogs.size / COMPLIANCE_WINDOW_DAYS) * 100

  const complianceScore = Math.round(mealScore * 0.4 + verificationScore * 0.3 + consistencyScore * 0.3)

  const riskScore = Math.round(
    (missedDays / COMPLIANCE_WINDOW_DAYS) * 50 +
    (1 - verifiedRatio) * 30 +
    (missedMeals > expectedMeals * 0.5 ? 20 : 0),
  )

  const result: ComplianceResult = {
    compliance_score: complianceScore,
    risk_score: Math.min(100, riskScore),
    status_color: scoreToColor(complianceScore),
    missed_meals: missedMeals,
    missed_days: missedDays,
    response_rate: totalMeals > 0 ? Math.round((daysWithLogs.size / COMPLIANCE_WINDOW_DAYS) * 100) : 0,
  }

  await db.from("client_compliance_snapshots").insert({
    client_id: input.clientId,
    trainer_id: input.trainerId,
    compliance_score: result.compliance_score,
    risk_score: result.risk_score,
    status_color: result.status_color,
    calculated_at: new Date().toISOString(),
  })

  return result
}
