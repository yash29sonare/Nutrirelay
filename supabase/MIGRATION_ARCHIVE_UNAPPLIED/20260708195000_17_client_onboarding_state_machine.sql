BEGIN;

CREATE TABLE IF NOT EXISTS public.client_onboarding_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  onboarding_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed', 'paused')),
  current_step TEXT NOT NULL DEFAULT 'height'
    CHECK (current_step IN (
      'height',
      'weight',
      'goal',
      'target_weight',
      'allergies',
      'food_preferences',
      'routine_times',
      'workout_schedule',
      'checkin_preference',
      'complete'
    )),
  collected_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_question_sent_at TIMESTAMPTZ,
  last_answer_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_onboarding_states_client_id_uq UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_states_trainer_id
  ON public.client_onboarding_states (trainer_id);

ALTER TABLE public.client_onboarding_states ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_onboarding_states'
      AND policyname = 'client_onboarding_states_service_role_all'
  ) THEN
    CREATE POLICY client_onboarding_states_service_role_all
      ON public.client_onboarding_states
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS set_client_onboarding_states_updated_at ON public.client_onboarding_states;
CREATE TRIGGER set_client_onboarding_states_updated_at
  BEFORE UPDATE ON public.client_onboarding_states
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.client_workout_schedules
  ADD COLUMN IF NOT EXISTS breakfast_time TIME,
  ADD COLUMN IF NOT EXISTS lunch_time TIME,
  ADD COLUMN IF NOT EXISTS snack_time TIME,
  ADD COLUMN IF NOT EXISTS dinner_time TIME,
  ADD COLUMN IF NOT EXISTS workout_days TEXT[],
  ADD COLUMN IF NOT EXISTS checkin_preference TEXT,
  ADD COLUMN IF NOT EXISTS post_workout_delay_minutes INT,
  ADD COLUMN IF NOT EXISTS pre_workout_offset_minutes INT;

COMMIT;
