-- =============================================================================
-- Migration: trainer_client_message_drafts
-- Purpose: Store one editable per-trainer, per-WhatsApp-client custom message
-- draft for diet follow-up messages. Additive only; no existing data changes.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.trainer_client_message_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  whatsapp_client_id uuid NOT NULL REFERENCES public.trainer_whatsapp_clients(client_id) ON DELETE CASCADE,
  title text,
  body text NOT NULL CHECK (length(btrim(body)) > 0 AND length(body) <= 4000),
  purpose text NOT NULL DEFAULT 'diet_followup',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trainer_client_message_drafts_title_length
    CHECK (title IS NULL OR length(title) <= 120),
  CONSTRAINT trainer_client_message_drafts_purpose_check
    CHECK (purpose IN ('diet_followup')),
  CONSTRAINT trainer_client_message_drafts_unique_purpose
    UNIQUE (trainer_id, whatsapp_client_id, purpose)
);

CREATE INDEX IF NOT EXISTS idx_trainer_client_message_drafts_trainer_client
  ON public.trainer_client_message_drafts (trainer_id, whatsapp_client_id);

ALTER TABLE public.trainer_client_message_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trainer_client_message_drafts_trainer_select
  ON public.trainer_client_message_drafts;
CREATE POLICY trainer_client_message_drafts_trainer_select
  ON public.trainer_client_message_drafts
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = trainer_id
    AND EXISTS (
      SELECT 1
      FROM public.trainer_whatsapp_clients twc
      WHERE twc.client_id = trainer_client_message_drafts.whatsapp_client_id
        AND twc.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS trainer_client_message_drafts_trainer_insert
  ON public.trainer_client_message_drafts;
CREATE POLICY trainer_client_message_drafts_trainer_insert
  ON public.trainer_client_message_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = trainer_id
    AND EXISTS (
      SELECT 1
      FROM public.trainer_whatsapp_clients twc
      WHERE twc.client_id = trainer_client_message_drafts.whatsapp_client_id
        AND twc.trainer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS trainer_client_message_drafts_trainer_update
  ON public.trainer_client_message_drafts;
CREATE POLICY trainer_client_message_drafts_trainer_update
  ON public.trainer_client_message_drafts
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = trainer_id
    AND EXISTS (
      SELECT 1
      FROM public.trainer_whatsapp_clients twc
      WHERE twc.client_id = trainer_client_message_drafts.whatsapp_client_id
        AND twc.trainer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (select auth.uid()) = trainer_id
    AND EXISTS (
      SELECT 1
      FROM public.trainer_whatsapp_clients twc
      WHERE twc.client_id = trainer_client_message_drafts.whatsapp_client_id
        AND twc.trainer_id = (select auth.uid())
    )
  );

COMMIT;
