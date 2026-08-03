export const BILLING_PLAN_KEYS = ["trial", "starter", "growth", "pro", "agency"] as const

export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number]

export type BillingFeatureKey =
  | "client_roster"
  | "whatsapp_logging"
  | "ai_meal_review"
  | "photo_review"
  | "voice_review"
  | "weekly_reports"
  | "monthly_reports"
  | "automations"
  | "advanced_analytics"
  | "team_access"

export interface BillingPlan {
  key: BillingPlanKey
  name: string
  headline: string
  priceInr: number | null
  priceLabel: string
  intervalLabel: string
  clientLimit: number
  clientLimitLabel: string
  trialDays: number | null
  badgeLabel?: string
  helperText: string
  features: readonly BillingFeatureKey[]
}

export const BILLING_PLANS = {
  trial: {
    key: "trial",
    name: "Trial",
    headline: "7-day Pro trial",
    priceInr: 0,
    priceLabel: "₹0",
    intervalLabel: "7 days",
    clientLimit: 3,
    clientLimitLabel: "3 active clients",
    trialDays: 7,
    helperText: "No card required. Manual pilot access for evaluating NutriRelay.",
    features: [
      "client_roster",
      "whatsapp_logging",
      "ai_meal_review",
      "photo_review",
      "voice_review",
      "weekly_reports",
      "monthly_reports",
      "automations",
      "advanced_analytics",
    ],
  },
  starter: {
    key: "starter",
    name: "Starter",
    headline: "For a small active client roster",
    priceInr: 1499,
    priceLabel: "₹1,499",
    intervalLabel: "per month",
    clientLimit: 3,
    clientLimitLabel: "3 active clients",
    trialDays: null,
    helperText: "Manual QR/UPI verification for trainers starting with a focused roster.",
    features: [
      "client_roster",
      "whatsapp_logging",
      "ai_meal_review",
      "photo_review",
      "weekly_reports",
    ],
  },
  growth: {
    key: "growth",
    name: "Growth",
    headline: "For growing WhatsApp coaching operations",
    priceInr: 3499,
    priceLabel: "₹3,499",
    intervalLabel: "per month",
    clientLimit: 10,
    clientLimitLabel: "10 active clients",
    trialDays: null,
    helperText: "More client capacity with review, reporting, and automation support.",
    features: [
      "client_roster",
      "whatsapp_logging",
      "ai_meal_review",
      "photo_review",
      "voice_review",
      "weekly_reports",
      "monthly_reports",
      "automations",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    headline: "Best for serious WhatsApp diet coaching",
    priceInr: 6999,
    priceLabel: "₹6,999",
    intervalLabel: "per month",
    clientLimit: 25,
    clientLimitLabel: "25 active clients",
    trialDays: null,
    badgeLabel: "Most popular",
    helperText: "Higher roster capacity with the full trainer workflow foundation.",
    features: [
      "client_roster",
      "whatsapp_logging",
      "ai_meal_review",
      "photo_review",
      "voice_review",
      "weekly_reports",
      "monthly_reports",
      "automations",
      "advanced_analytics",
    ],
  },
  agency: {
    key: "agency",
    name: "Agency",
    headline: "Custom setup for larger teams",
    priceInr: null,
    priceLabel: "Starting ₹9,999+",
    intervalLabel: "per month",
    clientLimit: 30,
    clientLimitLabel: "30+ custom active clients",
    trialDays: null,
    helperText: "Manual commercial approval for agencies that need custom limits.",
    features: [
      "client_roster",
      "whatsapp_logging",
      "ai_meal_review",
      "photo_review",
      "voice_review",
      "weekly_reports",
      "monthly_reports",
      "automations",
      "advanced_analytics",
      "team_access",
    ],
  },
} as const satisfies Record<BillingPlanKey, BillingPlan>

export const BILLING_PLAN_ORDER = ["trial", "starter", "growth", "pro", "agency"] as const

export function isBillingPlanKey(value: string | null | undefined): value is BillingPlanKey {
  return Boolean(value && BILLING_PLAN_KEYS.includes(value as BillingPlanKey))
}

export function normalizeBillingPlanKey(value: string | null | undefined): BillingPlanKey | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()
  return isBillingPlanKey(normalized) ? normalized : null
}

export function getBillingPlan(value: string | null | undefined): BillingPlan | null {
  const key = normalizeBillingPlanKey(value)
  return key ? BILLING_PLANS[key] : null
}

export function getBillingPlanClientLimit(value: string | null | undefined): number | null {
  return getBillingPlan(value)?.clientLimit ?? null
}

export function getBillingPlanClientLimitLabel(value: string | null | undefined): string {
  return getBillingPlan(value)?.clientLimitLabel ?? "Plan not assigned"
}

export function formatBillingPrice(value: BillingPlan): string {
  return `${value.priceLabel}${value.priceInr === 0 ? "" : ` ${value.intervalLabel}`}`
}
