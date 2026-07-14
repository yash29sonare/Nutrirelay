-- =============================================================================
-- Repair Migration: trainers + plans + onboarding
-- Fortress Fitness — Applies Phase 7A/9B tables and triggers that were
-- never migrated to this Supabase project.
--
-- Additive safe: all statements use IF NOT EXISTS / CREATE OR REPLACE.
-- Can be applied regardless of which migrations are already present.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: Trainers Table (from 07A_trainers_plans_base)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.trainers (
  trainer_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id          UUID         NOT NULL UNIQUE,
  name                  TEXT         NOT NULL DEFAULT '',
  email                 TEXT         NOT NULL DEFAULT '',
  phone                 TEXT         NOT NULL DEFAULT '',
  role                  TEXT         NOT NULL DEFAULT 'trainer',
  onboarding_status     TEXT         NOT NULL DEFAULT 'invited',
  subscription_plan     TEXT         NOT NULL DEFAULT 'STARTER',
  subscription_status   TEXT         NOT NULL DEFAULT 'pending_review',
  max_clients           INTEGER      NOT NULL DEFAULT 0 CHECK (max_clients >= 0),
  whatsapp_business_id  TEXT         NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger (function handle_updated_at already exists from 01_core_schema)
DROP TRIGGER IF EXISTS set_trainers_updated_at ON public.trainers;
CREATE TRIGGER set_trainers_updated_at
BEFORE UPDATE ON public.trainers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- SECTION 2: Plans Table + Seed Data (from 07A_trainers_plans_base)
-- =============================================================================

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

INSERT INTO public.plans (plan_id, name, monthly_price, max_clients, feature_flags, created_at, updated_at)
VALUES
  ('STARTER', 'Starter', 0, 10,  '{}'::jsonb, NOW(), NOW()),
  ('PRO',     'Pro',     0, 50,  '{}'::jsonb, NOW(), NOW()),
  ('ELITE',   'Elite',   0, 250, '{}'::jsonb, NOW(), NOW())
ON CONFLICT (plan_id) DO NOTHING;

-- =============================================================================
-- SECTION 3: Trainer CHECK Constraints (from 07A1_hardening_constraints_only)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trainers_role_chk') THEN
    ALTER TABLE public.trainers
      ADD CONSTRAINT trainers_role_chk
      CHECK (role IN ('trainer', 'admin'))
      NOT VALID;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trainers_onboarding_status_chk') THEN
    ALTER TABLE public.trainers
      ADD CONSTRAINT trainers_onboarding_status_chk
      CHECK (onboarding_status IN ('invited', 'onboarding', 'active'))
      NOT VALID;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trainers_subscription_status_chk') THEN
    ALTER TABLE public.trainers
      ADD CONSTRAINT trainers_subscription_status_chk
      CHECK (subscription_status IN (
        'pending_review', 'under_review', 'active',
        'suspended', 'expired', 'cancelled', 'grace_period'
      ))
      NOT VALID;
  END IF;
END;
$$;

-- =============================================================================
-- SECTION 4: Trainer Profile Trigger (from 09B_onboarding_columns_and_trigger)
-- When profiles.role becomes 'trainer', ensure a trainers row exists.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_profile_trainer_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'trainer'::public.role_type THEN
    INSERT INTO public.trainers (auth_user_id)
    VALUES (NEW.id)
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_role_trainer ON public.profiles;

CREATE TRIGGER on_profile_role_trainer
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_trainer_role();

-- =============================================================================
-- SECTION 5: Backfill trainers for existing trainer profiles
-- =============================================================================

INSERT INTO public.trainers (auth_user_id)
SELECT id FROM public.profiles
WHERE role = 'trainer'::public.role_type
  AND id NOT IN (SELECT auth_user_id FROM public.trainers)
ON CONFLICT (auth_user_id) DO NOTHING;

-- =============================================================================
-- SECTION 6: Onboarding columns (from 09B)
-- =============================================================================

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS business_name          TEXT,
  ADD COLUMN IF NOT EXISTS timezone               TEXT,
  ADD COLUMN IF NOT EXISTS country                TEXT,
  ADD COLUMN IF NOT EXISTS coaching_style         TEXT,
  ADD COLUMN IF NOT EXISTS experience_years       TEXT,
  ADD COLUMN IF NOT EXISTS specialties            JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS languages              JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_availability   TEXT,
  ADD COLUMN IF NOT EXISTS expected_client_count  TEXT,
  ADD COLUMN IF NOT EXISTS coaching_goals         TEXT;

-- =============================================================================
-- SECTION 7: FK from trainers.auth_user_id → profiles.id (from 09B)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trainers'
      AND constraint_name = 'trainers_auth_user_id_fkey'
  ) THEN
    ALTER TABLE public.trainers
      ADD CONSTRAINT trainers_auth_user_id_fkey
      FOREIGN KEY (auth_user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END;
$$;

-- =============================================================================
-- SECTION 8: RLS — trainers (from 07A_trainers_plans_base + 09B)
-- =============================================================================

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- service_role can do everything
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trainers' AND policyname = 'trainers_service_role_all') THEN
    CREATE POLICY trainers_service_role_all
      ON public.trainers FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plans' AND policyname = 'plans_service_role_all') THEN
    CREATE POLICY plans_service_role_all
      ON public.plans FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END;
$$;

-- authenticated users can SELECT their own trainer row
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trainers' AND policyname = 'trainers_authenticated_select_own') THEN
    CREATE POLICY trainers_authenticated_select_own
      ON public.trainers FOR SELECT TO authenticated
      USING (auth.uid() = auth_user_id);
  END IF;
END;
$$;

-- =============================================================================
-- SECTION 9: plan_code column (from 07A1_hardening_constraints_only)
-- =============================================================================

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS plan_code TEXT;

UPDATE public.plans
SET plan_code = plan_id
WHERE plan_code IS NULL AND plan_id IN ('STARTER', 'PRO', 'ELITE');

ALTER TABLE public.plans
  ALTER COLUMN plan_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plans_plan_code_uq'
  ) THEN
    ALTER TABLE public.plans
      ADD CONSTRAINT plans_plan_code_uq UNIQUE (plan_code);
  END IF;
END;
$$;

COMMIT;
