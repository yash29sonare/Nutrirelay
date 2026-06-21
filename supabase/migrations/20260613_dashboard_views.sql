-- =============================================================================
-- Migration: dashboard_views
-- Creates a high-performance aggregation view for the trainer dashboard.
-- Uses security_invoker = true so RLS policies on underlying tables apply.
-- =============================================================================

CREATE OR REPLACE VIEW dashboard_client_summaries
WITH (security_invoker = true)
AS
SELECT
  -- Client identity
  tc.client_id,
  p.full_name                                      AS client_name,
  tc.trainer_id,

  -- Daily meal count (UTC day boundary)
  COUNT(fl.id)
    FILTER (
      WHERE date_trunc('day', fl.logged_at AT TIME ZONE 'UTC')
          = date_trunc('day', now() AT TIME ZONE 'UTC')
    )                                              AS total_meals_logged_today,

  -- Daily macro totals — COALESCE prevents NULL when no logs exist
  COALESCE(
    SUM(fl.calories)
      FILTER (
        WHERE date_trunc('day', fl.logged_at AT TIME ZONE 'UTC')
            = date_trunc('day', now() AT TIME ZONE 'UTC')
      ), 0
  )                                                AS total_calories_today,

  COALESCE(
    SUM(fl.protein_g)
      FILTER (
        WHERE date_trunc('day', fl.logged_at AT TIME ZONE 'UTC')
            = date_trunc('day', now() AT TIME ZONE 'UTC')
      ), 0
  )                                                AS total_protein_today,

  COALESCE(
    SUM(fl.carbs_g)
      FILTER (
        WHERE date_trunc('day', fl.logged_at AT TIME ZONE 'UTC')
            = date_trunc('day', now() AT TIME ZONE 'UTC')
      ), 0
  )                                                AS total_carbs_today,

  COALESCE(
    SUM(fl.fat_g)
      FILTER (
        WHERE date_trunc('day', fl.logged_at AT TIME ZONE 'UTC')
            = date_trunc('day', now() AT TIME ZONE 'UTC')
      ), 0
  )                                                AS total_fat_today,

  -- Active strike count — scalar subquery avoids row multiplication
  (
    SELECT COUNT(*)
    FROM   public.strike_log sl
    WHERE  sl.profile_id = tc.client_id
  )                                                AS active_strike_count

FROM       public.trainer_clients tc
INNER JOIN public.profiles         p  ON p.id  = tc.client_id
LEFT JOIN  public.food_logs        fl ON fl.client_id = tc.client_id

WHERE tc.is_active = true

-- One row per client — GROUP BY must include all non-aggregated SELECT columns
GROUP BY tc.client_id, p.full_name, tc.trainer_id;
