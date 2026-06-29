-- ════════════════════════════════════════════════════════════
-- Engagement Events — Immutable Event Log (System of Record)
-- ════════════════════════════════════════════════════════════
-- Additive only: no existing tables or schemas are modified.
--
-- RULES:
--   • IMMUTABLE — never UPDATE, never DELETE
--   • APPEND ONLY — events are always inserted
--   • IDEMPOTENT — event_id UNIQUE prevents duplicate inserts
--   • Audit trail for every action lifecycle transition
--   • Single source of truth — all state is derived from events
-- ════════════════════════════════════════════════════════════

create table if not exists engagement_events (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references trainers(id) on delete cascade,
  client_id   uuid,
  action_id   uuid,
  event_type  text not null,
  event_id    text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

-- Idempotency: same event_id never inserted twice
create unique index if not exists idx_engagement_events_event_id
  on engagement_events(event_id);

-- Performance indexes
create index if not exists idx_engagement_events_trainer_id
  on engagement_events(trainer_id, created_at desc);

create index if not exists idx_engagement_events_client_id
  on engagement_events(client_id);

create index if not exists idx_engagement_events_action_id
  on engagement_events(action_id);
