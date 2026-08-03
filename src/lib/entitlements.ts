export {
  EntitlementError,
  getFeatureAvailabilityFromPlan,
  getPlanClientLimit,
  getPlanDefinition,
  getTrialEndsAt,
  isPaidPlan,
  isTrialExpiredFromDates,
  isTrialPlan,
  resolveKnownPlanKey,
  type BillingFeatureKey,
  type BillingPlan,
  type BillingPlanKey,
  type TrainerSubscriptionSnapshot,
} from "@/lib/billing/entitlements"

export async function checkClientLimit(_trainerId: string): Promise<void> {
  void _trainerId
  return
}

export async function checkFeatureAccess(
  _trainerId: string,
  _featureKey: string,
): Promise<boolean> {
  void _trainerId
  void _featureKey
  return true
}
