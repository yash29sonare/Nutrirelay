-- =============================================================================
-- Migration: 13_whatsapp_testability
-- NutriRelay / Fortress Fitness — additive WhatsApp developer testability layer
--
-- Creates:
--   - public.trainer_waba_credentials
--   - public.whatsapp_webhook_events
--   - public.whatsapp_message_statuses
--
-- Purpose:
--   - establish the canonical trainer-scoped WABA credential table used by runtime
--   - persist every raw webhook payload for debugging and Meta test verification
--   - persist outbound WhatsApp message status packets (sent / delivered / read / failed)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- SECTION 1: Canonical trainer-scoped WABA credentials
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trainer_waba_credentials (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id           UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number_id      TEXT         NOT NULL,
  access_token         TEXT         NOT NULL,
  waba_id              TEXT,
  business_account_id  TEXT,
  phone_number         TEXT,
  status               TEXT         NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'connected', 'disconnected')),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT trainer_waba_credentials_trainer_id_uq UNIQUE (trainer_id),
  CONSTRAINT trainer_waba_credentials_phone_number_id_uq UNIQUE (phone_number_id)
);

CREATE INDEX IF NOT EXISTS idx_trainer_waba_credentials_status
  ON public.trainer_waba_credentials (status);

ALTER TABLE public.trainer_waba_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trainer_waba_credentials'
      AND policyname = 'trainer_waba_credentials_service_role_all'
  ) THEN
    CREATE POLICY trainer_waba_credentials_service_role_all
      ON public.trainer_waba_credentials
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS set_trainer_waba_credentials_updated_at ON public.trainer_waba_credentials;
CREATE TRIGGER set_trainer_waba_credentials_updated_at
  BEFORE UPDATE ON public.trainer_waba_credentials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- SECTION 2: Raw webhook payload persistence
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id            UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  meta_event_id         TEXT,
  wam_id                TEXT,
  client_phone          TEXT,
  event_category        TEXT         NOT NULL DEFAULT 'unknown'
    CHECK (event_category IN ('message', 'status', 'unknown')),
  event_type            TEXT         NOT NULL DEFAULT 'unknown',
  signature_validation  TEXT         NOT NULL DEFAULT 'skipped'
    CHECK (signature_validation IN ('skipped', 'passed', 'failed')),
  processing_status     TEXT         NOT NULL DEFAULT 'received'
    CHECK (processing_status IN (
      'received',
      'signature_failed',
      'malformed_json',
      'status_recorded',
      'queued',
      'ignored',
      'queue_error',
      'accepted'
    )),
  processing_metadata   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  payload               JSONB        NOT NULL,
  received_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_received_at
  ON public.whatsapp_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_wam_id
  ON public.whatsapp_webhook_events (wam_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_trainer_id
  ON public.whatsapp_webhook_events (trainer_id);

ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_webhook_events'
      AND policyname = 'whatsapp_webhook_events_service_role_all'
  ) THEN
    CREATE POLICY whatsapp_webhook_events_service_role_all
      ON public.whatsapp_webhook_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS set_whatsapp_webhook_events_updated_at ON public.whatsapp_webhook_events;
CREATE TRIGGER set_whatsapp_webhook_events_updated_at
  BEFORE UPDATE ON public.whatsapp_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- SECTION 3: WhatsApp message status persistence
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_message_statuses (
  id                               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id                       UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  wam_id                           TEXT         NOT NULL,
  client_phone                     TEXT,
  recipient_id                     TEXT,
  status                           TEXT         NOT NULL,
  meta_status_timestamp            TIMESTAMPTZ,
  conversation_id                  TEXT,
  conversation_origin_type         TEXT,
  conversation_expiration_timestamp TIMESTAMPTZ,
  pricing_category                 TEXT,
  pricing_model                    TEXT,
  pricing_billable                 BOOLEAN,
  error_payload                    JSONB,
  payload                          JSONB        NOT NULL,
  received_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at                       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT whatsapp_message_statuses_fingerprint_uq
    UNIQUE (wam_id, status, meta_status_timestamp, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_statuses_wam_id
  ON public.whatsapp_message_statuses (wam_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_statuses_trainer_id
  ON public.whatsapp_message_statuses (trainer_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_statuses_received_at
  ON public.whatsapp_message_statuses (received_at DESC);

ALTER TABLE public.whatsapp_message_statuses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_message_statuses'
      AND policyname = 'whatsapp_message_statuses_service_role_all'
  ) THEN
    CREATE POLICY whatsapp_message_statuses_service_role_all
      ON public.whatsapp_message_statuses
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

COMMIT;
