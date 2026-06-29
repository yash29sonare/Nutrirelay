-- Fortress Fitness — Phase 3.1G — PGMQ contract repair (public wrappers)
-- Adds missing RPC wrappers expected by repository:
--   public.pgmq_send(queue_name TEXT, message JSONB)
--   public.pgmq_delete(queue_name TEXT, msg_id BIGINT)
--
-- Delegates to:
--   pgmq.send(queue_name := queue_name, msg := message)
--   pgmq.delete(queue_name := queue_name, msg_id := msg_id)

begin;

-- SEND wrapper
create or replace function public.pgmq_send(
  queue_name text,
  message jsonb
)
returns setof bigint
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  return query
  select *
  from pgmq.send(
    queue_name := queue_name,
    msg := message
  );
end;
$$;

-- DELETE wrapper (must be BIGINT msg_id overload only)
create or replace function public.pgmq_delete(
  queue_name text,
  msg_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  return
  select pgmq.delete(
    queue_name := queue_name,
    msg_id := msg_id
  );
end;
$$;

-- Grants
grant execute on function public.pgmq_send(text, jsonb) to anon, authenticated, service_role;
grant execute on function public.pgmq_delete(text, bigint) to anon, authenticated, service_role;

commit;
