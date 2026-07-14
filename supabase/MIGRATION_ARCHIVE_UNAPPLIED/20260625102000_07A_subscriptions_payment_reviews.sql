-- =============================================================================
-- Migration: 07A_subscriptions_payment_reviews
-- Fortress Fitness — Phase 7.1A Canonical Tenancy Schema (Additive Only)
--
-- Creates:
--   - public.subscriptions
--   - public.payment_reviews
--
-- RLS posture (per spec):
--   - Enable RLS on new tables
--   - service_role-only policies
--   - no authenticated/anon access policies
--   - additive only (no modifications to existing tables)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1: Subscriptions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscriptions (
  subscription_id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id              UUID         NOT NULL REFERENCES public.trainers(trainer_id) ON DELETE CASCADE,
  plan_id                 TEXT         NOT NULL DEFAULT 'STARTER' REFERENCES public.plans(plan_id),
  status                  TEXT         NOT NULL,
  started_at             TIMESTAMPTZ,
  expires_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Allowed state machine statuses
  CHECK (status IN (
    'pending_review',
    'under_review',
    'active',
    'suspended',
    'expired',
    'cancelled',
    'grace_period'
  ))
);

-- updated_at trigger (reuses handle_updated_at from earlier migration)
DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- SECTION 2: This migration is superseded by 10_architecture_reconciliation.
-- payment_reviews is created there with correct FKs to trainer_subscriptions.
-- The subscriptions table was already created by migration 02 with PK `id`.
-- The DECLARE below is a no-op that preserves migration history compatibility.
