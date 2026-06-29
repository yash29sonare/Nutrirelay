# Dashboard Read Model — Design Specification

## Entity: `dashboard_client_status`
Type: Materialized View (future)
Refresh: Scheduled (cron) or trigger-based on data change

## Columns

| Column | Source | Type | Notes |
|--------|--------|------|-------|
| `client_id` | trainer_clients.client_id | UUID | PK, FK → profiles.id |
| `trainer_id` | trainer_clients.trainer_id | UUID | Tenant owner |
| `client_name` | profiles.full_name | TEXT | Denormalized for performance |
| `goal_type` | client_goals.goal_type | TEXT | Nullable if no goal set |
| `current_weight` | client_goals.current_weight | NUMERIC(6,2) | Latest from active goal |
| `target_weight` | client_goals.target_weight | NUMERIC(6,2) | From active goal |
| `compliance_score` | client_compliance_snapshots.compliance_score | NUMERIC(5,2) | Latest snapshot |
| `status_color` | client_compliance_snapshots.status_color | TEXT | GREEN/YELLOW/RED |
| `weekly_calories` | food_logs (aggregated) | NUMERIC | SUM calories last 7 days |
| `monthly_calories` | food_logs (aggregated) | NUMERIC | SUM calories last 30 days |
| `weekly_protein` | food_logs (aggregated) | NUMERIC | SUM protein last 7 days |
| `weekly_carbs` | food_logs (aggregated) | NUMERIC | SUM carbs last 7 days |
| `weekly_fat` | food_logs (aggregated) | NUMERIC | SUM fat last 7 days |
| `meals_logged_today` | food_logs (aggregated) | INTEGER | COUNT today |
| `last_food_log` | food_logs.logged_at | TIMESTAMPTZ | MAX(logged_at) |
| `last_food_log_status` | food_logs.verification_status | TEXT | Latest verification_status |
| `last_checkin` | communication_logs.message_timestamp | TIMESTAMPTZ | MAX where direction=INBOUND |
| `active_strikes` | strike_log | INTEGER | COUNT where profile_id = client_id |
| `prediction_score` | monthly_reports.goal_projection_score | NUMERIC(5,2) | Latest month's projection |

## Refresh Strategy

Two options (decision needed at implementation):

### Option A: Scheduled refresh
```sql
SELECT cron.schedule('refresh-dashboard', '0 */6 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_client_status');
```

### Option B: Trigger-based partial refresh
- Refresh on INSERT/UPDATE/DELETE to food_logs, client_goals, client_compliance_snapshots, communication_logs
- Only refresh affected client row using CONCURRENTLY
- Better freshness, higher write overhead

## Query Pattern (conceptual)

```sql
SELECT
  tc.client_id,
  tc.trainer_id,
  p.full_name AS client_name,
  cg.goal_type,
  cg.current_weight,
  cg.target_weight,
  cs.compliance_score,
  cs.status_color,
  COALESCE(SUM(fl.calories) FILTER (WHERE fl.logged_at >= NOW() - INTERVAL '7 days'), 0) AS weekly_calories,
  COALESCE(SUM(fl.calories) FILTER (WHERE fl.logged_at >= NOW() - INTERVAL '30 days'), 0) AS monthly_calories,
  MAX(fl.logged_at) AS last_food_log,
  COUNT(*) FILTER (WHERE fl.logged_at >= CURRENT_DATE) AS meals_logged_today,
  (SELECT COUNT(*) FROM public.strike_log sl WHERE sl.profile_id = tc.client_id) AS active_strikes,
  (SELECT goal_projection_score FROM public.monthly_reports mr
   WHERE mr.client_id = tc.client_id ORDER BY mr.report_month DESC LIMIT 1) AS prediction_score
FROM public.trainer_clients tc
JOIN public.profiles p ON p.id = tc.client_id
LEFT JOIN public.client_goals cg ON cg.client_id = tc.client_id AND cg.goal_status = 'ACTIVE'
LEFT JOIN public.client_compliance_snapshots cs ON cs.client_id = tc.client_id
LEFT JOIN public.food_logs fl ON fl.client_id = tc.client_id
WHERE tc.is_active = true
GROUP BY tc.client_id, tc.trainer_id, p.full_name, cg.goal_type,
         cg.current_weight, cg.target_weight, cs.compliance_score, cs.status_color;
```

## RLS
Materialized view inherits no RLS directly. Access must be controlled at the query layer by filtering on `trainer_id` = auth.uid() for trainers or `client_id` = auth.uid() for clients.
