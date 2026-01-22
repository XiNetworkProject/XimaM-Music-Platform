-- Comment system: creator moderation + likes + creator word filters
-- Run in Supabase SQL editor (service role).

-- 0) Base comments table (required)
create extension if not exists pgcrypto;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  track_id text not null,
  user_id uuid not null,
  content text not null,
  parent_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table already existed (old schema), ensure required columns exist
alter table public.comments add column if not exists track_id text;
alter table public.comments add column if not exists user_id uuid;
alter table public.comments add column if not exists content text;
alter table public.comments add column if not exists parent_id uuid;
alter table public.comments add column if not exists created_at timestamptz;
alter table public.comments add column if not exists updated_at timestamptz;

-- Ensure track_id is TEXT (many tracks ids are like "track_..." and are not UUIDs)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'comments'
      and column_name = 'track_id'
      and data_type <> 'text'
  ) then
    alter table public.comments
      alter column track_id type text
      using track_id::text;
  end if;
exception when others then
  -- keep script resilient; you can inspect errors manually if needed
  null;
end $$;

-- Backfill defaults for older rows (safe for existing data)
update public.comments set content = '' where content is null;
update public.comments set created_at = now() where created_at is null;
update public.comments set updated_at = now() where updated_at is null;

-- Enforce minimal constraints (content + timestamps)
alter table public.comments alter column content set not null;
alter table public.comments alter column created_at set not null;
alter table public.comments alter column updated_at set not null;
alter table public.comments alter column created_at set default now();
alter table public.comments alter column updated_at set default now();

create index if not exists comments_track_id_created_at_idx on public.comments(track_id, created_at desc);
create index if not exists comments_parent_id_idx on public.comments(parent_id);
create index if not exists comments_user_id_idx on public.comments(user_id);

-- 1) Comment likes (one row per (comment, user))
create table if not exists public.comment_likes (
  id bigserial primary key,
  comment_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique(comment_id, user_id)
);

create index if not exists comment_likes_comment_id_idx on public.comment_likes(comment_id);
create index if not exists comment_likes_user_id_idx on public.comment_likes(user_id);

-- 2) Creator moderation state per comment (per track creator)
create table if not exists public.comment_moderation (
  comment_id uuid not null,
  track_id text not null,
  creator_id uuid not null,
  is_deleted boolean not null default false,
  deleted_at timestamptz null,
  deletion_reason text null,
  is_filtered boolean not null default false,
  filtered_at timestamptz null,
  filter_reason text null,
  is_creator_favorite boolean not null default false,
  creator_favorite_at timestamptz null,
  updated_at timestamptz not null default now(),
  primary key(comment_id, creator_id)
);

create index if not exists comment_moderation_track_id_idx on public.comment_moderation(track_id);
create index if not exists comment_moderation_creator_id_idx on public.comment_moderation(creator_id);

-- Ensure moderation.track_id is TEXT too (migration from older schema)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'comment_moderation'
      and column_name = 'track_id'
      and data_type <> 'text'
  ) then
    alter table public.comment_moderation
      alter column track_id type text
      using track_id::text;
  end if;
exception when others then
  null;
end $$;

-- 3) Creator custom filters (words/phrases)
create table if not exists public.creator_comment_filters (
  id bigserial primary key,
  creator_id uuid not null,
  word text not null,
  created_at timestamptz not null default now(),
  unique(creator_id, word)
);

create index if not exists creator_comment_filters_creator_id_idx on public.creator_comment_filters(creator_id);

