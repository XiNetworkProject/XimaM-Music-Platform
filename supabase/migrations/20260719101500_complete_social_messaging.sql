begin;

alter table public.conversations
  add column if not exists direct_key text,
  add column if not exists last_message_at timestamptz,
  add column if not exists last_message_id text,
  add column if not exists is_active boolean not null default true;

alter table public.conversation_participants
  add column if not exists last_read_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists muted_until timestamptz;

alter table public.messages
  add column if not exists message_type text not null default 'text',
  add column if not exists media_url text,
  add column if not exists shared_entity_type text,
  add column if not exists shared_entity_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists reply_to_id text,
  add column if not exists deleted_at timestamptz;

alter table public.message_requests
  add column if not exists resolved_at timestamptz;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.message_requests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.message_requests drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.message_requests
  add constraint message_requests_status_check
  check (status in ('pending', 'accepted', 'rejected', 'cancelled'));

-- The legacy table kept one row per status, which prevents two people from
-- reconnecting after an older accepted request. History may repeat; only a
-- pending request must remain unique for a pair.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.message_requests'::regclass
      and contype = 'u'
      and replace(pg_get_constraintdef(oid), ' ', '') ilike 'UNIQUE(requester_id,target_id,status)%'
  loop
    execute format('alter table public.message_requests drop constraint %I', constraint_name);
  end loop;
end $$;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  source_request_id uuid references public.message_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint friendships_distinct_users check (user_id <> friend_id),
  constraint friendships_unique_pair unique (user_id, friend_id)
);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_distinct_users check (blocker_id <> blocked_id),
  constraint user_blocks_unique_pair unique (blocker_id, blocked_id)
);

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id text not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('heart', 'fire', 'wow', 'support', 'laugh')),
  created_at timestamptz not null default now(),
  constraint message_reactions_one_per_user unique (message_id, user_id)
);

delete from public.conversation_participants duplicate
using public.conversation_participants original
where duplicate.conversation_id = original.conversation_id
  and duplicate.user_id = original.user_id
  and duplicate.id > original.id;

create unique index if not exists conversation_participants_unique_user
  on public.conversation_participants (conversation_id, user_id);
create index if not exists conversation_participants_user_active
  on public.conversation_participants (user_id, archived_at, conversation_id);
create index if not exists messages_conversation_created
  on public.messages (conversation_id, created_at desc);
create index if not exists messages_unread_lookup
  on public.messages (conversation_id, is_read, sender_id)
  where deleted_at is null;
create index if not exists message_requests_received_pending
  on public.message_requests (target_id, created_at desc)
  where status = 'pending';
create index if not exists message_requests_sent_pending
  on public.message_requests (requester_id, created_at desc)
  where status = 'pending';

with duplicate_pending as (
  select
    id,
    row_number() over (
      partition by least(requester_id, target_id), greatest(requester_id, target_id)
      order by created_at desc, id desc
    ) as pair_rank
  from public.message_requests
  where status = 'pending'
)
update public.message_requests request
set status = 'cancelled', resolved_at = now(), updated_at = now()
from duplicate_pending
where request.id = duplicate_pending.id
  and duplicate_pending.pair_rank > 1;

create unique index if not exists message_requests_unique_pending_pair
  on public.message_requests (least(requester_id, target_id), greatest(requester_id, target_id))
  where status = 'pending';

create index if not exists friendships_user on public.friendships (user_id, created_at desc);
create index if not exists friendships_friend on public.friendships (friend_id, created_at desc);
create index if not exists user_blocks_blocked on public.user_blocks (blocked_id, blocker_id);
create index if not exists message_reactions_message on public.message_reactions (message_id, created_at);

with direct_pairs as (
  select
    c.id,
    min(cp.user_id::text) || ':' || max(cp.user_id::text) as pair_key,
    row_number() over (
      partition by min(cp.user_id::text) || ':' || max(cp.user_id::text)
      order by c.created_at asc, c.id asc
    ) as pair_rank
  from public.conversations c
  join public.conversation_participants cp on cp.conversation_id = c.id
  where coalesce(c.is_group, false) = false
  group by c.id, c.created_at
  having count(distinct cp.user_id) = 2
)
update public.conversations c
set direct_key = direct_pairs.pair_key
from direct_pairs
where c.id = direct_pairs.id
  and direct_pairs.pair_rank = 1
  and c.direct_key is null;

create unique index if not exists conversations_unique_direct_key
  on public.conversations (direct_key)
  where coalesce(is_group, false) = false and direct_key is not null;

with latest as (
  select distinct on (conversation_id)
    conversation_id,
    id,
    created_at
  from public.messages
  where deleted_at is null
  order by conversation_id, created_at desc, id desc
)
update public.conversations c
set
  last_message_id = latest.id,
  last_message_at = latest.created_at,
  updated_at = greatest(coalesce(c.updated_at, c.created_at), latest.created_at)
from latest
where c.id = latest.conversation_id;

update public.conversations
set last_message_at = coalesce(last_message_at, updated_at, created_at, now())
where last_message_at is null;

insert into public.friendships (user_id, friend_id, source_request_id, created_at)
select
  case when requester_id::text < target_id::text then requester_id else target_id end,
  case when requester_id::text < target_id::text then target_id else requester_id end,
  id,
  coalesce(resolved_at, updated_at, created_at, now())
from public.message_requests
where status = 'accepted'
  and requester_id <> target_id
on conflict (user_id, friend_id) do nothing;

with direct_contacts as (
  select
    min(cp.user_id::text)::uuid as user_id,
    max(cp.user_id::text)::uuid as friend_id,
    min(c.created_at) as created_at
  from public.conversations c
  join public.conversation_participants cp on cp.conversation_id = c.id
  where coalesce(c.is_group, false) = false
  group by c.id
  having count(distinct cp.user_id) = 2
)
insert into public.friendships (user_id, friend_id, created_at)
select user_id, friend_id, created_at
from direct_contacts
on conflict (user_id, friend_id) do nothing;

create or replace function public.synaura_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_id = new.id,
    last_message_at = new.created_at,
    updated_at = new.created_at,
    is_active = true
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists synaura_touch_conversation_after_message on public.messages;
create trigger synaura_touch_conversation_after_message
after insert on public.messages
for each row execute function public.synaura_touch_conversation();

alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.message_reactions enable row level security;

drop policy if exists "Users can read their friendships" on public.friendships;
create policy "Users can read their friendships" on public.friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "Users can remove their friendships" on public.friendships;
create policy "Users can remove their friendships" on public.friendships
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "Users can read their blocks" on public.user_blocks;
create policy "Users can read their blocks" on public.user_blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists "Users can create their blocks" on public.user_blocks;
create policy "Users can create their blocks" on public.user_blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists "Users can remove their blocks" on public.user_blocks;
create policy "Users can remove their blocks" on public.user_blocks
  for delete using (auth.uid() = blocker_id);

drop policy if exists "Conversation members can read reactions" on public.message_reactions;
create policy "Conversation members can read reactions" on public.message_reactions
  for select using (
    exists (
      select 1
      from public.messages m
      join public.conversation_participants cp on cp.conversation_id = m.conversation_id
      where m.id = message_reactions.message_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Conversation members can react" on public.message_reactions;
create policy "Conversation members can react" on public.message_reactions
  for insert with check (
    auth.uid() = user_id and exists (
      select 1
      from public.messages m
      join public.conversation_participants cp on cp.conversation_id = m.conversation_id
      where m.id = message_reactions.message_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Users can remove their reactions" on public.message_reactions;
create policy "Users can remove their reactions" on public.message_reactions
  for delete using (auth.uid() = user_id);

commit;
