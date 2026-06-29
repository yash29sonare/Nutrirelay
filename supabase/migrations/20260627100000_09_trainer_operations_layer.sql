-- ── Phase 7.4: Trainer Operations Layer ─────────────────────────────────────────
-- Creates the client_lifecycle table for state-machine tracking.
-- Photo verification uses existing food_logs.verification_status.
-- Compliance overrides stored in existing audit_logs (JSONB metadata).
-- Every trainer action produces an audit_logs row.

-- 1. Lifecycle status enum
CREATE TYPE public.lifecycle_status AS ENUM (
  'INVITED',
  'ACTIVE',
  'PAUSED',
  'INACTIVE',
  'ARCHIVED'
);

-- 2. Client lifecycle table
CREATE TABLE public.client_lifecycle (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     public.lifecycle_status NOT NULL DEFAULT 'INVITED',
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, trainer_id)
);

-- 3. Indexes
CREATE INDEX idx_client_lifecycle_status   ON public.client_lifecycle(status);
CREATE INDEX idx_client_lifecycle_trainer  ON public.client_lifecycle(trainer_id);

-- 4. RLS
ALTER TABLE public.client_lifecycle ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; no public policies needed for operations layer.
-- All access is via service-role service functions.
CREATE POLICY "service_role_all" ON public.client_lifecycle
  FOR ALL TO service_role USING (true) WITH CHECK (true);
