-- ════════════════════════════════════════════════════════════
-- Engagement RLS — Row-Level Security for system tables
-- ════════════════════════════════════════════════════════════
-- Additive only: no existing tables or schemas are modified.
--
-- These tables are accessed via service_role client internally,
-- but RLS is enabled for defense-in-depth per Supabase best
-- practices. The service_role policies grant full access.
-- ════════════════════════════════════════════════════════════

-- ── engagement_events ──────────────────────────────────────

ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY engagement_events_service_role_all
  ON public.engagement_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY engagement_events_trainer_read
  ON public.engagement_events
  FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());

-- ── engagement_actions ─────────────────────────────────────

ALTER TABLE public.engagement_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY engagement_actions_service_role_all
  ON public.engagement_actions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY engagement_actions_trainer_read
  ON public.engagement_actions
  FOR SELECT
  TO authenticated
  USING (trainer_id = auth.uid());
