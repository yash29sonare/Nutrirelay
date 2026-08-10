-- =============================================================================
-- Seed: Development trainer profile
-- Provides a default profile row so dashboard queries return data during
-- local development without requiring a real Supabase Auth user to be created.
-- =============================================================================

-- Insert a development trainer profile only if it doesn't already exist.
-- The id matches a predictable dev UUID — register this same UUID in
-- Supabase Auth Dashboard → Users for full sign-in support.
INSERT INTO public.profiles (
  id,
  full_name,
  phone_number,
  role,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Dev Trainer',
  '910000000000',
  'trainer',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Wire the dev trainer as their own first client for view population
INSERT INTO public.trainer_clients (
  trainer_id,
  client_id,
  is_active,
  linked_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  true,
  now()
)
ON CONFLICT (trainer_id, client_id) DO NOTHING;
