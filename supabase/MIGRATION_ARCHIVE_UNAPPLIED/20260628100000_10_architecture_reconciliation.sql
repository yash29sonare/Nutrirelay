-- =============================================================================
-- Migration: 10_architecture_reconciliation
-- Phase 7.7 — Resolve identity model, subscription naming collision,
-- WhatsApp credential consolidation, and audit log FK integrity.
--
-- ADDITIVE + BACKWARD-COMPATIBLE:
--   - Renames subscriptions → client_subscriptions (with compat VIEW)
--   - Creates trainer_subscriptions (trainer SaaS billing, FK → profiles.id)
--   - Creates payment_reviews (FK → profiles.id, trainer_subscriptions)
--   - Fixes audit_logs FK (trainers.trainer_id → profiles.id)
--   - Drops unused whatsapp_connections table
--   - Drops unused trainers.whatsapp_business_id
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: CANONICAL IDENTITY — Fix audit_logs FK
-- =============================================================================
-- audit_logs.trainer_id stores profiles.id values but FK was pointing to
-- trainers.trainer_id (NOT VALID). Drop the broken FK and add real one.
ALTER TABLE IF EXISTS public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_trainer_id_fkey;

ALTER TABLE IF EXISTS public.audit_logs
  ADD CONSTRAINT audit_logs_trainer_id_fkey
  FOREIGN KEY (trainer_id) REFERENCES public.profiles(id) ON DELETE CASCADE
  NOT VALID;

-- =============================================================================
-- SECTION 2: SUBSCRIPTION RENAME — Resolve naming collision
-- =============================================================================
-- Legacy client-coaching subscriptions renamed to client_subscriptions.
-- A backward-compatible VIEW preserves old queries during transition.

ALTER TABLE IF EXISTS public.subscriptions RENAME TO client_subscriptions;

-- Drop the old trigger that still references the old table name
DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.client_subscriptions;
CREATE TRIGGER set_client_subscriptions_updated_at
  BEFORE UPDATE ON public.client_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Backward-compat VIEW for SELECT queries during code migration
CREATE OR REPLACE VIEW public.subscriptions AS
  SELECT * FROM public.client_subscriptions;

-- Drop old RLS policies on the old name, create on new
DROP POLICY IF EXISTS subscriptions_trainer_all ON public.client_subscriptions;
DROP POLICY IF EXISTS subscriptions_client_read ON public.client_subscriptions;
DROP POLICY IF EXISTS allow_temp_auth_infra_all ON public.client_subscriptions;
DROP POLICY IF EXISTS subscriptions_service_role_all ON public.client_subscriptions;

-- Re-add RLS for client_subscriptions
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_subscriptions_service_role_all
  ON public.client_subscriptions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================================
-- SECTION 3: TRAINER SUBSCRIPTIONS — SaaS billing table
-- =============================================================================
-- Uses profiles.id as canonical trainer identity FK.

CREATE TABLE IF NOT EXISTS public.trainer_subscriptions (
  subscription_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id        UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id           TEXT         NOT NULL REFERENCES public.plans(plan_id),
  status            TEXT         NOT NULL DEFAULT 'pending_review',
  started_at        TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (status IN (
    'pending_review', 'under_review', 'active',
    'suspended', 'expired', 'cancelled', 'grace_period'
  ))
);

CREATE INDEX IF NOT EXISTS idx_trainer_subscriptions_trainer
  ON public.trainer_subscriptions (trainer_id);

DROP TRIGGER IF EXISTS set_trainer_subscriptions_updated_at ON public.trainer_subscriptions;
CREATE TRIGGER set_trainer_subscriptions_updated_at
  BEFORE UPDATE ON public.trainer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.trainer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY trainer_subscriptions_service_role_all
  ON public.trainer_subscriptions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================================
-- SECTION 4: PAYMENT REVIEWS
-- =============================================================================
-- Recreated from scratch with correct FKs (was never created due to
-- subscription naming collision in 07A migration).

CREATE TABLE IF NOT EXISTS public.payment_reviews (
  payment_review_id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id          UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id     UUID         NOT NULL REFERENCES public.trainer_subscriptions(subscription_id) ON DELETE CASCADE,
  status              TEXT         NOT NULL DEFAULT 'pending',
  proof_metadata      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  review_notes        TEXT,
  reviewed_by         TEXT,
  reviewed_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CHECK (status IN ('pending', 'submitted', 'under_review', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_payment_reviews_trainer
  ON public.payment_reviews (trainer_id);

CREATE INDEX IF NOT EXISTS idx_payment_reviews_subscription
  ON public.payment_reviews (subscription_id);

DROP TRIGGER IF EXISTS set_payment_reviews_updated_at ON public.payment_reviews;
CREATE TRIGGER set_payment_reviews_updated_at
  BEFORE UPDATE ON public.payment_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.payment_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_reviews_service_role_all
  ON public.payment_reviews
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================================
-- SECTION 5: WHATSAPP CONSOLIDATION
-- =============================================================================
-- whatsapp_connections (07A, FK → trainers.trainer_id) was never used by
-- runtime code. Runtime uses trainer_waba_credentials (FK → profiles.id).
-- Drop the unused table and its artifacts.

DROP POLICY IF EXISTS whatsapp_connections_service_role_all ON public.whatsapp_connections;
DROP TRIGGER IF EXISTS set_whatsapp_connections_updated_at ON public.whatsapp_connections;
DROP TABLE IF EXISTS public.whatsapp_connections;

-- trainers.whatsapp_business_id is never read by runtime code.
-- trainer_waba_credentials is the canonical WABA credential store.
ALTER TABLE IF EXISTS public.trainers
  DROP COLUMN IF EXISTS whatsapp_business_id;

-- =============================================================================
-- SECTION 6: TRAINERS TABLE CLEANUP
-- =============================================================================
-- Remove columns that are duplicated in profiles or unused.
-- Keep trainers as metadata extension of profiles (joined via auth_user_id).

ALTER TABLE IF EXISTS public.trainers
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS role;

-- =============================================================================
-- SECTION 7: PLANS FEATURE FLAGS — Seed safe defaults
-- =============================================================================
-- Ensure all plans have explicit feature flags for entitlement checks.
-- If a feature key is absent, checkFeatureAccess returns false (blocked).

UPDATE public.plans
SET feature_flags = jsonb_build_object(
  'meal_reminders', true,
  'weekly_reports', true,
  'monthly_reports', true,
  'ghosting_detection', true,
  'goal_prediction', true,
  'escalation', false
)
WHERE feature_flags = '{}'::jsonb;

COMMIT;
