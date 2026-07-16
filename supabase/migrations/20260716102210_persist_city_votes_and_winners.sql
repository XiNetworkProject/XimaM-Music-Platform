create table if not exists public.city_events (
  id text primary key,
  kind text not null check (kind in ('friday_drop', 'challenge', 'battle', 'seasonal')),
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  icon text not null default 'sparkles',
  accent text not null default '#7357C6',
  week_key text not null,
  day_key text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'resolved', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  challenge_tag text,
  theme text,
  config jsonb not null default '{}'::jsonb,
  reward jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.city_event_tracks (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.city_events(id) on delete cascade,
  track_id text not null,
  creator_id uuid references public.profiles(id) on delete set null,
  slot integer not null default 0,
  source text not null default 'algorithmic' check (source in ('algorithmic', 'curated', 'submission', 'winner')),
  score numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (event_id, track_id)
);

create table if not exists public.city_event_votes (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  track_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id),
  foreign key (event_id, track_id)
    references public.city_event_tracks(event_id, track_id)
    on delete cascade
);

create table if not exists public.city_event_participations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.city_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id text not null,
  status text not null default 'submitted' check (status in ('submitted', 'accepted', 'rejected', 'winner')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id, track_id)
);

create table if not exists public.city_event_winners (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.city_events(id) on delete cascade,
  track_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  rank integer not null default 1 check (rank > 0),
  reason text,
  showcase_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz not null default now(),
  unique (event_id, rank)
);

create table if not exists public.city_user_rewards (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.city_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_key text not null,
  status text not null default 'available' check (status in ('available', 'claimed', 'expired')),
  metadata jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, user_id, reward_key)
);

create index if not exists idx_city_events_week on public.city_events(week_key, kind);
create index if not exists idx_city_events_status on public.city_events(status, starts_at, ends_at);
create index if not exists idx_city_event_tracks_event on public.city_event_tracks(event_id, slot);
create index if not exists idx_city_event_tracks_track on public.city_event_tracks(track_id);
create index if not exists idx_city_event_tracks_creator on public.city_event_tracks(creator_id);
create index if not exists idx_city_event_votes_track on public.city_event_votes(event_id, track_id);
create index if not exists idx_city_event_votes_user on public.city_event_votes(user_id);
create index if not exists idx_city_event_participations_event on public.city_event_participations(event_id, created_at desc);
create index if not exists idx_city_event_participations_user on public.city_event_participations(user_id, created_at desc);
create index if not exists idx_city_event_winners_event on public.city_event_winners(event_id);
create index if not exists idx_city_event_winners_user on public.city_event_winners(user_id);
create index if not exists idx_city_user_rewards_user on public.city_user_rewards(user_id, status);

create or replace function public.set_city_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_city_events_updated_at on public.city_events;
create trigger trg_city_events_updated_at
before update on public.city_events
for each row execute function public.set_city_updated_at();

drop trigger if exists trg_city_event_votes_updated_at on public.city_event_votes;
create trigger trg_city_event_votes_updated_at
before update on public.city_event_votes
for each row execute function public.set_city_updated_at();

drop trigger if exists trg_city_event_participations_updated_at on public.city_event_participations;
create trigger trg_city_event_participations_updated_at
before update on public.city_event_participations
for each row execute function public.set_city_updated_at();

alter table public.city_events enable row level security;
alter table public.city_event_tracks enable row level security;
alter table public.city_event_votes enable row level security;
alter table public.city_event_participations enable row level security;
alter table public.city_event_winners enable row level security;
alter table public.city_user_rewards enable row level security;

create policy "City events are server managed"
on public.city_events for all to anon, authenticated
using (false) with check (false);

create policy "City event tracks are server managed"
on public.city_event_tracks for all to anon, authenticated
using (false) with check (false);

create policy "City votes are server managed"
on public.city_event_votes for all to anon, authenticated
using (false) with check (false);

create policy "City participations are server managed"
on public.city_event_participations for all to anon, authenticated
using (false) with check (false);

create policy "City winners are server managed"
on public.city_event_winners for all to anon, authenticated
using (false) with check (false);

create policy "City rewards are server managed"
on public.city_user_rewards for all to anon, authenticated
using (false) with check (false);

revoke all on table public.city_events from anon, authenticated;
revoke all on table public.city_event_tracks from anon, authenticated;
revoke all on table public.city_event_votes from anon, authenticated;
revoke all on table public.city_event_participations from anon, authenticated;
revoke all on table public.city_event_winners from anon, authenticated;
revoke all on table public.city_user_rewards from anon, authenticated;

grant select, insert, update, delete on table public.city_events to service_role;
grant select, insert, update, delete on table public.city_event_tracks to service_role;
grant select, insert, update, delete on table public.city_event_votes to service_role;
grant select, insert, update, delete on table public.city_event_participations to service_role;
grant select, insert, update, delete on table public.city_event_winners to service_role;
grant select, insert, update, delete on table public.city_user_rewards to service_role;

revoke all on function public.set_city_updated_at() from public, anon, authenticated;
grant execute on function public.set_city_updated_at() to service_role;

do $$
begin
  if to_regclass('public.boosters') is not null then
    insert into public.boosters (key, name, description, type, rarity, multiplier, duration_hours, enabled)
    values (
      'city-winner-showcase',
      'Victoire Synaura City',
      'Mise en avant reservee au titre gagnant d un vote Synaura City.',
      'track',
      'rare',
      1.35,
      24,
      true
    )
    on conflict (key) do update set
      name = excluded.name,
      description = excluded.description,
      type = excluded.type,
      rarity = excluded.rarity,
      multiplier = excluded.multiplier,
      duration_hours = excluded.duration_hours,
      enabled = true,
      updated_at = now();
  end if;
end;
$$;
