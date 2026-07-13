-- =============================================================================
-- Migration: incoming_webhook_logs_status_constraint_sync
-- Purpose: Align live incoming_webhook_logs.status constraint with the
-- currently deployed queue worker and downstream processing lifecycle.
-- =============================================================================

ALTER TABLE public.incoming_webhook_logs
  DROP CONSTRAINT IF EXISTS incoming_webhook_logs_status_check;

ALTER TABLE public.incoming_webhook_logs
  ADD CONSTRAINT incoming_webhook_logs_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'queued'::text,
        'processed'::text,
        'failed'::text,
        'skipped'::text,
        'pending'::text,
        'processing'::text,
        'CLAIMED'::text,
        'PROCESSING'::text,
        'RECLAIMED'::text,
        'SUCCESS'::text,
        'FAILED_HANDLED'::text,
        'RETRY'::text
      ]
    )
  );
