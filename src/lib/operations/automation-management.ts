import { createClient } from "@supabase/supabase-js"
import { writeAuditLog } from "./audit"
import { checkFeatureAccess, EntitlementError } from "@/lib/entitlements"

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export interface AutomationConfig {
  meal_reminders_enabled?: boolean
  weekly_reports_enabled?: boolean
  monthly_reports_enabled?: boolean
  ghosting_detection_enabled?: boolean
  escalation_enabled?: boolean
  goal_prediction_enabled?: boolean
}

export interface AutomationResult {
  id: string
  trainer_id: string
  config: AutomationConfig
}

const FEATURE_MAP: Record<string, string> = {
  meal_reminders_enabled: "meal_reminders",
  weekly_reports_enabled: "weekly_reports",
  monthly_reports_enabled: "monthly_reports",
  ghosting_detection_enabled: "ghosting_detection",
  goal_prediction_enabled: "goal_prediction",
  escalation_enabled: "escalation",
}

async function validateFeatureAccess(trainerId: string, config: AutomationConfig): Promise<void> {
  for (const [configKey, featureKey] of Object.entries(FEATURE_MAP)) {
    if (config[configKey as keyof AutomationConfig] === true) {
      const allowed = await checkFeatureAccess(trainerId, featureKey)
      if (!allowed) {
        throw new EntitlementError(`Feature "${featureKey}" is not available on your current plan`)
      }
    }
  }
}

export async function createAutomation(trainerId: string, config?: AutomationConfig): Promise<AutomationResult> {
  const db = getDb()

  const { data: existing } = await db
    .from("trainer_automations")
    .select("id")
    .eq("trainer_id", trainerId)
    .maybeSingle()

  if (existing) throw new Error("Automation config already exists for this trainer — use update instead")

  const defaults: AutomationConfig = {
    meal_reminders_enabled: true,
    weekly_reports_enabled: true,
    monthly_reports_enabled: true,
    ghosting_detection_enabled: true,
    escalation_enabled: false,
    goal_prediction_enabled: true,
  }

  const merged = { ...defaults, ...config }

  await validateFeatureAccess(trainerId, merged)

  const { data } = await db.from("trainer_automations").insert({
    trainer_id: trainerId,
    ...merged,
  }).select("id, trainer_id").single()

  const row = data as unknown as { id: string; trainer_id: string }

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "automation_create",
    entity_type: "trainer_automations",
    entity_id: row.id,
    metadata: { config: merged },
  })

  return { id: row.id, trainer_id: row.trainer_id, config: merged }
}

export async function updateAutomation(trainerId: string, config: AutomationConfig): Promise<AutomationResult> {
  const db = getDb()

  const { data: existing } = await db
    .from("trainer_automations")
    .select("id, trainer_id")
    .eq("trainer_id", trainerId)
    .single()

  const row = existing as { id: string; trainer_id: string } | null
  if (!row) throw new Error("Automation config not found — create one first")
  if (row.trainer_id !== trainerId) throw new Error("Trainer does not own this automation config")

  await validateFeatureAccess(trainerId, config)

  const payload: Record<string, any> = { ...config, updated_at: new Date().toISOString() }

  await db.from("trainer_automations").update(payload).eq("id", row.id)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "automation_update",
    entity_type: "trainer_automations",
    entity_id: row.id,
    metadata: { changes: config },
  })

  return { id: row.id, trainer_id: row.trainer_id, config }
}

export async function enableAutomation(trainerId: string, automationKey: keyof AutomationConfig): Promise<void> {
  const db = getDb()

  const { data: existing } = await db
    .from("trainer_automations")
    .select("id, trainer_id")
    .eq("trainer_id", trainerId)
    .single()

  const row = existing as { id: string; trainer_id: string } | null
  if (!row) throw new Error("Automation config not found")
  if (row.trainer_id !== trainerId) throw new Error("Trainer does not own this automation config")

  const featureKey = FEATURE_MAP[automationKey]
  if (featureKey) {
    const allowed = await checkFeatureAccess(trainerId, featureKey)
    if (!allowed) {
      throw new EntitlementError(`Feature "${featureKey}" is not available on your current plan`)
    }
  }

  await db.from("trainer_automations").update({
    [automationKey]: true,
    updated_at: new Date().toISOString(),
  }).eq("id", row.id)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "automation_enable",
    entity_type: "trainer_automations",
    entity_id: row.id,
    metadata: { automation_key: automationKey, enabled: true },
  })
}

export async function disableAutomation(trainerId: string, automationKey: keyof AutomationConfig): Promise<void> {
  const db = getDb()

  const { data: existing } = await db
    .from("trainer_automations")
    .select("id, trainer_id")
    .eq("trainer_id", trainerId)
    .single()

  const row = existing as { id: string; trainer_id: string } | null
  if (!row) throw new Error("Automation config not found")
  if (row.trainer_id !== trainerId) throw new Error("Trainer does not own this automation config")

  await db.from("trainer_automations").update({
    [automationKey]: false,
    updated_at: new Date().toISOString(),
  }).eq("id", row.id)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "automation_disable",
    entity_type: "trainer_automations",
    entity_id: row.id,
    metadata: { automation_key: automationKey, enabled: false },
  })
}

export async function deleteAutomation(trainerId: string): Promise<void> {
  const db = getDb()

  const { data: existing } = await db
    .from("trainer_automations")
    .select("id, trainer_id")
    .eq("trainer_id", trainerId)
    .single()

  const row = existing as { id: string; trainer_id: string } | null
  if (!row) throw new Error("Automation config not found")
  if (row.trainer_id !== trainerId) throw new Error("Trainer does not own this automation config")

  await db.from("trainer_automations").delete().eq("id", row.id)

  await writeAuditLog({
    trainer_id: trainerId,
    actor_id: trainerId,
    event_type: "automation_delete",
    entity_type: "trainer_automations",
    entity_id: row.id,
    metadata: { deleted: true },
  })
}
