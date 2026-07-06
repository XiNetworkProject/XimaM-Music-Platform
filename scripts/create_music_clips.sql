-- MVP Clips musicaux Synaura.
-- Un clip est une video verticale liee a un morceau Synaura public et autorise.

create table if not exists public.music_clips (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  video_url text,
  video_public_id text,
  poster_url text,
  caption text,
  tags text[] not null default '{}',
  source_track_id text not null,
  source_track_type text not null default 'track',
  source_track_offset_seconds integer not null default 0,
  source_track_duration_seconds integer not null default 30,
  visibility text not null default 'draft',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint music_clips_source_track_type_check check (source_track_type in ('track', 'ai_track')),
  constraint music_clips_visibility_check check (visibility in ('draft', 'published', 'hidden')),
  constraint music_clips_offset_check check (source_track_offset_seconds >= 0),
  constraint music_clips_duration_check check (source_track_duration_seconds between 15 and 60),
  constraint music_clips_likes_check check (likes_count >= 0),
  constraint music_clips_comments_check check (comments_count >= 0)
);

create index if not exists music_clips_public_feed_idx
  on public.music_clips (visibility, created_at desc)
  where visibility = 'published';

create index if not exists music_clips_source_idx
  on public.music_clips (source_track_type, source_track_id, visibility, created_at desc);

create index if not exists music_clips_creator_idx
  on public.music_clips (creator_id, created_at desc);

create or replace function public.touch_music_clips_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists music_clips_touch_updated_at on public.music_clips;
create trigger music_clips_touch_updated_at
  before update on public.music_clips
  for each row
  execute function public.touch_music_clips_updated_at();

alter table public.music_clips enable row level security;

drop policy if exists "Public can read published music clips" on public.music_clips;
create policy "Public can read published music clips"
  on public.music_clips
  for select
  using (visibility = 'published');

drop policy if exists "Creators can read own music clips" on public.music_clips;
create policy "Creators can read own music clips"
  on public.music_clips
  for select
  using (auth.uid() = creator_id);

drop policy if exists "Creators can insert own music clips" on public.music_clips;
create policy "Creators can insert own music clips"
  on public.music_clips
  for insert
  with check (auth.uid() = creator_id);

drop policy if exists "Creators can update own music clips" on public.music_clips;
create policy "Creators can update own music clips"
  on public.music_clips
  for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

drop policy if exists "Creators can delete own music clips" on public.music_clips;
create policy "Creators can delete own music clips"
  on public.music_clips
  for delete
  using (auth.uid() = creator_id);
