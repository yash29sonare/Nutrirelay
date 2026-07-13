-- =============================================================================
-- Migration: 14_communication_logs
-- Purpose: Restore the canonical outbound/inbound communication log table
-- required by the WhatsApp dev console, outbound sender logging, and status
-- backfill logic.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.communication_logs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id        UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id         UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction         TEXT         NOT NULL
    CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  message_type      TEXT         NOT NULL
    CHECK (message_type IN ('TEXT', 'VOICE', 'IMAGE', 'POLL', 'TEMPLATE')),
  wam_id            TEXT,
  message_timestamp TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  delivery_status   TEXT,
  metadata          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_trainer_timestamp
  ON public.communication_logs (trainer_id, message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_communication_logs_client_timestamp
  ON public.communication_logs (client_id, message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_communication_logs_wam_id
  ON public.communication_logs (wam_id);

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'communication_logs'
      AND policyname = 'communication_logs_service_role_all'
  ) THEN
    CREATE POLICY communication_logs_service_role_all
      ON public.communication_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

COMMIT;
