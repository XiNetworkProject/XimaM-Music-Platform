-- Comment system: creator moderation + likes + creator word filters
-- Run in Supabase SQL editor (service role).

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
  track_id uuid not null,
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

-- 3) Creator custom filters (words/phrases)
create table if not exists public.creator_comment_filters (
  id bigserial primary key,
  creator_id uuid not null,
  word text not null,
  created_at timestamptz not null default now(),
  unique(creator_id, word)
);

create index if not exists creator_comment_filters_creator_id_idx on public.creator_comment_filters(creator_id);

