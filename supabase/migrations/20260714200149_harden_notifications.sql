-- Keep Supabase as the notification source of truth while making device
-- registrations observable and restricted to the server-side API.
alter table public.push_subscriptions
  add column if not exists platform text,
  add column if not exists device_name text,
  add column if not exists app_version text,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_push_subscriptions_user_kind
  on public.push_subscriptions (user_id, p256dh);

-- Registrations go through the authenticated Synaura API using service_role.
drop policy if exists "push_subs_public_insert" on public.push_subscriptions;
