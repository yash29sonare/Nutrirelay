-- Phase A billing foundation only.
-- Do not apply automatically during production deploys.
-- Plan catalog source of truth lives in src/lib/billing/plans.ts.

create table if not exists public.trainer_subscriptions (
  subscription_id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null,
  status text not null default 'trialing',
  active_client_limit integer not null,
  trial_started_at timestamptz null,
  trial_ends_at timestamptz null,
  current_period_started_at timestamptz null,
  current_period_ends_at timestamptz null,
  manual_payment_reference text null,
  operator_notes text null,
  activated_manually_by uuid null references public.profiles(id) on delete set null,
  activated_manually_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainer_subscriptions_plan_id_check
    check (plan_id in ('trial', 'starter', 'growth', 'pro', 'agency')),
  constraint trainer_subscriptions_status_check
    check (status in ('trialing', 'active', 'expired', 'suspended', 'cancelled')),
  constraint trainer_subscriptions_active_client_limit_check
    check (active_client_limit > 0),
  constraint trainer_subscriptions_trial_window_check
    check (
      plan_id <> 'trial'
      or (
        trial_started_at is not null
        and trial_ends_at is not null
        and trial_ends_at > trial_started_at
      )
    )
);

create unique index if not exists idx_trainer_subscriptions_one_current
  on public.trainer_subscriptions (trainer_id)
  where status in ('trialing', 'active');

create index if not exists idx_trainer_subscriptions_trainer_status
  on public.trainer_subscriptions (trainer_id, status, created_at desc);

alter table public.trainer_subscriptions enable row level security;

drop policy if exists trainer_subscriptions_select_own on public.trainer_subscriptions;
create policy trainer_subscriptions_select_own
  on public.trainer_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = trainer_id);

comment on table public.trainer_subscriptions is
  'Trainer SaaS subscription records. Phase A stores manual plan state only; writes are operator/service-role controlled.';

create table if not exists public.trainer_usage_counters (
  counter_id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid null references public.trainer_subscriptions(subscription_id) on delete set null,
  period_started_at timestamptz not null,
  period_ends_at timestamptz not null,
  active_clients_count integer not null default 0,
  whatsapp_messages_count integer not null default 0,
  ai_reviews_count integer not null default 0,
  photo_reviews_count integer not null default 0,
  voice_reviews_count integer not null default 0,
  reports_generated_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainer_usage_counters_period_check
    check (period_ends_at > period_started_at),
  constraint trainer_usage_counters_non_negative_check
    check (
      active_clients_count >= 0
      and whatsapp_messages_count >= 0
      and ai_reviews_count >= 0
      and photo_reviews_count >= 0
      and voice_reviews_count >= 0
      and reports_generated_count >= 0
    )
);

create unique index if not exists idx_trainer_usage_counters_period
  on public.trainer_usage_counters (trainer_id, period_started_at, period_ends_at);

create index if not exists idx_trainer_usage_counters_subscription
  on public.trainer_usage_counters (subscription_id);

alter table public.trainer_usage_counters enable row level security;

drop policy if exists trainer_usage_counters_select_own on public.trainer_usage_counters;
create policy trainer_usage_counters_select_own
  on public.trainer_usage_counters
  for select
  to authenticated
  using ((select auth.uid()) = trainer_id);

comment on table public.trainer_usage_counters is
  'Trainer SaaS usage snapshot counters for future entitlement enforcement. Phase A does not enforce these counters.';
