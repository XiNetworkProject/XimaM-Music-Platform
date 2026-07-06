-- Tracabilite des variations IA derivees d'un morceau Synaura autorise.
create table if not exists public.track_remixes (
  id uuid primary key default gen_random_uuid(),
  source_track_id text not null,
  source_track_type text not null check (source_track_type in ('track', 'ai_track')),
  child_track_id text not null,
  child_track_type text not null check (child_track_type in ('track', 'ai_track')),
  creator_id uuid not null,
  remix_type text not null default 'ai_variation' check (remix_type in ('ai_variation')),
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists track_remixes_unique_child
  on public.track_remixes (child_track_id, child_track_type, remix_type);

create index if not exists track_remixes_source_status_idx
  on public.track_remixes (source_track_id, source_track_type, status);

create index if not exists track_remixes_creator_idx
  on public.track_remixes (creator_id, created_at desc);

alter table public.track_remixes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'track_remixes'
      and policyname = 'track_remixes_public_published_select'
  ) then
    create policy track_remixes_public_published_select
      on public.track_remixes
      for select
      using (status = 'published');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'track_remixes'
      and policyname = 'track_remixes_creator_select'
  ) then
    create policy track_remixes_creator_select
      on public.track_remixes
      for select
      using (auth.uid() = creator_id);
  end if;
end $$;
