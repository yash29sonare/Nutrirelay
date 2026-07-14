-- =============================================================================
-- Migration: 07A_whatsapp_connections_audit_notify
-- Fortress Fitness — Phase 7.1A Canonical Tenancy Schema (Additive Only)
--
-- Creates:
--   - public.whatsapp_connections
--   - public.audit_logs
--   - public.notifications
--
-- RLS posture (per spec):
--   - Enable RLS immediately on new tables
--   - service_role-only access policies
--   - authenticated: NO ACCESS
--   - anon: NO ACCESS
--
-- Additive-only: does not modify existing tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1: WhatsApp Connections (WABA ownership)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  connection_id     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id        UUID         NOT NULL REFERENCES public.trainers(trainer_id) ON DELETE CASCADE,
  waba_id           TEXT         NOT NULL DEFAULT '',
  phone_number_id  TEXT         NOT NULL DEFAULT '',
  status            TEXT         NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'disconnected', 'pending')),
  connected_at     TIMESTAMPTZ,
  disconnected_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT whatsapp_connections_phone_number_id_uq UNIQUE (phone_number_id)
);

DROP TRIGGER IF EXISTS set_whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER set_whatsapp_connections_updated_at
BEFORE UPDATE ON public.whatsapp_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- SECTION 2: Audit Logs (append-only semantics)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
  audit_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  UUID         NOT NULL REFERENCES public.trainers(trainer_id) ON DELETE CASCADE,
  actor_id    TEXT         NOT NULL DEFAULT 'system',
  event_type  TEXT         NOT NULL DEFAULT '',
  entity_type TEXT        NOT NULL DEFAULT '',
  entity_id   TEXT         NOT NULL DEFAULT '',
  metadata    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Optional append-only guardrails (no hard trigger-based enforcement needed now,
-- but we ensure no update/delete via RLS in this additive phase).

-- -----------------------------------------------------------------------------
-- SECTION 3: Notifications
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  notification_id UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id      UUID         NOT NULL REFERENCES public.trainers(trainer_id) ON DELETE CASCADE,
  type            TEXT         NOT NULL DEFAULT '',
  status          TEXT         NOT NULL DEFAULT 'unread'
    CHECK (status IN ('unread', 'read')),
  payload         JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  read_at         TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;
-- (notifications currently has no updated_at field; do nothing)

-- -----------------------------------------------------------------------------
-- SECTION 4: RLS (service_role-only; authenticated/anon NO ACCESS)
-- -----------------------------------------------------------------------------

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;

-- WhatsApp connections: service_role can do everything
CREATE POLICY whatsapp_connections_service_role_all
  ON public.whatsapp_connections
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Audit logs: service_role can insert/select; deny update/delete by omitting policies
-- (absence => implicit DENY)
CREATE POLICY audit_logs_service_role_select
  ON public.audit_logs
  FOR SELECT TO service_role
  USING (true);

CREATE POLICY audit_logs_service_role_insert
  ON public.audit_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Notifications: service_role can insert/select
CREATE POLICY notifications_service_role_select
  ON public.notifications
  FOR SELECT TO service_role
  USING (true);

CREATE POLICY notifications_service_role_insert
  ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (true);

-- End
