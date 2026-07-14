-- =============================================================================
-- Migration: 16_food_log_review_workflow
-- Purpose: Add minimal NutriRelay AI nutrition review state to food_logs.
-- =============================================================================

BEGIN;

ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS review_state TEXT NOT NULL DEFAULT 'auto_logged'
    CHECK (review_state IN (
      'auto_logged',
      'needs_review',
      'reviewed',
      'corrected',
      'rejected',
      'merged'
    )),
  ADD COLUMN IF NOT EXISTS ai_confidence TEXT NOT NULL DEFAULT 'high'
    CHECK (ai_confidence IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS review_reason TEXT
    CHECK (
      review_reason IS NULL OR review_reason IN (
        'unclear_quantity',
        'unknown_food',
        'image_only',
        'conflicting_input',
        'duplicate_possible',
        'low_confidence_ai',
        'client_correction',
        'trainer_requested'
      )
    ),
  ADD COLUMN IF NOT EXISTS trainer_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES public.food_logs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_food_logs_review_queue
  ON public.food_logs (trainer_id, review_state, logged_at DESC)
  WHERE review_state = 'needs_review';

CREATE INDEX IF NOT EXISTS idx_food_logs_merged_into
  ON public.food_logs (merged_into_id)
  WHERE merged_into_id IS NOT NULL;

UPDATE public.food_logs
SET review_state = CASE
    WHEN verification_status = 'VERIFIED' THEN 'reviewed'
    WHEN image_path IS NOT NULL THEN 'needs_review'
    WHEN notes ILIKE '%unknown%' THEN 'needs_review'
    ELSE 'auto_logged'
  END,
  ai_confidence = CASE
    WHEN image_path IS NOT NULL THEN 'medium'
    WHEN notes ILIKE '%unknown%' THEN 'low'
    ELSE 'high'
  END,
  review_reason = CASE
    WHEN image_path IS NOT NULL THEN 'image_only'
    WHEN notes ILIKE '%unknown%' THEN 'unknown_food'
    ELSE review_reason
  END
WHERE review_state = 'auto_logged'
  AND (
    verification_status = 'VERIFIED'
    OR image_path IS NOT NULL
    OR notes ILIKE '%unknown%'
  );

COMMIT;
