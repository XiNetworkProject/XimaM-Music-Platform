-- Ajoute les colonnes d'abonnement si absentes
alter table if exists public.profiles
  add column if not exists plan text default 'free',
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_end timestamptz;

-- Index utile pour filtres par plan
create index if not exists idx_profiles_plan on public.profiles(plan);


