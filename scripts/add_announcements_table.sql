-- Table des annonces pour le carrousel d'accueil
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  priority integer not null default 0,
  published boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour l'ordre d'affichage
create index if not exists idx_announcements_order on public.announcements (published desc, priority desc, created_at desc);

-- Trigger de mise à jour du updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
before update on public.announcements
for each row execute function set_updated_at();

-- RLS: lecture publique des annonces publiées uniquement; écriture via service role
alter table public.announcements enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'announcements' and policyname = 'Public read published announcements'
  ) then
    create policy "Public read published announcements" on public.announcements
      for select using (
        published = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
      );
  end if;
end $$;

-- Aucune insertion/mise à jour/suppression publique (géré par service role)

