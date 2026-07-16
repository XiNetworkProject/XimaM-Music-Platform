with invalid_rewards as (
  select reward.id
  from public.city_user_rewards reward
  join public.city_events event on event.id = reward.event_id
  where event.kind = 'battle'
    and reward.status = 'available'
    and coalesce(reward.metadata ->> 'autoResolved', 'false') = 'true'
    and not exists (
      select 1
      from public.city_event_votes vote
      where vote.event_id = reward.event_id
    )
)
delete from public.city_user_rewards reward
using invalid_rewards invalid
where reward.id = invalid.id;

delete from public.city_event_winners winner
using public.city_events event
where event.id = winner.event_id
  and event.kind = 'battle'
  and coalesce(winner.metadata ->> 'autoResolved', 'false') = 'true'
  and not exists (
    select 1
    from public.city_event_votes vote
    where vote.event_id = winner.event_id
  );

create or replace function public.require_city_battle_winner_vote()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.city_events event
    where event.id = new.event_id
      and event.kind = 'battle'
  ) and not exists (
    select 1
    from public.city_event_votes vote
    where vote.event_id = new.event_id
      and vote.track_id = new.track_id
  ) then
    raise exception 'A city battle winner must have at least one persisted vote';
  end if;

  return new;
end;
$$;

drop trigger if exists city_battle_winner_requires_vote on public.city_event_winners;
create trigger city_battle_winner_requires_vote
before insert or update of event_id, track_id on public.city_event_winners
for each row execute function public.require_city_battle_winner_vote();
