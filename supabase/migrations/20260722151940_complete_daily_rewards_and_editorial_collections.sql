-- Complete the daily rewards schema used by the web API and native app.
create table if not exists public.user_daily_spin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_spun_at timestamptz,
  streak integer not null default 0 check (streak >= 0)
);

create table if not exists public.user_daily_spin_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spun_at timestamptz not null default now(),
  result_key text not null,
  reward_type text not null,
  reward_payload jsonb not null default '{}'::jsonb
);

create index if not exists user_daily_spin_history_user_spun_idx
  on public.user_daily_spin_history (user_id, spun_at desc);

alter table public.user_daily_spin enable row level security;
alter table public.user_daily_spin_history enable row level security;

drop policy if exists "Users can read their daily spin" on public.user_daily_spin;
create policy "Users can read their daily spin"
  on public.user_daily_spin
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their daily spin history" on public.user_daily_spin_history;
create policy "Users can read their daily spin history"
  on public.user_daily_spin_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_daily_spin from anon;
revoke all on table public.user_daily_spin_history from anon;
grant select on table public.user_daily_spin to authenticated;
grant select on table public.user_daily_spin_history to authenticated;
grant all on table public.user_daily_spin to service_role;
grant all on table public.user_daily_spin_history to service_role;

-- Editorial collections decorate existing playlists. playlists.id is text in the
-- production schema, so the foreign key deliberately uses text as well.
create table if not exists public.editorial_collections (
  id uuid primary key default gen_random_uuid(),
  playlist_id text not null unique references public.playlists(id) on delete cascade,
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  kind text not null default 'collection',
  banner_url text,
  cover_url text,
  theme_colors jsonb not null default '["#7357C6", "#4A9EAA", "#D96D63"]'::jsonb,
  badge text not null default 'Synaura Originals',
  is_featured boolean not null default true,
  is_published boolean not null default false,
  download_enabled boolean not null default true,
  comments_enabled boolean not null default true,
  position integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editorial_collections_published_idx
  on public.editorial_collections (is_published, is_featured, position, created_at desc);

create index if not exists editorial_collections_slug_idx
  on public.editorial_collections (slug);

create or replace function public.touch_editorial_collections_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_editorial_collections_updated_at on public.editorial_collections;
create trigger touch_editorial_collections_updated_at
  before update on public.editorial_collections
  for each row
  execute function public.touch_editorial_collections_updated_at();

alter table public.editorial_collections enable row level security;

drop policy if exists "Published editorial collections are public" on public.editorial_collections;
create policy "Published editorial collections are public"
  on public.editorial_collections
  for select
  to anon, authenticated
  using (is_published = true);

revoke all on table public.editorial_collections from anon, authenticated;
grant select on table public.editorial_collections to anon, authenticated;
grant all on table public.editorial_collections to service_role;
