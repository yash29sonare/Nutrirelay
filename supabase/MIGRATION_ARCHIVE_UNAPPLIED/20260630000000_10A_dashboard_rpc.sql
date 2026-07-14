-- =============================================================================
-- Migration: 10A_dashboard_rpc
-- Fortress Fitness — Phase 10A Dashboard Data Engine
-- Phase 10B — stripped business logic, keeps only raw aggregation.
--
-- Creates get_dashboard_data RPC for single-call dashboard loading.
-- SECURITY DEFINER — called from service_role operations layer.
-- Read-only: no inserts, no updates, no side effects.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_dashboard_data(
  p_auth_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_trainer_id        uuid;
  v_trainer           json;
  v_active_clients    int;
  v_today_loggers     int;
  v_last_week_loggers int;
  v_compliance_ot     json;
  v_client_activity   json;
  v_recent_clients    json;
BEGIN
  -- ── Resolve trainer from auth ──────────────────────────────────
  SELECT trainer_id INTO v_trainer_id
  FROM trainers
  WHERE auth_user_id = p_auth_user_id;

  IF v_trainer_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- ── Trainer block ──────────────────────────────────────────────
  SELECT json_build_object(
    'id',               t.trainer_id,
    'auth_user_id',     t.auth_user_id,
    'onboarding_status', t.onboarding_status,
    'business_name',    t.business_name,
    'timezone',         t.timezone,
    'country',          t.country
  )
  INTO v_trainer
  FROM trainers t
  WHERE t.trainer_id = v_trainer_id;

  -- ── Raw: active client count ───────────────────────────────────
  SELECT COUNT(*)
  INTO v_active_clients
  FROM trainer_clients
  WHERE trainer_id = v_trainer_id AND is_active = true;

  -- ── Raw: clients who logged ≥1 meal today ──────────────────────
  SELECT COUNT(DISTINCT fl.client_id)
  INTO v_today_loggers
  FROM food_logs fl
  WHERE fl.trainer_id = v_trainer_id
    AND fl.logged_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  -- ── Raw: clients who logged ≥1 meal same day last week ─────────
  SELECT COUNT(DISTINCT fl.client_id)
  INTO v_last_week_loggers
  FROM food_logs fl
  WHERE fl.trainer_id = v_trainer_id
    AND fl.logged_at >= date_trunc('day', now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
    AND fl.logged_at <  date_trunc('day', now() AT TIME ZONE 'UTC') - INTERVAL '6 days';

  -- ── Raw: compliance over time (past 7 days, daily logger count) ─
  WITH daily_loggers AS (
    SELECT
      date_trunc('day', fl.logged_at AT TIME ZONE 'UTC')::date AS day,
      COUNT(DISTINCT fl.client_id) AS loggers
    FROM food_logs fl
    WHERE fl.trainer_id = v_trainer_id
      AND fl.logged_at >= date_trunc('day', now() AT TIME ZONE 'UTC') - INTERVAL '6 days'
    GROUP BY date_trunc('day', fl.logged_at AT TIME ZONE 'UTC')::date
  )
  SELECT COALESCE(json_agg(d ORDER BY d.date ASC), '[]'::json)
  INTO v_compliance_ot
  FROM (
    SELECT
      d.day::date              AS date,
      COALESCE(dl.loggers, 0)  AS logger_count
    FROM generate_series(
      (date_trunc('day', now() AT TIME ZONE 'UTC') - INTERVAL '6 days')::date,
      (date_trunc('day', now() AT TIME ZONE 'UTC'))::date,
      '1 day'::interval
    ) d(day)
    LEFT JOIN daily_loggers dl ON dl.day = d.day
  ) d;

  -- ── Raw: client activity (past 7 days) ─────────────────────────
  SELECT COALESCE(json_agg(a ORDER BY a.last_logged_at DESC NULLS LAST), '[]'::json)
  INTO v_client_activity
  FROM (
    SELECT
      p.id                                                             AS client_id,
      p.full_name                                                      AS client_name,
      COUNT(fl.id)                                                     AS meals_logged,
      MAX(fl.logged_at)                                                AS last_logged_at,
      ROUND(COALESCE(SUM(fl.calories), 0)::numeric, 2)                AS total_calories,
      ROUND(COALESCE(SUM(fl.protein_g), 0)::numeric, 2)               AS total_protein
    FROM profiles p
    INNER JOIN trainer_clients tc
      ON tc.client_id = p.id
      AND tc.trainer_id = v_trainer_id
      AND tc.is_active = true
    LEFT JOIN food_logs fl
      ON fl.client_id = p.id
      AND fl.logged_at >= date_trunc('day', now() AT TIME ZONE 'UTC') - INTERVAL '7 days'
    GROUP BY p.id, p.full_name
    LIMIT 50
  ) a;

  -- ── Raw: recent client summaries (today's stats via view) ──────
  SELECT COALESCE(json_agg(r ORDER BY r.client_name ASC), '[]'::json)
  INTO v_recent_clients
  FROM (
    SELECT *
    FROM dashboard_client_summaries
    WHERE trainer_id = v_trainer_id
  ) r;

  -- ── Assemble response (raw data only — no computed metrics) ────
  RETURN json_build_object(
    'trainer',     v_trainer,
    'metrics',     json_build_object(
      'activeClients',   v_active_clients,
      'todayLoggers',    v_today_loggers,
      'lastWeekLoggers', v_last_week_loggers
    ),
    'trends',      json_build_object(
      'complianceOverTime', v_compliance_ot,
      'clientActivity',     v_client_activity
    ),
    'clients',     json_build_object(
      'recent', v_recent_clients
    )
  );
END;
$$;

COMMIT;
