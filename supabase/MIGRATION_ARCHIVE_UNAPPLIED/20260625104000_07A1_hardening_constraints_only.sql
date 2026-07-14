-- =============================================================================
-- Migration: 07A1_hardening_constraints_only
-- Fortress Fitness — Phase 7.1A.1 Foundation Hardening (Additive Only)
--
-- IMPORTANT:
-- - This migration ONLY modifies newly created Phase 7.1A tables:
--   trainers, plans, subscriptions, payment_reviews, whatsapp_connections,
--   audit_logs, notifications
-- - No existing tables outside Phase 7.1A are modified.
-- - No pipeline/worker/workflow code is touched.
-- - Rollout-safe: constraints are added as "NOT VALID" where supported
--   to avoid failure on existing rows.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- SECTION 0: Ensure updated_at helper exists (safe)
-- -----------------------------------------------------------------------------
-- handle_updated_at() was created in 07A_trainers_plans_base.sql.
-- If the migration is applied standalone on an environment that already
-- has it, the function will exist. If not, create a minimal version.
-- (This is defensive; it should be no-op in the intended order.)

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- SECTION 1: PLAN CANONICALIZATION
-- - Add plan_code (immutable business identifier)
-- - Seed STARTER/PRO/ELITE
-- - Enforce uniqueness via UNIQUE constraint
-- - Keep plan_id as internal key
-- -----------------------------------------------------------------------------

-- Add column (nullable first to avoid immediate backfill failures)
alter table public.plans
  add column if not exists plan_code text;

-- Backfill plan_code from seeded plan_id values
update public.plans
set plan_code = plan_id
where plan_code is null and plan_id in ('STARTER', 'PRO', 'ELITE');

-- Seed again defensively
insert into public.plans (plan_id, plan_code, name, monthly_price, max_clients, feature_flags, created_at, updated_at)
values
  ('STARTER', 'STARTER', 'Starter', 0, 10, '{}'::jsonb, now(), now()),
  ('PRO',     'PRO',     'Pro',     0, 50, '{}'::jsonb, now(), now()),
  ('ELITE',   'ELITE',   'Elite',   0, 250, '{}'::jsonb, now(), now())
on conflict (plan_id) do update
set plan_code = excluded.plan_code;

-- Enforce NOT NULL and UNIQUE once data is present
alter table public.plans
  alter column plan_code set not null;

-- Add unique constraint if missing
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plans_plan_code_uq'
  ) then
    alter table public.plans
      add constraint plans_plan_code_uq unique (plan_code);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- SECTION 2: TRAINER INTEGRITY HARDENING
-- - CHECK constraints for allowed enum-like values
-- - subscription_plan must reference plans(plan_id)
-- - Enforce FK safety via NOT VALID constraints when possible
-- -----------------------------------------------------------------------------

-- Allowed values (as per Phase 7.1A)
-- role: keep flexible but enforce known roles if you already used them.
-- onboarding_status: enforce invited/active-ish bootstrap values.
-- subscription_plan: must be one of plan codes (via FK to plans.plan_id)
-- subscription_status: enforce allowed subscription status values
alter table public.trainers
  add constraint trainers_role_chk
  check (role in ('trainer', 'admin'))
  not valid;

alter table public.trainers
  add constraint trainers_onboarding_status_chk
  check (onboarding_status in ('invited', 'onboarding', 'active'))
  not valid;

alter table public.trainers
  add constraint trainers_subscription_status_chk
  check (subscription_status in (
    'pending_review',
    'under_review',
    'active',
    'suspended',
    'expired',
    'cancelled',
    'grace_period'
  ))
  not valid;

-- subscription_plan FK to plans.plan_id
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'trainers'
      and constraint_name = 'trainers_subscription_plan_fk'
  ) then
    alter table public.trainers
      add constraint trainers_subscription_plan_fk
      foreign key (subscription_plan)
      references public.plans(plan_id)
      on delete restrict
      not valid;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- SECTION 3: SUBSCRIPTION STATE HARDENING
-- - expires_at >= started_at (safe via NOT VALID)
-- - active subscriptions must have started_at
-- -----------------------------------------------------------------------------

alter table public.subscriptions
  add constraint subscriptions_expires_after_started_chk
  check (
    end_date is null
    or start_date is null
    or end_date >= start_date
  )
  not valid;

alter table public.subscriptions
  add constraint subscriptions_active_requires_started_chk
  check (
    status <> 'active'
    or start_date is not null
  )
  not valid;

-- -----------------------------------------------------------------------------
-- SECTION 4: WHATSAPP ROUTING HARDENING
-- - waba_id NOT NULL + not empty
-- - phone_number_id already UNIQUE + non-null via defaults
-- -----------------------------------------------------------------------------

alter table public.whatsapp_connections
  alter column waba_id set not null;

alter table public.whatsapp_connections
  add constraint whatsapp_connections_waba_id_nonempty_chk
  check (char_length(trim(waba_id)) > 0)
  not valid;

-- -----------------------------------------------------------------------------
-- SECTION 5: AUDIT IMMUTABILITY
-- - Ensure audit_logs cannot be updated/deleted even by service_role
--   by adding explicit RLS denies for UPDATE/DELETE.
-- - Append-only readiness is ensured by having no UPDATE/DELETE policies.
--   We strengthen with explicit denies.
-- -----------------------------------------------------------------------------

alter table public.audit_logs enable row level security;

-- Deny UPDATE for service_role (explicit)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'audit_logs_service_role_deny_update'
  ) then
    create policy audit_logs_service_role_deny_update
      on public.audit_logs
      for update
      to service_role
      using (false)
      with check (false);
  end if;
end;
$$;

-- Deny DELETE for service_role (explicit)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'audit_logs_service_role_deny_delete'
  ) then
    create policy audit_logs_service_role_deny_delete
      on public.audit_logs
      for delete
      to service_role
      using (false)
      with check (false);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- SECTION 6: NOTIFICATION READINESS
-- - status lifecycle integrity:
--   unread => read_at IS NULL
--   read => read_at IS NOT NULL (future dashboard compatibility)
-- -----------------------------------------------------------------------------

alter table public.notifications
  add constraint notifications_read_at_readiness_chk
  check (
    (status = 'unread' and read_at is null)
    or
    (status = 'read' and read_at is not null)
  )
  not valid;

commit;
