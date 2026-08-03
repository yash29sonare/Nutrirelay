import { describe, expect, it } from "vitest"
import { BILLING_PLANS, getBillingPlan, getBillingPlanClientLimit, normalizeBillingPlanKey } from "@/lib/billing/plans"
import {
  getFeatureAvailabilityFromPlan,
  getPlanClientLimit,
  getPlanDefinition,
  getTrialEndsAt,
  isPaidPlan,
  isTrialExpiredFromDates,
  isTrialPlan,
} from "@/lib/billing/entitlements"

describe("billing plan foundation", () => {
  it("keeps the approved INR prices and active client limits", () => {
    expect(BILLING_PLANS.trial.priceInr).toBe(0)
    expect(BILLING_PLANS.trial.clientLimit).toBe(3)

    expect(BILLING_PLANS.starter.priceInr).toBe(1499)
    expect(BILLING_PLANS.starter.clientLimit).toBe(3)

    expect(BILLING_PLANS.growth.priceInr).toBe(3499)
    expect(BILLING_PLANS.growth.clientLimit).toBe(10)

    expect(BILLING_PLANS.pro.priceInr).toBe(6999)
    expect(BILLING_PLANS.pro.clientLimit).toBe(25)

    expect(BILLING_PLANS.agency.priceLabel).toBe("Starting ₹9,999+")
    expect(BILLING_PLANS.agency.clientLimitLabel).toBe("30+ custom active clients")
  })

  it("marks the trial as a 7-day no-card Pro trial without making Pro the fallback", () => {
    expect(BILLING_PLANS.trial.headline).toBe("7-day Pro trial")
    expect(BILLING_PLANS.trial.trialDays).toBe(7)
    expect(BILLING_PLANS.pro.badgeLabel).toBe("Most popular")
    expect(BILLING_PLANS.pro.headline).toBe("Best for serious WhatsApp diet coaching")

    expect(getBillingPlan("unknown")).toBeNull()
    expect(getPlanDefinition("unknown")).toBeNull()
    expect(normalizeBillingPlanKey(undefined)).toBeNull()
  })

  it("normalizes saved plan names without exposing database-style underscores in display data", () => {
    expect(normalizeBillingPlanKey("STARTER")).toBe("starter")
    expect(getBillingPlan("GROWTH")?.name).toBe("Growth")
    expect(getBillingPlan("veg_eggs_allowed")).toBeNull()
  })

  it("exposes pure entitlement helpers for client limits, paid state, and feature availability", () => {
    expect(getBillingPlanClientLimit("starter")).toBe(3)
    expect(getPlanClientLimit("growth")).toBe(10)
    expect(getPlanClientLimit("pro")).toBe(25)
    expect(isTrialPlan("trial")).toBe(true)
    expect(isPaidPlan("trial")).toBe(false)
    expect(isPaidPlan("pro")).toBe(true)
    expect(getFeatureAvailabilityFromPlan("starter", "team_access")).toBe(false)
    expect(getFeatureAvailabilityFromPlan("agency", "team_access")).toBe(true)
  })

  it("calculates the 7-day trial window deterministically", () => {
    const startedAt = new Date("2026-08-01T00:00:00.000Z")
    expect(getTrialEndsAt(startedAt).toISOString()).toBe("2026-08-08T00:00:00.000Z")
    expect(isTrialExpiredFromDates(startedAt, null, new Date("2026-08-07T23:59:59.000Z"))).toBe(false)
    expect(isTrialExpiredFromDates(startedAt, null, new Date("2026-08-08T00:00:00.000Z"))).toBe(true)
  })
})
