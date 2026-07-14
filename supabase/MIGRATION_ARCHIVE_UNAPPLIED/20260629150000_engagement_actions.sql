-- ════════════════════════════════════════════════════════════
-- Engagement Actions — Persistent Action State
-- ════════════════════════════════════════════════════════════
-- Additive only: no existing tables or schemas are modified.
-- Reconcile logic drives dedup, not DB constraints.
-- ════════════════════════════════════════════════════════════

create table if not exists engagement_actions (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references trainers(id) on delete cascade,
  client_id   uuid,
  type        text not null,
  reason      text not null,
  priority    text not null check (priority in ('high', 'medium', 'low')),
  confidence  integer not null default 70,
  status      text not null default 'active' check (status in ('active', 'completed', 'dismissed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_engagement_actions_trainer_id
  on engagement_actions(trainer_id);

create index if not exists idx_engagement_actions_status
  on engagement_actions(status);

create index if not exists idx_engagement_actions_trainer_status
  on engagement_actions(trainer_id, status);

-- Unique constraint prevents duplicate per-client actions.
-- PostgreSQL treats NULL != NULL in unique constraints, so
-- trainer-level actions (client_id IS NULL) are not affected.
alter table engagement_actions
  add constraint uq_engagement_action
  unique (trainer_id, client_id, type, reason);
