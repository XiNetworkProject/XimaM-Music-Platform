-- Supabase schema for track likes, views and aggregated stats

-- 1) Tables
create table if not exists public.track_likes (
  id uuid primary key default gen_random_uuid(),
  track_id text not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique(track_id, user_id)
);

create table if not exists public.track_views (
  id uuid primary key default gen_random_uuid(),
  track_id text not null,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_track_views_track_created on public.track_views(track_id, created_at desc);
create index if not exists idx_track_views_user_track on public.track_views(user_id, track_id, created_at desc);

create table if not exists public.track_stats (
  track_id text primary key,
  likes_count integer not null default 0,
  views_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- 2) Helper upsert function for stats
create or replace function public._ensure_track_stats(p_track_id text)
returns void
language plpgsql
as $$
begin
  insert into public.track_stats as ts (track_id, likes_count, views_count, updated_at)
  values (p_track_id, 0, 0, now())
  on conflict (track_id) do nothing;
end;
$$;

-- 3) Triggers to keep stats in sync
-- Likes increment/decrement
create or replace function public.trg_track_likes_after_insert()
returns trigger
language plpgsql
as $$
begin
  perform public._ensure_track_stats(new.track_id);
  update public.track_stats
    set likes_count = likes_count + 1,
        updated_at = now()
  where track_id = new.track_id;
  return new;
end;
$$;

create or replace function public.trg_track_likes_after_delete()
returns trigger
language plpgsql
as $$
begin
  update public.track_stats
    set likes_count = greatest(likes_count - 1, 0),
        updated_at = now()
  where track_id = old.track_id;
  return old;
end;
$$;

drop trigger if exists track_likes_after_insert on public.track_likes;
create trigger track_likes_after_insert
after insert on public.track_likes
for each row execute function public.trg_track_likes_after_insert();

drop trigger if exists track_likes_after_delete on public.track_likes;
create trigger track_likes_after_delete
after delete on public.track_likes
for each row execute function public.trg_track_likes_after_delete();

-- Views increment
create or replace function public.trg_track_views_after_insert()
returns trigger
language plpgsql
as $$
begin
  perform public._ensure_track_stats(new.track_id);
  update public.track_stats
    set views_count = views_count + 1,
        updated_at = now()
  where track_id = new.track_id;
  return new;
end;
$$;

drop trigger if exists track_views_after_insert on public.track_views;
create trigger track_views_after_insert
after insert on public.track_views
for each row execute function public.trg_track_views_after_insert();

-- 4) RLS
alter table public.track_likes enable row level security;
alter table public.track_views enable row level security;
alter table public.track_stats enable row level security;

-- Policies
-- Likes: authenticated users can select their own row and insert/delete for themselves
drop policy if exists likes_select_all on public.track_likes;
create policy likes_select_all on public.track_likes
  for select using (auth.role() = 'authenticated');

drop policy if exists likes_insert_own on public.track_likes;
create policy likes_insert_own on public.track_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists likes_delete_own on public.track_likes;
create policy likes_delete_own on public.track_likes
  for delete using (auth.uid() = user_id);

-- Views: authenticated users can insert/select their own
drop policy if exists views_select_all on public.track_views;
create policy views_select_all on public.track_views
  for select using (auth.role() = 'authenticated');

drop policy if exists views_insert_own on public.track_views;
create policy views_insert_own on public.track_views
  for insert with check (auth.uid() = user_id);

-- Stats: anyone authenticated can select; updates only via triggers
drop policy if exists stats_select_all on public.track_stats;
create policy stats_select_all on public.track_stats
  for select using (auth.role() = 'authenticated');


