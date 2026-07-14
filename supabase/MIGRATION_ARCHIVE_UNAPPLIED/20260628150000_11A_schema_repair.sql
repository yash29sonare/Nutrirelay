-- =============================================================================
-- Migration: 11A_schema_repair
-- Phase 7.12 — Production blocker remediation.
--
-- ADDITIVE + BACKWARD-COMPATIBLE:
--   - Secures the subscriptions VIEW with security_invoker
--   - Defensive cleanup of artifacts from 07A (if partially applied)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- SECTION 1: Secure backward-compat VIEW
-- -----------------------------------------------------------------------------
-- The subscriptions VIEW was created without security_invoker in migration 10.
-- This means PostgREST would run it under the owner's privileges (bypassing RLS)
-- if the VIEW were granted to API roles. With security_invoker = true, the VIEW
-- respects RLS policies on the underlying client_subscriptions table.
--
-- Runtime callers (subscriptionVerifier.ts, whatsappPipeline.ts) use service_role
-- or direct DB access which bypasses RLS regardless — no behavior change for them.
-- The VIEW columns and row semantics are unchanged.

CREATE OR REPLACE VIEW public.subscriptions
WITH (security_invoker = true)
AS
  SELECT * FROM public.client_subscriptions;

-- -----------------------------------------------------------------------------
-- SECTION 2: Defensive cleanup — 07A payment_reviews
-- -----------------------------------------------------------------------------
-- Migration 07A attempted to create payment_reviews with a FK to
-- subscriptions(subscription_id) — a column that doesn't exist on the
-- actual subscriptions table (created by migration 02 with PK `id`).
-- This means payment_reviews was NEVER created by 07A.
-- If it somehow exists with the wrong FK, drop it so migration 10's
-- correct version (with FK to trainer_subscriptions) is used.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'payment_reviews' AND table_schema = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'payment_reviews'
      AND ccu.table_name = 'trainer_subscriptions'
  ) THEN
    DROP TABLE IF EXISTS public.payment_reviews;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- SECTION 3: Defensive cleanup — 07A subscriptions (alternate schema)
-- -----------------------------------------------------------------------------
-- If the 07A subscriptions table was somehow created (extremely unlikely,
-- since IF NOT EXISTS prevented it), drop it to avoid name collision with
-- the backward-compat VIEW from migration 10.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions'
      AND column_name = 'subscription_id'
      AND table_schema = 'public'
  ) THEN
    DROP TABLE IF EXISTS public.subscriptions CASCADE;
  END IF;
END;
$$;

COMMIT;
