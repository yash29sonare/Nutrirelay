-- =============================================================================
-- Migration: 06_add_retry_count
-- Phase 5.2.2 — Add retry counter to incoming_webhook_logs for RETRY safety cap
-- =============================================================================

ALTER TABLE IF EXISTS public.incoming_webhook_logs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
