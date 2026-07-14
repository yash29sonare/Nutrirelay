-- =============================================================================
-- Migration: 07A_trainers_plans_base
-- Fortress Fitness — Phase 7.1A Canonical Tenancy Schema (Additive Only)
--
-- Creates:
--   - public.trainers
--   - public.plans
--   - seed plan rows (STARTER/PRO/ELITE)
--
-- Backward-compatible additive: does NOT modify existing tables.
-- =============================================================================

-- ----
-- Ensure UUID generator exists (safe no-op if already available)
-- ----
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- SECTION 1: Trainers (canonical tenant root)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trainers (
  trainer_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id          UUID         NOT NULL UNIQUE,
  name                   TEXT         NOT NULL DEFAULT '',
  email                  TEXT         NOT NULL DEFAULT '',
  phone                  TEXT         NOT NULL DEFAULT '',
  role                   TEXT         NOT NULL DEFAULT 'trainer',
  onboarding_status     TEXT         NOT NULL DEFAULT 'invited',
  subscription_plan     TEXT         NOT NULL DEFAULT 'STARTER',
  subscription_status   TEXT         NOT NULL DEFAULT 'pending_review',
  max_clients           INTEGER      NOT NULL DEFAULT 0 CHECK (max_clients >= 0),
  whatsapp_business_id  TEXT         NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at support (additive trigger)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_trainers_updated_at ON public.trainers;
CREATE TRIGGER set_trainers_updated_at
BEFORE UPDATE ON public.trainers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- SECTION 2: Plans catalog + seeded defaults
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.plans (
  plan_id         TEXT         PRIMARY KEY,
  name            TEXT         NOT NULL,
  monthly_price   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
  max_clients     INTEGER      NOT NULL DEFAULT 0 CHECK (max_clients >= 0),
  feature_flags   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_plans_updated_at ON public.plans;
CREATE TRIGGER set_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Seed plans (idempotent)
INSERT INTO public.plans (plan_id, name, monthly_price, max_clients, feature_flags, created_at, updated_at)
VALUES
  (
    'STARTER',
    'Starter',
    0,
    10,
    '{}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'PRO',
    'Pro',
    0,
    50,
    '{}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'ELITE',
    'Elite',
    0,
    250,
    '{}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (plan_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- SECTION 3: RLS posture (service_role only; authenticated/anon NO ACCESS)
-- -----------------------------------------------------------------------------

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- service role can do everything on these tables in this additive phase
-- (no trainer-scoped policies yet; no authenticated/anon access)
CREATE POLICY trainers_service_role_all
  ON public.trainers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY plans_service_role_all
  ON public.plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Explicitly deny via absence: anon/authenticated have no policies -> implicit DENY.

-- End
