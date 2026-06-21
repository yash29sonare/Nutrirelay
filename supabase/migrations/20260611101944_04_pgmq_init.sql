-- =============================================================================
-- Migration: 04_pgmq_init
-- Phase 2, Task 3 — Initialize WhatsApp message queue, public RPC wrapper,
-- and incoming webhook deduplication log table.
-- =============================================================================

-- Ensure pgmq extension is active (safe no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pgmq CASCADE;

-- Create the dedicated WhatsApp ingress queue
SELECT pgmq.create('whatsapp_incoming_queue');

-- Create pgmq_public schema for PostgREST-accessible RPC abstraction
CREATE SCHEMA IF NOT EXISTS pgmq_public;

-- RPC wrapper so the Edge Function can enqueue via PostgREST without direct DB access
CREATE OR REPLACE FUNCTION pgmq_public.send(queue_name TEXT, message JSONB)
RETURNS SETOF BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM pgmq.send(
    queue_name := queue_name,
    msg        := message
  );
END;
$$;

-- Grant execution rights to all Supabase roles
GRANT EXECUTE ON FUNCTION pgmq_public.send(TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION pgmq_public.send(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION pgmq_public.send(TEXT, JSONB) TO service_role;

-- Webhook deduplication log — tracks every processed wam_id to prevent double-processing
CREATE TABLE IF NOT EXISTS public.incoming_webhook_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wam_id       TEXT        NOT NULL,
  client_phone TEXT        NOT NULL,
  message_type TEXT        NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status       TEXT        NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processed', 'failed', 'skipped'))
);

-- Hard uniqueness constraint on wam_id — DB-level deduplication guard
CREATE UNIQUE INDEX IF NOT EXISTS incoming_webhook_logs_wam_id_idx
  ON public.incoming_webhook_logs (wam_id);

-- RLS
ALTER TABLE public.incoming_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Service role only — this table is written by system processes, not user sessions
CREATE POLICY incoming_webhook_logs_service_only ON public.incoming_webhook_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE TRIGGER set_incoming_webhook_logs_updated_at
  BEFORE UPDATE ON public.incoming_webhook_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
