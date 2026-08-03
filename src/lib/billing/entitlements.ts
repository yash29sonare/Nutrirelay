import {
  type BillingFeatureKey,
  type BillingPlan,
  type BillingPlanKey,
  getBillingPlan,
  getBillingPlanClientLimit,
  isBillingPlanKey,
  normalizeBillingPlanKey,
} from "./plans"

export type { BillingFeatureKey, BillingPlan, BillingPlanKey }

export interface TrainerSubscriptionSnapshot {
  planKey?: string | null
  status?: "trialing" | "active" | "expired" | "suspended" | "cancelled" | null
  trialStartedAt?: string | Date | null
  trialEndsAt?: string | Date | null
}

export class EntitlementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EntitlementError"
  }
}

export function getPlanDefinition(planKey: string | null | undefined): BillingPlan | null {
  return getBillingPlan(planKey)
}

export function getPlanClientLimit(planKey: string | null | undefined): number | null {
  return getBillingPlanClientLimit(planKey)
}

export function isTrialPlan(planKey: string | null | undefined): boolean {
  return normalizeBillingPlanKey(planKey) === "trial"
}

export function isPaidPlan(planKey: string | null | undefined): boolean {
  const plan = getBillingPlan(planKey)
  return Boolean(plan && plan.priceInr !== null && plan.priceInr > 0)
}

export function getTrialEndsAt(startedAt: string | Date): Date {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  return end
}

export function isTrialExpiredFromDates(
  trialStartedAt: string | Date | null | undefined,
  trialEndsAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!trialStartedAt && !trialEndsAt) return false

  const end = trialEndsAt
    ? new Date(trialEndsAt)
    : trialStartedAt
      ? getTrialEndsAt(trialStartedAt)
      : null

  return end ? now.getTime() >= end.getTime() : false
}

export function getFeatureAvailabilityFromPlan(
  planKey: string | null | undefined,
  featureKey: BillingFeatureKey,
): boolean {
  const plan = getBillingPlan(planKey)
  return Boolean(plan?.features.includes(featureKey))
}

export function resolveKnownPlanKey(value: string | null | undefined): BillingPlanKey | null {
  const key = normalizeBillingPlanKey(value)
  return isBillingPlanKey(key) ? key : null
}
