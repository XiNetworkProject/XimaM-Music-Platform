-- Ajout du champ de rôles pour le panneau admin
-- À exécuter dans Supabase (SQL Editor) sur la base PROD

alter table public.profiles
  add column if not exists role text not null default 'user';

-- Optionnel: contrainte de valeurs (décommenter si tu veux verrouiller)
-- alter table public.profiles
--   add constraint profiles_role_check check (role in ('user','artist','admin'));

create index if not exists idx_profiles_role on public.profiles(role);

