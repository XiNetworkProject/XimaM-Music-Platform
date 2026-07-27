begin;

-- Phone-only accounts do not have an email address. PostgreSQL unique indexes
-- already allow multiple NULL values, so only the NOT NULL constraint changes.
alter table public.profiles
  alter column email drop not null;

alter table if exists public.password_resets
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz;

create table if not exists public.account_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  birth_date date,
  birthday_visibility text not null default 'private'
    check (birthday_visibility in ('private', 'friends', 'public')),
  discoverable_by_email boolean not null default false,
  discoverable_by_phone boolean not null default false,
  mfa_enabled boolean not null default false,
  profile_completed_at timestamptz,
  terms_version text,
  terms_accepted_at timestamptz,
  privacy_version text,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_private_first_name_length check (
    first_name is null or char_length(first_name) between 1 and 80
  ),
  constraint account_private_last_name_length check (
    last_name is null or char_length(last_name) between 1 and 80
  )
);

alter table public.account_private
  add column if not exists email text,
  add column if not exists mfa_enabled boolean not null default false;

create unique index if not exists account_private_email_unique_idx
  on public.account_private (lower(email))
  where email is not null;

create or replace function public.touch_account_private_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_account_private_birth_date()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.birth_date is not null
    and new.birth_date > (current_date - interval '15 years')::date then
    raise exception 'ACCOUNT_MINIMUM_AGE_15';
  end if;
  return new;
end;
$$;

drop trigger if exists touch_account_private_updated_at on public.account_private;
create trigger touch_account_private_updated_at
  before update on public.account_private
  for each row
  execute function public.touch_account_private_updated_at();

drop trigger if exists validate_account_private_birth_date on public.account_private;
create trigger validate_account_private_birth_date
  before insert or update of birth_date on public.account_private
  for each row
  execute function public.validate_account_private_birth_date();

-- Existing members are prompted once in the native app to provide the newly
-- required private identity fields and accept the current legal documents.
insert into public.account_private (user_id, email)
select id, lower(email)
from public.profiles
on conflict (user_id) do update
set email = coalesce(excluded.email, public.account_private.email);

update public.account_private account
set mfa_enabled = exists (
  select 1
  from auth.mfa_factors factor
  where factor.user_id = account.user_id
    and factor.status::text = 'verified'
);

-- Keep compatibility with legacy writers while ensuring the public profiles
-- table never stores a contact address.
create or replace function public.move_profile_email_to_private()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    insert into public.account_private (user_id, email)
    values (new.id, lower(new.email))
    on conflict (user_id) do update
      set email = excluded.email;
    new.email = null;
  end if;
  return new;
end;
$$;

update public.profiles
set email = null
where email is not null;

drop trigger if exists move_profile_email_to_private on public.profiles;
create trigger move_profile_email_to_private
  before insert or update of email on public.profiles
  for each row
  execute function public.move_profile_email_to_private();

alter table public.account_private enable row level security;

drop policy if exists "Account owners can read private data" on public.account_private;
create policy "Account owners can read private data"
  on public.account_private
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );

drop policy if exists "Account owners can create private data" on public.account_private;
create policy "Account owners can create private data"
  on public.account_private
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );

drop policy if exists "Account owners can update private data" on public.account_private;
create policy "Account owners can update private data"
  on public.account_private
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  )
  with check (
    (select auth.uid()) = user_id
    and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );

revoke all on table public.account_private from anon;
grant select, insert, update on table public.account_private to authenticated;
grant select, insert, update, delete on table public.account_private to service_role;

revoke all on function public.touch_account_private_updated_at() from public, anon, authenticated;
grant execute on function public.touch_account_private_updated_at() to service_role;
revoke all on function public.validate_account_private_birth_date() from public, anon, authenticated;
grant execute on function public.validate_account_private_birth_date() to service_role;
revoke all on function public.move_profile_email_to_private() from public, anon, authenticated;
grant execute on function public.move_profile_email_to_private() to service_role;

commit;
