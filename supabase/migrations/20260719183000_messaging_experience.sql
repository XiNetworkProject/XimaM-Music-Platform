begin;

alter table public.conversations
  add column if not exists description text,
  add column if not exists avatar_url text,
  add column if not exists owner_id uuid references public.profiles(id) on delete set null;

alter table public.conversation_participants
  add column if not exists role text not null default 'member',
  add column if not exists nickname text,
  add column if not exists theme_key text not null default 'aura',
  add column if not exists accent_color text not null default '#7357C6',
  add column if not exists background_key text not null default 'quiet',
  add column if not exists wallpaper_url text,
  add column if not exists bubble_enabled boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.conversation_participants'::regclass
      and conname = 'conversation_participants_role_check'
  ) then
    alter table public.conversation_participants
      add constraint conversation_participants_role_check
      check (role in ('owner', 'moderator', 'member'));
  end if;
end $$;

create table if not exists public.conversation_rooms (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.conversations(id) on delete cascade,
  name text not null,
  room_type text not null default 'text' check (room_type in ('text', 'voice_notes')),
  position integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.messages
  add column if not exists room_id uuid references public.conversation_rooms(id) on delete set null;

create unique index if not exists conversation_rooms_unique_name
  on public.conversation_rooms (conversation_id, lower(name));
create index if not exists conversation_rooms_order
  on public.conversation_rooms (conversation_id, position, created_at);
create index if not exists messages_room_created
  on public.messages (room_id, created_at desc)
  where room_id is not null;

with existing_group_owners as (
  select distinct on (participant.conversation_id)
    participant.conversation_id,
    participant.user_id
  from public.conversation_participants participant
  join public.conversations conversation on conversation.id = participant.conversation_id
  where coalesce(conversation.is_group, false) = true
    and conversation.owner_id is null
  order by participant.conversation_id, participant.id asc
)
update public.conversations conversation
set owner_id = existing_group_owners.user_id
from existing_group_owners
where conversation.id = existing_group_owners.conversation_id;

update public.conversation_participants participant
set role = 'owner'
from public.conversations conversation
where participant.conversation_id = conversation.id
  and conversation.owner_id = participant.user_id
  and participant.role <> 'owner';

insert into public.conversation_rooms (
  conversation_id,
  name,
  room_type,
  position,
  created_by
)
select
  conversation.id,
  default_room.name,
  default_room.room_type,
  default_room.position,
  conversation.owner_id
from public.conversations conversation
cross join (
  values
    ('general', 'text', 0),
    ('vocaux', 'voice_notes', 1)
) as default_room(name, room_type, position)
where coalesce(conversation.is_group, false) = true
on conflict do nothing;

alter table public.conversation_rooms enable row level security;

drop policy if exists "Conversation members can read rooms" on public.conversation_rooms;
create policy "Conversation members can read rooms" on public.conversation_rooms
  for select using (
    exists (
      select 1 from public.conversation_participants participant
      where participant.conversation_id = conversation_rooms.conversation_id
        and participant.user_id = auth.uid()
    )
  );

drop policy if exists "Conversation managers can create rooms" on public.conversation_rooms;
create policy "Conversation managers can create rooms" on public.conversation_rooms
  for insert with check (
    exists (
      select 1 from public.conversation_participants participant
      where participant.conversation_id = conversation_rooms.conversation_id
        and participant.user_id = auth.uid()
        and participant.role in ('owner', 'moderator')
    )
  );

drop policy if exists "Conversation managers can update rooms" on public.conversation_rooms;
create policy "Conversation managers can update rooms" on public.conversation_rooms
  for update using (
    exists (
      select 1 from public.conversation_participants participant
      where participant.conversation_id = conversation_rooms.conversation_id
        and participant.user_id = auth.uid()
        and participant.role in ('owner', 'moderator')
    )
  );

drop policy if exists "Conversation managers can delete rooms" on public.conversation_rooms;
create policy "Conversation managers can delete rooms" on public.conversation_rooms
  for delete using (
    exists (
      select 1 from public.conversation_participants participant
      where participant.conversation_id = conversation_rooms.conversation_id
        and participant.user_id = auth.uid()
        and participant.role in ('owner', 'moderator')
    )
  );

commit;
