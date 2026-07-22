begin;

create index if not exists conversation_realtime_events_user_idx
  on public.conversation_realtime_events (user_id);
create index if not exists conversation_rooms_created_by_idx
  on public.conversation_rooms (created_by);
create index if not exists conversations_owner_idx
  on public.conversations (owner_id);
create index if not exists friendships_source_request_idx
  on public.friendships (source_request_id);
create index if not exists message_attachments_conversation_idx
  on public.message_attachments (conversation_id);
create index if not exists message_pins_message_idx
  on public.message_pins (message_id);
create index if not exists message_pins_pinned_by_idx
  on public.message_pins (pinned_by);
create index if not exists message_reactions_user_idx
  on public.message_reactions (user_id);

drop policy if exists "Utilisateur peut voir les messages de ses conversations" on public.messages;
create policy "Utilisateur peut voir les messages de ses conversations"
  on public.messages
  for select
  to authenticated
  using (synaura_private.is_conversation_member(conversation_id));

drop policy if exists "Conversation members can read rooms" on public.conversation_rooms;
create policy "Conversation members can read rooms"
  on public.conversation_rooms
  for select
  to authenticated
  using (synaura_private.is_conversation_member(conversation_id));

drop policy if exists "Conversation managers can create rooms" on public.conversation_rooms;
create policy "Conversation managers can create rooms"
  on public.conversation_rooms
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = conversation_rooms.conversation_id
        and participant.user_id = (select auth.uid())
        and participant.role in ('owner', 'moderator')
    )
  );

drop policy if exists "Conversation managers can delete rooms" on public.conversation_rooms;
create policy "Conversation managers can delete rooms"
  on public.conversation_rooms
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.conversation_participants participant
      where participant.conversation_id = conversation_rooms.conversation_id
        and participant.user_id = (select auth.uid())
        and participant.role in ('owner', 'moderator')
    )
  );

drop policy if exists "Conversation members can read reactions" on public.message_reactions;
create policy "Conversation members can read reactions"
  on public.message_reactions
  for select
  to authenticated
  using (synaura_private.is_conversation_member(conversation_id));

drop policy if exists "Conversation members can react" on public.message_reactions;
create policy "Conversation members can react"
  on public.message_reactions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and synaura_private.is_conversation_member(conversation_id)
  );

drop policy if exists "Users can remove their reactions" on public.message_reactions;
create policy "Users can remove their reactions"
  on public.message_reactions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Voir ses demandes" on public.message_requests;
create policy "Voir ses demandes"
  on public.message_requests
  for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or target_id = (select auth.uid())
  );

drop policy if exists "Creer des demandes" on public.message_requests;
create policy "Creer des demandes"
  on public.message_requests
  for insert
  to authenticated
  with check (requester_id = (select auth.uid()));

drop policy if exists "Modifier ses demandes recues" on public.message_requests;
create policy "Modifier ses demandes recues"
  on public.message_requests
  for update
  to authenticated
  using (target_id = (select auth.uid()))
  with check (target_id = (select auth.uid()));

drop policy if exists "Users can read their friendships" on public.friendships;
create policy "Users can read their friendships"
  on public.friendships
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or friend_id = (select auth.uid())
  );

drop policy if exists "Users can remove their friendships" on public.friendships;
create policy "Users can remove their friendships"
  on public.friendships
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or friend_id = (select auth.uid())
  );

drop policy if exists "Users can read their blocks" on public.user_blocks;
create policy "Users can read their blocks"
  on public.user_blocks
  for select
  to authenticated
  using (blocker_id = (select auth.uid()));

drop policy if exists "Users can create their blocks" on public.user_blocks;
create policy "Users can create their blocks"
  on public.user_blocks
  for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists "Users can remove their blocks" on public.user_blocks;
create policy "Users can remove their blocks"
  on public.user_blocks
  for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

commit;
