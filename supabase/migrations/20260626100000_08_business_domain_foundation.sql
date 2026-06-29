-- =============================================================================
-- Migration: 08_business_domain_foundation
-- Phase 7.3 — Business domain entities required for trainer dashboard,
-- client lifecycle, compliance tracking, reporting, and automation.
--
-- ADDITIVE ONLY: Creates 8 new tables. No modifications to existing tables,
-- RLS policies, or pipeline/worker/queue code.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1: CLIENT GOALS DOMAIN
-- Client outcome tracking with one-active-goal enforcement
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_goals (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id         UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal_type          TEXT         NOT NULL CHECK (goal_type IN (
    'LOSE_WEIGHT', 'GAIN_WEIGHT', 'MAINTAIN_WEIGHT', 'RECOMPOSITION'
  )),
  target_weight      NUMERIC(6,2),
  starting_weight    NUMERIC(6,2),
  current_weight     NUMERIC(6,2),
  target_date        DATE,
  weekly_target_rate NUMERIC(6,2),
  goal_status        TEXT         NOT NULL DEFAULT 'ACTIVE' CHECK (goal_status IN (
    'ACTIVE', 'COMPLETED', 'FAILED', 'PAUSED'
  )),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Enforce at most one active goal per client
CREATE UNIQUE INDEX IF NOT EXISTS client_goals_one_active_idx
  ON public.client_goals (client_id) WHERE goal_status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_client_goals_client_id
  ON public.client_goals (client_id);

CREATE INDEX IF NOT EXISTS idx_client_goals_trainer_id
  ON public.client_goals (trainer_id);

ALTER TABLE public.client_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_goals_trainer_all ON public.client_goals
  FOR ALL TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY client_goals_client_read ON public.client_goals
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

DROP TRIGGER IF EXISTS set_client_goals_updated_at ON public.client_goals;
CREATE TRIGGER set_client_goals_updated_at
  BEFORE UPDATE ON public.client_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- SECTION 2: CLIENT HEALTH PROFILE DOMAIN
-- Onboarding health data — one profile per client
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_health_profiles (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID         NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  age               INT,
  gender            TEXT,
  height_cm         NUMERIC(5,1),
  weight_kg         NUMERIC(5,1),
  diet_type         TEXT,
  allergies         TEXT[],
  food_restrictions TEXT[],
  medical_notes     TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_health_profiles_trainer_all ON public.client_health_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = client_health_profiles.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = client_health_profiles.client_id
    )
  );

CREATE POLICY client_health_profiles_client_all ON public.client_health_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

DROP TRIGGER IF EXISTS set_client_health_profiles_updated_at ON public.client_health_profiles;
CREATE TRIGGER set_client_health_profiles_updated_at
  BEFORE UPDATE ON public.client_health_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- SECTION 3: WORKOUT SCHEDULE DOMAIN
-- Automation timing and scheduling support
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_workout_schedules (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timezone               TEXT         NOT NULL DEFAULT 'UTC',
  workout_time           TIME,
  preferred_checkin_time TIME,
  rest_days              TEXT[],
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_workout_schedules_client_id
  ON public.client_workout_schedules (client_id);

ALTER TABLE public.client_workout_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_workout_schedules_trainer_all ON public.client_workout_schedules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = client_workout_schedules.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = client_workout_schedules.client_id
    )
  );

CREATE POLICY client_workout_schedules_client_all ON public.client_workout_schedules
  FOR ALL TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

DROP TRIGGER IF EXISTS set_client_workout_schedules_updated_at ON public.client_workout_schedules;
CREATE TRIGGER set_client_workout_schedules_updated_at
  BEFORE UPDATE ON public.client_workout_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- SECTION 4: COMMUNICATION PREFERENCES DOMAIN
-- Client notification and communication preferences
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_preferences (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID         NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_language  TEXT         NOT NULL DEFAULT 'en',
  accept_voice_notes  BOOLEAN      NOT NULL DEFAULT true,
  accept_polls        BOOLEAN      NOT NULL DEFAULT true,
  accept_images       BOOLEAN      NOT NULL DEFAULT true,
  quiet_hours_start   TIME,
  quiet_hours_end     TIME,
  timezone            TEXT         NOT NULL DEFAULT 'UTC',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_preferences_trainer_all ON public.client_preferences
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = client_preferences.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = client_preferences.client_id
    )
  );

CREATE POLICY client_preferences_client_all ON public.client_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

DROP TRIGGER IF EXISTS set_client_preferences_updated_at ON public.client_preferences;
CREATE TRIGGER set_client_preferences_updated_at
  BEFORE UPDATE ON public.client_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- SECTION 5: COMPLIANCE DOMAIN
-- Read-model compliance snapshots — calculated, never directly edited
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.client_compliance_snapshots (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  compliance_score NUMERIC(5,2),
  risk_score       NUMERIC(5,2),
  status_color     TEXT         NOT NULL DEFAULT 'GREEN' CHECK (status_color IN (
    'GREEN', 'YELLOW', 'RED'
  )),
  calculated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_snapshots_client_id
  ON public.client_compliance_snapshots (client_id);

CREATE INDEX IF NOT EXISTS idx_compliance_snapshots_trainer_id
  ON public.client_compliance_snapshots (trainer_id);

ALTER TABLE public.client_compliance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_snapshots_trainer_read ON public.client_compliance_snapshots
  FOR SELECT TO authenticated
  USING (auth.uid() = trainer_id);

CREATE POLICY compliance_snapshots_client_read ON public.client_compliance_snapshots
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

-- -----------------------------------------------------------------------------
-- SECTION 6: AUTOMATION CONFIGURATION DOMAIN
-- Per-trainer automation toggles
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trainer_automations (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id                UUID         NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  meal_reminders_enabled    BOOLEAN      NOT NULL DEFAULT true,
  weekly_reports_enabled    BOOLEAN      NOT NULL DEFAULT true,
  monthly_reports_enabled   BOOLEAN      NOT NULL DEFAULT true,
  ghosting_detection_enabled BOOLEAN    NOT NULL DEFAULT true,
  escalation_enabled        BOOLEAN      NOT NULL DEFAULT false,
  goal_prediction_enabled   BOOLEAN      NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trainer_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY trainer_automations_trainer_all ON public.trainer_automations
  FOR ALL TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

DROP TRIGGER IF EXISTS set_trainer_automations_updated_at ON public.trainer_automations;
CREATE TRIGGER set_trainer_automations_updated_at
  BEFORE UPDATE ON public.trainer_automations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- SECTION 7: COMMUNICATION TIMELINE DOMAIN
-- Append-only client communication history
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.communication_logs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id       UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id        UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction        TEXT         NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  message_type     TEXT         NOT NULL CHECK (message_type IN ('TEXT', 'VOICE', 'IMAGE', 'POLL', 'TEMPLATE')),
  wam_id           TEXT,
  message_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_status  TEXT,
  metadata         JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_logs_client_id
  ON public.communication_logs (client_id);

CREATE INDEX IF NOT EXISTS idx_communication_logs_trainer_id
  ON public.communication_logs (trainer_id);

CREATE INDEX IF NOT EXISTS idx_communication_logs_timestamp
  ON public.communication_logs (message_timestamp DESC);

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY communication_logs_trainer_all ON public.communication_logs
  FOR ALL TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY communication_logs_client_read ON public.communication_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

-- -----------------------------------------------------------------------------
-- SECTION 8: MONTHLY REPORTING DOMAIN
-- Per-client monthly coach reports
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id             UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_month           DATE         NOT NULL,
  compliance_score       NUMERIC(5,2),
  goal_projection_score  NUMERIC(5,2),
  predicted_goal_success BOOLEAN,
  summary                TEXT,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- One report per client per month
CREATE UNIQUE INDEX IF NOT EXISTS monthly_reports_client_month_idx
  ON public.monthly_reports (client_id, report_month);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_trainer_id
  ON public.monthly_reports (trainer_id);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY monthly_reports_trainer_all ON public.monthly_reports
  FOR ALL TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY monthly_reports_client_read ON public.monthly_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);
