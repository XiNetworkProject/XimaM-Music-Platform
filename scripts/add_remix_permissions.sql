-- Permissions de creation/remix par morceau (clips, variations IA, remix audio).
-- Remix desactive par defaut pour les morceaux existants ; le createur choisit
-- explicitement les autorisations a la publication d'un nouveau morceau.

alter table if exists public.tracks
  add column if not exists allow_clips boolean not null default false,
  add column if not exists allow_audio_remix boolean not null default false,
  add column if not exists allow_ai_variation boolean not null default false,
  add column if not exists remix_approval_required boolean not null default false,
  add column if not exists remix_visibility text not null default 'disabled';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tracks_remix_visibility_check'
  ) then
    alter table public.tracks
      add constraint tracks_remix_visibility_check
      check (remix_visibility in ('everyone', 'followers', 'disabled'));
  end if;
end $$;

alter table if exists public.ai_tracks
  add column if not exists allow_clips boolean not null default false,
  add column if not exists allow_audio_remix boolean not null default false,
  add column if not exists allow_ai_variation boolean not null default false,
  add column if not exists remix_approval_required boolean not null default false,
  add column if not exists remix_visibility text not null default 'disabled';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ai_tracks_remix_visibility_check'
  ) then
    alter table public.ai_tracks
      add constraint ai_tracks_remix_visibility_check
      check (remix_visibility in ('everyone', 'followers', 'disabled'));
  end if;
end $$;

-- Verification
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('tracks', 'ai_tracks')
  and column_name in ('allow_clips', 'allow_audio_remix', 'allow_ai_variation', 'remix_approval_required', 'remix_visibility')
order by table_name, column_name;
