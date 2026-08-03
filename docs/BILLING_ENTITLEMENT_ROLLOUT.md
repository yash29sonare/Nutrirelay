# Billing Entitlement Rollout

Phase A establishes the pricing catalog, trial rules, manual-payment UI, and an unapplied database migration for future trainer subscription state.

This phase does not enforce billing gates, does not connect a payment provider, and does not block the current manual WhatsApp pilot.

## Source Of Truth

- Static plan catalog: `src/lib/billing/plans.ts`
- Pure entitlement helpers: `src/lib/billing/entitlements.ts`
- Compatibility exports for current callers: `src/lib/entitlements.ts`
- Unapplied migration draft: `supabase/migrations/20260803000000_trainer_billing_foundation.sql`
- Settings UI surface: `src/app/dashboard/settings/page.tsx`

## Approved Plans

| Plan | Price | Limit | Trial | Notes |
| --- | ---: | ---: | ---: | --- |
| Trial | ₹0 | 3 active clients | 7 days | No card required, Pro trial positioning |
| Starter | ₹1,499/month | 3 active clients | None | Manual QR/UPI verification |
| Growth | ₹3,499/month | 10 active clients | None | Manual QR/UPI verification |
| Pro | ₹6,999/month | 25 active clients | None | Most popular, best for serious WhatsApp diet coaching |
| Agency | Starting ₹9,999+/month | 30+ custom active clients | None | Manual operator approval |

## Migration Design

`trainer_subscriptions.trainer_id` references `public.profiles(id)` because current trainer ownership paths such as `trainer_clients.trainer_id`, `meal_plans.trainer_id`, `food_logs.trainer_id`, `trainer_waba_credentials.trainer_id`, and dashboard read paths use the trainer auth/profile UUID.

`trainer_usage_counters` stores period-scoped usage snapshots for future billing enforcement. Phase A does not read this table at runtime.

Both tables enable RLS and allow authenticated trainers to read only their own rows. Phase A intentionally omits browser-write policies; operator and service-role flows can be added later when admin verification exists.

## Enforcement Map

| Entitlement area | Future enforcement boundary | Current Phase A behavior |
| --- | --- | --- |
| Active client limit | `src/lib/operations/client-lifecycle.ts` before invite, activate, restore, or import flows | Compatibility wrapper does not block existing operations |
| WhatsApp logging | WhatsApp webhook processing and communication log writers | No billing gate |
| AI meal review | Meal parsing/review pipelines before chargeable AI review is accepted | No billing gate |
| Photo review | WhatsApp media ingestion and trainer photo review surfaces | No billing gate |
| Voice review | Voice-note transcription and review surfaces | No billing gate |
| Weekly reports | Weekly report generation and report dashboard actions | No billing gate |
| Monthly reports | Monthly report generation and report dashboard actions | No billing gate |
| Automations | `src/lib/operations/automation-management.ts` and scheduled preparation jobs | Compatibility wrapper allows current automation operations |
| Advanced analytics | Dashboard analytics data loaders and analytics route | No billing gate |
| Team access | Future operator/admin/team management routes | No billing gate |

## Safety Rules

- Do not default an unknown trainer plan to Pro.
- Do not claim automatic payment success.
- Do not collect cards or UPI PINs.
- Do not depend on `trainer_subscriptions` or `trainer_usage_counters` at runtime until the migration is intentionally applied and verified.
- Do not enable broad dashboard locks until pricing, trial, and manual operator verification have production data support.
