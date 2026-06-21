-- =============================================================================
-- Migration: 01_core_schema
-- Phase 1, Task 3 — Core relational schema with utilities, triggers, indexes,
-- RLS activation, and temporary dev policies.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SECTION 1: Custom Types
-- -----------------------------------------------------------------------------

CREATE TYPE public.role_type AS ENUM ('trainer', 'client', 'admin');


-- -----------------------------------------------------------------------------
-- SECTION 2: Utility Trigger Functions
-- -----------------------------------------------------------------------------

-- Reusable updated_at stamper — attach as BEFORE UPDATE on every public table
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Auth sync — fires AFTER INSERT on auth.users, mirrors record into public.profiles.
-- SECURITY DEFINER + explicit search_path prevents search-path hijack attacks.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _raw_role  TEXT;
  _role      public.role_type;
BEGIN
  _raw_role := NEW.raw_user_meta_data ->> 'role';

  -- Safe cast: fall back to 'client' if value is missing or not a valid enum member
  BEGIN
    _role := _raw_role::public.role_type;
  EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
    _role := 'client';
  END;

  IF _role IS NULL THEN
    _role := 'client';
  END IF;

  INSERT INTO public.profiles (id, role, full_name, phone_number)
  VALUES (
    NEW.id,
    _role,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'phone_number'   -- nullable, no fallback needed
  );

  RETURN NEW;
END;
$$;


-- -----------------------------------------------------------------------------
-- SECTION 3: Core Tables
-- -----------------------------------------------------------------------------

-- profiles — 1:1 mirror of auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            public.role_type NOT NULL DEFAULT 'client',
  full_name       TEXT        NOT NULL DEFAULT '',
  phone_number    TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- trainer_clients — many-to-many mapping between trainer and client profiles
CREATE TABLE IF NOT EXISTS public.trainer_clients (
  trainer_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trainer_id, client_id)
);

-- meal_plans — a named macro plan assigned to a client by a trainer
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- meal_slots — individual structured meals within a plan (Breakfast, Lunch, etc.)
CREATE TABLE IF NOT EXISTS public.meal_slots (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id        UUID        NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  name                TEXT        NOT NULL,                -- e.g. 'Breakfast', 'Post-Workout'
  scheduled_time      TIME,
  window_minutes      INT         NOT NULL DEFAULT 30 CHECK (window_minutes >= 0),
  target_calories     NUMERIC(8,2) CHECK (target_calories >= 0),
  target_protein_g    NUMERIC(8,2) CHECK (target_protein_g >= 0),
  target_carbs_g      NUMERIC(8,2) CHECK (target_carbs_g >= 0),
  target_fat_g        NUMERIC(8,2) CHECK (target_fat_g >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- food_logs — per-meal client intake records with idempotency and proof-of-plate
CREATE TABLE IF NOT EXISTS public.food_logs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meal_slot_id          UUID        REFERENCES public.meal_slots(id) ON DELETE SET NULL,
  wam_id                TEXT        UNIQUE NOT NULL,       -- Meta message ID — idempotency key
  logged_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calories              NUMERIC(8,2) CHECK (calories >= 0),
  protein_g             NUMERIC(8,2) CHECK (protein_g >= 0),
  carbs_g               NUMERIC(8,2) CHECK (carbs_g >= 0),
  fat_g                 NUMERIC(8,2) CHECK (fat_g >= 0),
  verification_status   TEXT        NOT NULL DEFAULT 'UNVERIFIED'
                          CHECK (verification_status IN ('VERIFIED', 'UNVERIFIED', 'PENDING')),
  image_path            TEXT,                              -- Supabase Storage path
  transcription_failed  BOOLEAN     NOT NULL DEFAULT false,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- SECTION 4: Trigger Bindings
-- -----------------------------------------------------------------------------

-- Auth sync: mirror new auth.users rows into public.profiles
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at automation on every public table
CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_meal_slots_updated_at
  BEFORE UPDATE ON public.meal_slots
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_food_logs_updated_at
  BEFORE UPDATE ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- -----------------------------------------------------------------------------
-- SECTION 5: Performance Indexes
-- -----------------------------------------------------------------------------

-- trainer_clients: reverse lookup by client
CREATE INDEX IF NOT EXISTS idx_trainer_clients_client_id
  ON public.trainer_clients (client_id);

-- meal_plans: lookup by trainer or client
CREATE INDEX IF NOT EXISTS idx_meal_plans_trainer_id
  ON public.meal_plans (trainer_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client_id
  ON public.meal_plans (client_id);

-- meal_slots: lookup by parent plan
CREATE INDEX IF NOT EXISTS idx_meal_slots_meal_plan_id
  ON public.meal_slots (meal_plan_id);

-- food_logs: primary query paths
CREATE INDEX IF NOT EXISTS idx_food_logs_client_id
  ON public.food_logs (client_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_trainer_id
  ON public.food_logs (trainer_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_meal_slot_id
  ON public.food_logs (meal_slot_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_logged_at
  ON public.food_logs (logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_verification_status
  ON public.food_logs (verification_status);


-- -----------------------------------------------------------------------------
-- SECTION 6: Row-Level Security — Activation
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_slots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs       ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- SECTION 7: Temporary Dev RLS Policies
-- NOTE: These are placeholder policies for local development only.
-- Replace with multi-tenant trainer_id isolation policies before production.
-- -----------------------------------------------------------------------------

-- profiles
CREATE POLICY allow_temp_authenticated_all ON public.profiles
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- trainer_clients
CREATE POLICY allow_temp_authenticated_all ON public.trainer_clients
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- meal_plans
CREATE POLICY allow_temp_authenticated_all ON public.meal_plans
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- meal_slots
CREATE POLICY allow_temp_authenticated_all ON public.meal_slots
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- food_logs
CREATE POLICY allow_temp_authenticated_all ON public.food_logs
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
