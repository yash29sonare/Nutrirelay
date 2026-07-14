-- =============================================================================
-- Migration: 09B_onboarding_columns_and_trigger
-- Fortress Fitness — Phase 9.1B Onboarding Backend Integration
--
-- ADDITIVE ONLY:
--   - Creates handle_profile_trainer_role() trigger function
--   - Creates on_profile_role_trainer trigger on profiles
--   - Backfills trainers rows for existing profiles with role='trainer'
--   - Adds 10 onboarding columns to trainers table
--   - Adds explicit FK from trainers.auth_user_id → profiles.id
--   - Adds authenticated SELECT policy for middleware onboarding guard
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: Trainer Profile Trigger
-- When profiles.role becomes 'trainer', ensure a trainers row exists.
-- Handles both INSERT (auth trigger handle_new_trainer()) and UPDATE
-- (admin-initiated role changes).
-- Uses SECURITY DEFINER to bypass RLS during row creation.
-- Search path is empty (safe) — all references are schema-qualified.
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
-- SECTION 2: Backfill for existing profiles with role='trainer'
-- Ensures idempotent migration for environments with existing users.
-- =============================================================================

INSERT INTO public.trainers (auth_user_id)
SELECT id FROM public.profiles
WHERE role = 'trainer'::public.role_type
  AND id NOT IN (SELECT auth_user_id FROM public.trainers)
ON CONFLICT (auth_user_id) DO NOTHING;

-- =============================================================================
-- SECTION 3: Onboarding Columns for Trainers
-- 10 additive columns for onboarding wizard data.
-- specialties and languages use JSONB (matching existing codebase convention).
-- All columns nullable with safe defaults handled by the application layer.
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
-- SECTION 4: Foreign Key — auth_user_id → profiles.id
-- NOT VALID avoids locking; no existing rows to validate.
-- ON DELETE CASCADE mirrors the profiles → auth.users cascade pattern.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
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
-- SECTION 5: RLS Policy for Middleware Onboarding Guard
-- Allows authenticated users to SELECT their OWN trainer row only.
-- This enables the middleware onboarding check without service_role.
-- Write access remains restricted to service_role as before.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trainers'
      AND policyname = 'trainers_authenticated_select_own'
  ) THEN
    CREATE POLICY trainers_authenticated_select_own
      ON public.trainers
      FOR SELECT
      TO authenticated
      USING (auth.uid() = auth_user_id);
  END IF;
END;
$$;

COMMIT;
