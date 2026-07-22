begin;

alter table public.messages
  add column if not exists client_id text,
  add column if not exists edited_at timestamptz;

alter table public.conversation_participants
  add column if not exists last_delivered_at timestamptz;

alter table public.message_reactions
  add column if not exists conversation_id text references public.conversations(id) on delete cascade;

update public.message_reactions reaction
set conversation_id = message.conversation_id
from public.messages message
where message.id = reaction.message_id
  and reaction.conversation_id is null;

alter table public.message_reactions
  alter column conversation_id set not null;

create unique index if not exists messages_sender_client_id_unique
  on public.messages (sender_id, client_id)
  where client_id is not null;

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id text not null references public.messages(id) on delete cascade,
  conversation_id text not null references public.conversations(id) on delete cascade,
  attachment_type text not null check (attachment_type in ('image', 'video', 'audio', 'file')),
  url text not null,
  preview_url text,
  mime_type text,
  file_name text,
  size_bytes bigint,
  width integer,
  height integer,
  duration_ms integer,
  waveform jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint message_attachments_size_positive check (size_bytes is null or size_bytes >= 0),
  constraint message_attachments_duration_positive check (duration_ms is null or duration_ms >= 0),
  constraint message_attachments_position_positive check (position >= 0),
  constraint message_attachments_unique_position unique (message_id, position)
);

create table if not exists public.message_pins (
  conversation_id text not null references public.conversations(id) on delete cascade,
  message_id text not null references public.messages(id) on delete cascade,
  pinned_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, message_id)
);

create table if not exists public.message_hidden_users (
  message_id text not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.conversation_realtime_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('typing', 'recording', 'presence')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '45 seconds'),
  constraint conversation_realtime_event_payload_size check (octet_length(payload::text) <= 2048)
);

create index if not exists message_attachments_message_order
  on public.message_attachments (message_id, position);
create index if not exists message_reactions_conversation_created
  on public.message_reactions (conversation_id, created_at desc);
create index if not exists message_pins_conversation_created
  on public.message_pins (conversation_id, created_at desc);
create index if not exists message_hidden_users_user
  on public.message_hidden_users (user_id, hidden_at desc);
create index if not exists conversation_realtime_events_active
  on public.conversation_realtime_events (conversation_id, expires_at desc);

alter table public.message_attachments enable row level security;
alter table public.message_pins enable row level security;
alter table public.message_hidden_users enable row level security;
alter table public.conversation_realtime_events enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;

create or replace function public.synaura_is_conversation_member(
  target_conversation_id text,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_participants participant
    where participant.conversation_id = target_conversation_id
      and participant.user_id = target_user_id
  );
$$;

revoke all on function public.synaura_is_conversation_member(text, uuid) from public;
grant execute on function public.synaura_is_conversation_member(text, uuid) to authenticated;

drop policy if exists "Conversation members can read conversations" on public.conversations;
create policy "Conversation members can read conversations"
  on public.conversations
  for select
  to authenticated
  using (public.synaura_is_conversation_member(id, (select auth.uid())));

drop policy if exists "Conversation members can read participants" on public.conversation_participants;
create policy "Conversation members can read participants"
  on public.conversation_participants
  for select
  to authenticated
  using (public.synaura_is_conversation_member(conversation_id, (select auth.uid())));

drop policy if exists "Utilisateur peut envoyer des messages" on public.messages;
create policy "Conversation members can send messages"
  on public.messages
  for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = messages.conversation_id
        and participant.user_id = (select auth.uid())
    )
    and (
      room_id is null
      or exists (
        select 1
        from public.conversation_rooms room
        where room.id = messages.room_id
          and room.conversation_id = messages.conversation_id
      )
    )
  );

drop policy if exists "Conversation managers can update rooms" on public.conversation_rooms;
create policy "Conversation managers can update rooms"
  on public.conversation_rooms
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = conversation_rooms.conversation_id
        and participant.user_id = (select auth.uid())
        and participant.role in ('owner', 'moderator')
    )
  )
  with check (
    exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = conversation_rooms.conversation_id
        and participant.user_id = (select auth.uid())
        and participant.role in ('owner', 'moderator')
    )
  );

drop policy if exists "Conversation members can read attachments" on public.message_attachments;
create policy "Conversation members can read attachments"
  on public.message_attachments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages message
      join public.conversation_participants participant
        on participant.conversation_id = message.conversation_id
      where message.id = message_attachments.message_id
        and participant.user_id = (select auth.uid())
    )
  );

drop policy if exists "Message senders can attach media" on public.message_attachments;
create policy "Message senders can attach media"
  on public.message_attachments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.messages message
      where message.id = message_attachments.message_id
        and message.sender_id = (select auth.uid())
    )
  );

drop policy if exists "Conversation members can read pins" on public.message_pins;
create policy "Conversation members can read pins"
  on public.message_pins
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = message_pins.conversation_id
        and participant.user_id = (select auth.uid())
    )
  );

drop policy if exists "Conversation members can pin messages" on public.message_pins;
create policy "Conversation members can pin messages"
  on public.message_pins
  for insert
  to authenticated
  with check (
    pinned_by = (select auth.uid())
    and exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = message_pins.conversation_id
        and participant.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.messages message
      where message.id = message_pins.message_id
        and message.conversation_id = message_pins.conversation_id
    )
  );

drop policy if exists "Conversation members can unpin messages" on public.message_pins;
create policy "Conversation members can unpin messages"
  on public.message_pins
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = message_pins.conversation_id
        and participant.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read their hidden messages" on public.message_hidden_users;
create policy "Users can read their hidden messages"
  on public.message_hidden_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can hide messages for themselves" on public.message_hidden_users;
create policy "Users can hide messages for themselves"
  on public.message_hidden_users
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.messages message
      join public.conversation_participants participant
        on participant.conversation_id = message.conversation_id
      where message.id = message_hidden_users.message_id
        and participant.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can restore their hidden messages" on public.message_hidden_users;
create policy "Users can restore their hidden messages"
  on public.message_hidden_users
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Conversation members can read ephemeral events" on public.conversation_realtime_events;
create policy "Conversation members can read ephemeral events"
  on public.conversation_realtime_events
  for select
  to authenticated
  using (
    expires_at > now()
    and public.synaura_is_conversation_member(conversation_id, (select auth.uid()))
  );

drop policy if exists "Conversation members can publish ephemeral events" on public.conversation_realtime_events;
create policy "Conversation members can publish ephemeral events"
  on public.conversation_realtime_events
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and expires_at <= now() + interval '2 minutes'
    and public.synaura_is_conversation_member(conversation_id, (select auth.uid()))
  );

create or replace function public.synaura_sync_message_relation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select message.conversation_id
  into new.conversation_id
  from public.messages message
  where message.id = new.message_id;
  if new.conversation_id is null then
    raise exception 'Message relation not found';
  end if;
  return new;
end;
$$;

drop trigger if exists synaura_sync_reaction_conversation on public.message_reactions;
create trigger synaura_sync_reaction_conversation
before insert or update of message_id on public.message_reactions
for each row execute function public.synaura_sync_message_relation();

drop trigger if exists synaura_sync_attachment_conversation on public.message_attachments;
create trigger synaura_sync_attachment_conversation
before insert or update of message_id on public.message_attachments
for each row execute function public.synaura_sync_message_relation();

create or replace function public.synaura_cleanup_realtime_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.conversation_realtime_events where expires_at <= now();
  return new;
end;
$$;

drop trigger if exists synaura_cleanup_realtime_events_on_insert on public.conversation_realtime_events;
create trigger synaura_cleanup_realtime_events_on_insert
before insert on public.conversation_realtime_events
for each statement execute function public.synaura_cleanup_realtime_events();

alter table public.messages replica identity full;
alter table public.message_reactions replica identity full;
alter table public.conversation_participants replica identity full;
alter table public.message_attachments replica identity full;
alter table public.message_pins replica identity full;
alter table public.conversation_rooms replica identity full;
alter table public.conversations replica identity full;

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'messages',
    'message_reactions',
    'conversation_participants',
    'message_attachments',
    'message_pins',
    'conversation_rooms',
    'conversations',
    'conversation_realtime_events'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables publication_table
      where publication_table.pubname = 'supabase_realtime'
        and publication_table.schemaname = 'public'
        and publication_table.tablename = relation_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', relation_name);
    end if;
  end loop;
end;
$$;

commit;
