# Supabase Migration Reconciliation Notes

Reconciliation date: 2026-07-14

Project ref: `tbwemyizhpozdqnjfqvk`

## Safety status

- No live database mutation was performed.
- `supabase db push` was not run.
- `supabase db reset` was not run.
- `supabase migration repair` was not run.
- `supabase migration up` was not run.
- This reconciliation only adjusts local migration-file representation for known remote-applied migrations where the local duplicate SQL clearly matched the remote-applied purpose.

## Remote applied migrations

- `20260609201014_00_extensions`
- `20260609201843_01_core_schema`
- `20260609215522_02_infrastructure_schema`
- `20260610074213_03_rls_hardening`
- `20260611101944_04_pgmq_init`
- `20260613_dashboard_views`
- `20260613000000_auth_profile_trigger`
- `20260623120000_05_pgmq_public_wrappers`
- `20260705084005_incoming_webhook_logs_status_constraint_sync`
- `20260705093217_communication_logs`
- `20260705170449_15_whatsapp_webhook_events_final_statuses`
- `20260708142741_17b_onboarding_prerequisites_and_state_machine`

## Duplicate timestamp pairs

| Remote-applied migration | Local duplicate found | Reconciliation decision |
|---|---|---|
| `20260705084005_incoming_webhook_logs_status_constraint_sync` | `20260705100000_incoming_webhook_logs_status_constraint_sync.sql` | Restored under the remote-applied timestamp and removed the duplicate local timestamp from active migrations. |
| `20260705093217_communication_logs` | `20260705113000_14_communication_logs.sql` | Restored under the remote-applied timestamp and removed the duplicate local timestamp from active migrations. |
| `20260705170449_15_whatsapp_webhook_events_final_statuses` | `20260705173000_15_whatsapp_webhook_events_final_statuses.sql` | Restored under the remote-applied timestamp and removed the duplicate local timestamp from active migrations. |
| `20260708142741_17b_onboarding_prerequisites_and_state_machine` | `20260708195000_17_client_onboarding_state_machine.sql` | Left active. The local duplicate covers onboarding state-machine and workout timing fields, but does not prove full remote `17b` prerequisites equivalence. |

## Files created/restored

- `supabase/migrations/20260705084005_incoming_webhook_logs_status_constraint_sync.sql`
- `supabase/migrations/20260705093217_communication_logs.sql`
- `supabase/migrations/20260705170449_15_whatsapp_webhook_events_final_statuses.sql`

## Files superseded and removed from active migrations

- `supabase/migrations/20260705100000_incoming_webhook_logs_status_constraint_sync.sql`
  - Purpose: align `incoming_webhook_logs.status` constraint with deployed webhook/queue statuses.
  - Superseded by: `supabase/migrations/20260705084005_incoming_webhook_logs_status_constraint_sync.sql`
- `supabase/migrations/20260705113000_14_communication_logs.sql`
  - Purpose: restore canonical `communication_logs` table, indexes, RLS, and service-role policy.
  - Superseded by: `supabase/migrations/20260705093217_communication_logs.sql`
- `supabase/migrations/20260705173000_15_whatsapp_webhook_events_final_statuses.sql`
  - Purpose: align `whatsapp_webhook_events.processing_status` final status constraint.
  - Superseded by: `supabase/migrations/20260705170449_15_whatsapp_webhook_events_final_statuses.sql`

## Files intentionally left active

- `supabase/migrations/20260708195000_17_client_onboarding_state_machine.sql`
  - Reason: not enough evidence that it exactly represents remote-applied `20260708142741_17b_onboarding_prerequisites_and_state_machine`.
  - 2026-07-14 follow-up: verified again during Option D/E production-readiness pass. A local `20260708142741_17b_onboarding_prerequisites_and_state_machine.sql` file was not created because the available local `17` SQL covers onboarding state-machine and workout timing fields, but does not clearly prove the full remote `17b` prerequisites scope.
- `supabase/migrations/20260703110000_13_whatsapp_testability.sql`
  - Reason: live objects exist, but this prompt did not safely prove a no-op baseline conversion.
- `supabase/migrations/20260707120000_16_food_log_review_workflow.sql`
  - Reason: live columns exist, but this prompt did not safely prove a no-op baseline conversion.
- `supabase/migrations/20260629100000_09B_onboarding_columns_and_trigger.sql`
  - Reason: live trainer onboarding fields appear present, but this prompt did not safely prove a no-op baseline conversion.

## Broad or uncertain migrations intentionally untouched

- `20260624120000_06_add_retry_count.sql`
- `20260625101000_07A_trainers_plans_base.sql`
- `20260625102000_07A_subscriptions_payment_reviews.sql`
- `20260625103000_07A_whatsapp_connections_audit_notify.sql`
- `20260625104000_07A1_hardening_constraints_only.sql`
- `20260626100000_08_business_domain_foundation.sql`
- `20260627100000_09_trainer_operations_layer.sql`
- `20260628100000_10_architecture_reconciliation.sql`
- `20260628150000_11A_schema_repair.sql`
- `20260629150000_engagement_actions.sql`
- `20260630000000_10A_dashboard_rpc.sql`
- `20260701000000_engagement_events.sql`
- `20260702000000_12_engagement_rls.sql`
- `20260630120000_repair_trainers_plans_onboarding.sql`

These still require manual SQL comparison before any deployment automation or migration repair.

## Live-only / history-missing items

- `food_logs` review workflow columns exist in live schema, but migration history remains unresolved.
- `client_onboarding_states` exists in live schema.
- `client_workout_schedules` timing columns exist in live schema.
- `weekly_reports` exists in live schema.
- `weekly_reports.trainer_id` is intentionally deferred for a later forward-only hardening migration.
- `whatsapp_webhook_events.processing_metadata` exists in live schema; `metadata` is not the live column name. No rename was performed.
- Remote-applied migration `20260708142741_17b_onboarding_prerequisites_and_state_machine` is still not locally represented. Recover the exact remote SQL or otherwise prove equivalence before migration repair or `supabase db push`.

## Warnings

- Do not run `supabase db push` until remaining drift is resolved.
- Do not run migration repair until the remaining broad/uncertain migrations are reviewed.
- Do not treat this as production-grade migration readiness. This is a partial local reconciliation only.
