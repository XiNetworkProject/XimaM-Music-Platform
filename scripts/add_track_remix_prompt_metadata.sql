-- Metadonnees produit pour "Remixer ce son".
-- Additif uniquement : conserve remix_type='ai_variation' comme categorie
-- technique deja utilisee par les requetes, et stocke la direction choisie
-- par l'utilisateur dans remix_direction.
alter table if exists public.track_remixes
  add column if not exists remix_prompt text,
  add column if not exists remix_direction text not null default 'mood_shift',
  add column if not exists prompt_visibility text not null default 'private';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'track_remixes_remix_direction_check'
  ) then
    alter table public.track_remixes
      add constraint track_remixes_remix_direction_check
      check (remix_direction in (
        'faster',
        'slower',
        'melancholic',
        'electro',
        'acoustic',
        'instrumental',
        'mood_shift',
        'keep_lyrics',
        'sequel',
        'short_extract'
      ));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'track_remixes_prompt_visibility_check'
  ) then
    alter table public.track_remixes
      add constraint track_remixes_prompt_visibility_check
      check (prompt_visibility in ('private', 'public'));
  end if;
end $$;

create index if not exists track_remixes_direction_idx
  on public.track_remixes (remix_direction, created_at desc);
