-- =============================================================================
-- Migration: 02_infrastructure_schema
-- Phase 1, Task 4 — Specialized infrastructure tables: subscriptions,
-- upi_payments, voice_notes, strike_log, weekly_reports.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SECTION 1: Infrastructure ENUM Types
-- -----------------------------------------------------------------------------

CREATE TYPE public.payment_status_type    AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.processing_status_type AS ENUM ('pending', 'processing', 'completed', 'failed');


-- -----------------------------------------------------------------------------
-- SECTION 2: Infrastructure Tables
-- -----------------------------------------------------------------------------

-- subscriptions — client access lifecycle tracking
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id          UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID                     NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier_type   TEXT                     NOT NULL,
  status      TEXT                     NOT NULL,
  start_date  TIMESTAMP WITH TIME ZONE,
  end_date    TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- upi_payments — manual UPI financial clearings with OCR deduplication
CREATE TABLE IF NOT EXISTS public.upi_payments (
  id                      UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID                     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount                  NUMERIC(10,2)            NOT NULL CHECK (amount > 0),
  utr_number              TEXT                     NOT NULL UNIQUE,
  payment_status          public.payment_status_type NOT NULL DEFAULT 'pending',
  billing_screenshot_url  TEXT,
  created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- voice_notes — WhatsApp audio ingress deduplication and recovery engine
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id                    UUID                          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID                          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  whatsapp_message_id   TEXT                          NOT NULL UNIQUE,
  storage_bucket_url    TEXT                          NOT NULL,
  transcript            TEXT,
  processing_status     public.processing_status_type NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMP WITH TIME ZONE      NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE      NOT NULL DEFAULT NOW()
);

-- strike_log — member accountability loop for ghosting daemon
CREATE TABLE IF NOT EXISTS public.strike_log (
  id          UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID                     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason      TEXT                     NOT NULL,
  issued_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- weekly_reports — AI-generated progress analysis logs and PDF audit trail
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id              UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID                     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_date     DATE                     NOT NULL,
  summary         TEXT                     NOT NULL,
  pdf_storage_url TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- SECTION 3: Trigger Bindings — updated_at automation
-- -----------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_upi_payments_updated_at
  BEFORE UPDATE ON public.upi_payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_voice_notes_updated_at
  BEFORE UPDATE ON public.voice_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_strike_log_updated_at
  BEFORE UPDATE ON public.strike_log
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER set_weekly_reports_updated_at
  BEFORE UPDATE ON public.weekly_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- -----------------------------------------------------------------------------
-- SECTION 4: Performance Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id
  ON public.subscriptions (client_id);

CREATE INDEX IF NOT EXISTS idx_upi_payments_client_id
  ON public.upi_payments (client_id);

CREATE INDEX IF NOT EXISTS idx_voice_notes_client_id
  ON public.voice_notes (client_id);

CREATE INDEX IF NOT EXISTS idx_strike_log_profile_id
  ON public.strike_log (profile_id);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_client_id
  ON public.weekly_reports (client_id);


-- -----------------------------------------------------------------------------
-- SECTION 5: Row-Level Security — Activation
-- -----------------------------------------------------------------------------

ALTER TABLE public.subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strike_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports  ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- SECTION 6: Temporary Dev RLS Policies
-- NOTE: Placeholder policies for local development only.
-- Replace with multi-tenant trainer_id isolation policies before production.
-- -----------------------------------------------------------------------------

-- subscriptions
CREATE POLICY allow_temp_auth_infra_all ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- upi_payments
CREATE POLICY allow_temp_auth_infra_all ON public.upi_payments
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- voice_notes
CREATE POLICY allow_temp_auth_infra_all ON public.voice_notes
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- strike_log
CREATE POLICY allow_temp_auth_infra_all ON public.strike_log
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- weekly_reports
CREATE POLICY allow_temp_auth_infra_all ON public.weekly_reports
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
