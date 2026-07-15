-- Harden trainer-owned WhatsApp credentials.
--
-- This table stores per-trainer Meta access tokens. Application code must read
-- credentials through server-side service-role paths only; browser clients should
-- use API routes that return masked/non-secret connection metadata.

do $$
begin
  if to_regclass('public.trainer_waba_credentials') is not null then
    revoke select, insert, update, delete on table public.trainer_waba_credentials from anon;
    revoke select, insert, update, delete on table public.trainer_waba_credentials from authenticated;

    drop policy if exists "Trainers can view own WABA credentials" on public.trainer_waba_credentials;
    drop policy if exists "Trainers can insert own WABA credentials" on public.trainer_waba_credentials;
    drop policy if exists "Trainers can update own WABA credentials" on public.trainer_waba_credentials;
    drop policy if exists "Users can view own trainer WABA credentials" on public.trainer_waba_credentials;
    drop policy if exists "Users can insert own trainer WABA credentials" on public.trainer_waba_credentials;
    drop policy if exists "Users can update own trainer WABA credentials" on public.trainer_waba_credentials;
    drop policy if exists "trainer_waba_credentials_select_own" on public.trainer_waba_credentials;
    drop policy if exists "trainer_waba_credentials_insert_own" on public.trainer_waba_credentials;
    drop policy if exists "trainer_waba_credentials_update_own" on public.trainer_waba_credentials;

    create unique index if not exists trainer_waba_credentials_connected_phone_number_id_uq
      on public.trainer_waba_credentials (phone_number_id)
      where phone_number_id is not null and status = 'connected';

    create unique index if not exists trainer_waba_credentials_connected_trainer_id_uq
      on public.trainer_waba_credentials (trainer_id)
      where status = 'connected';
  end if;
end $$;
