-- =============================================================================
-- Migration: auth_profile_trigger
-- Automatically provisions a public.profiles row when a new auth.users
-- record is created via Supabase Auth (sign-up or admin creation).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_trainer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _raw_role  TEXT;
  _role      public.role_type;
BEGIN
  _raw_role := NEW.raw_user_meta_data ->> 'role';

  BEGIN
    _role := _raw_role::public.role_type;
  EXCEPTION WHEN invalid_text_representation OR OTHERS THEN
    _role := 'client';
  END;

  IF _role IS NULL THEN
    _role := 'client';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    phone_number,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'phone_number',
    _role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_trainer();
