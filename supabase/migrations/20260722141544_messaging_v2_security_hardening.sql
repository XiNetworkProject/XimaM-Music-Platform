begin;

create schema if not exists synaura_private;
revoke all on schema synaura_private from public, anon;
grant usage on schema synaura_private to authenticated;

create or replace function synaura_private.is_conversation_member(
  target_conversation_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = target_conversation_id
        and participant.user_id = (select auth.uid())
    );
$$;

revoke all on function synaura_private.is_conversation_member(text) from public, anon;
grant execute on function synaura_private.is_conversation_member(text) to authenticated;

drop policy if exists "Conversation members can read conversations" on public.conversations;
create policy "Conversation members can read conversations"
  on public.conversations
  for select
  to authenticated
  using (synaura_private.is_conversation_member(id));

drop policy if exists "Conversation members can read participants" on public.conversation_participants;
create policy "Conversation members can read participants"
  on public.conversation_participants
  for select
  to authenticated
  using (synaura_private.is_conversation_member(conversation_id));

drop policy if exists "Conversation members can read ephemeral events" on public.conversation_realtime_events;
create policy "Conversation members can read ephemeral events"
  on public.conversation_realtime_events
  for select
  to authenticated
  using (
    expires_at > now()
    and synaura_private.is_conversation_member(conversation_id)
  );

drop policy if exists "Conversation members can publish ephemeral events" on public.conversation_realtime_events;
create policy "Conversation members can publish ephemeral events"
  on public.conversation_realtime_events
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and expires_at > now()
    and expires_at <= now() + interval '2 minutes'
    and synaura_private.is_conversation_member(conversation_id)
  );

revoke execute on function public.synaura_is_conversation_member(text, uuid) from public, anon, authenticated;
drop function public.synaura_is_conversation_member(text, uuid);

-- Trigger helpers are internal implementation details, never public RPCs.
revoke execute on function public.synaura_sync_message_relation() from public, anon, authenticated;
revoke execute on function public.synaura_cleanup_realtime_events() from public, anon, authenticated;
revoke execute on function public.synaura_touch_conversation() from public, anon, authenticated;

-- Explicit grants keep Realtime working when automatic Data API grants are disabled.
grant select on table
  public.messages,
  public.message_reactions,
  public.message_attachments,
  public.message_pins,
  public.conversation_participants,
  public.conversations,
  public.conversation_rooms,
  public.conversation_realtime_events,
  public.message_requests,
  public.friendships,
  public.user_blocks
to authenticated;

grant insert on table public.conversation_realtime_events to authenticated;

commit;
