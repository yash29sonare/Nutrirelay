-- =============================================================================
-- Migration: 03_rls_hardening
-- Phase 1, Task 5 — Replace temporary dev policies with production-grade
-- multi-tenant isolation. Trainers see only their own data; clients see only
-- their own records. Service role bypasses RLS for system operations.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SECTION 1: Drop all temporary development policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS allow_temp_authenticated_all ON public.profiles;
DROP POLICY IF EXISTS allow_temp_authenticated_all ON public.trainer_clients;
DROP POLICY IF EXISTS allow_temp_authenticated_all ON public.meal_plans;
DROP POLICY IF EXISTS allow_temp_authenticated_all ON public.meal_slots;
DROP POLICY IF EXISTS allow_temp_authenticated_all ON public.food_logs;
DROP POLICY IF EXISTS allow_temp_auth_infra_all    ON public.subscriptions;
DROP POLICY IF EXISTS allow_temp_auth_infra_all    ON public.upi_payments;
DROP POLICY IF EXISTS allow_temp_auth_infra_all    ON public.voice_notes;
DROP POLICY IF EXISTS allow_temp_auth_infra_all    ON public.strike_log;
DROP POLICY IF EXISTS allow_temp_auth_infra_all    ON public.weekly_reports;


-- -----------------------------------------------------------------------------
-- SECTION 2: profiles
-- Users read/write their own profile.
-- Trainers can read their linked clients' profiles.
-- -----------------------------------------------------------------------------

-- Every authenticated user can read their own row
CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Trainers can read profiles of clients they manage
CREATE POLICY profiles_trainer_read_clients ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = profiles.id
    )
  );

-- Users can only update their own profile
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- handle_new_user() inserts via SECURITY DEFINER — no INSERT policy needed for users.
-- Service role (webhooks, background jobs) bypasses RLS entirely.


-- -----------------------------------------------------------------------------
-- SECTION 3: trainer_clients
-- Trainers manage their own mappings. Clients can read their own mapping.
-- -----------------------------------------------------------------------------

CREATE POLICY trainer_clients_trainer_all ON public.trainer_clients
  FOR ALL TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY trainer_clients_client_read ON public.trainer_clients
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);


-- -----------------------------------------------------------------------------
-- SECTION 4: meal_plans
-- Trainers own their plans. Clients can read their assigned plans.
-- -----------------------------------------------------------------------------

CREATE POLICY meal_plans_trainer_all ON public.meal_plans
  FOR ALL TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY meal_plans_client_read ON public.meal_plans
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);


-- -----------------------------------------------------------------------------
-- SECTION 5: meal_slots
-- No direct trainer_id — isolate via parent meal_plan.
-- -----------------------------------------------------------------------------

CREATE POLICY meal_slots_trainer_all ON public.meal_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_slots.meal_plan_id
        AND mp.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_slots.meal_plan_id
        AND mp.trainer_id = auth.uid()
    )
  );

CREATE POLICY meal_slots_client_read ON public.meal_slots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp
      WHERE mp.id = meal_slots.meal_plan_id
        AND mp.client_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- SECTION 6: food_logs
-- Trainers see all logs for their clients. Clients see their own logs.
-- -----------------------------------------------------------------------------

CREATE POLICY food_logs_trainer_all ON public.food_logs
  FOR ALL TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY food_logs_client_read ON public.food_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);


-- -----------------------------------------------------------------------------
-- SECTION 7: subscriptions
-- No trainer_id — trainers access via trainer_clients join.
-- -----------------------------------------------------------------------------

CREATE POLICY subscriptions_trainer_all ON public.subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = subscriptions.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = subscriptions.client_id
    )
  );

CREATE POLICY subscriptions_client_read ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);


-- -----------------------------------------------------------------------------
-- SECTION 8: upi_payments
-- No trainer_id — trainers access via trainer_clients join.
-- -----------------------------------------------------------------------------

CREATE POLICY upi_payments_trainer_all ON public.upi_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = upi_payments.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = upi_payments.client_id
    )
  );

CREATE POLICY upi_payments_client_read ON public.upi_payments
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);


-- -----------------------------------------------------------------------------
-- SECTION 9: voice_notes
-- No trainer_id — trainers access via trainer_clients join.
-- -----------------------------------------------------------------------------

CREATE POLICY voice_notes_trainer_all ON public.voice_notes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = voice_notes.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = voice_notes.client_id
    )
  );

CREATE POLICY voice_notes_client_read ON public.voice_notes
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);


-- -----------------------------------------------------------------------------
-- SECTION 10: strike_log
-- profile_id is the client being tracked.
-- Trainers access via trainer_clients join on profile_id.
-- -----------------------------------------------------------------------------

CREATE POLICY strike_log_trainer_all ON public.strike_log
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = strike_log.profile_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = strike_log.profile_id
    )
  );

-- Clients can read their own strike records
CREATE POLICY strike_log_client_read ON public.strike_log
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);


-- -----------------------------------------------------------------------------
-- SECTION 11: weekly_reports
-- No trainer_id — trainers access via trainer_clients join.
-- -----------------------------------------------------------------------------

CREATE POLICY weekly_reports_trainer_all ON public.weekly_reports
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = weekly_reports.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id = weekly_reports.client_id
    )
  );

CREATE POLICY weekly_reports_client_read ON public.weekly_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);
