import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import {
  formatMessagingProfile,
  getMessagingProfiles,
  MAX_GROUP_PARTICIPANTS,
  requireConversationParticipant,
  usersAreBlocked,
  usersAreFriends,
} from '@/lib/messaging';
import { notifyGroupMemberAdded } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase';

type RouteContext = { params: { conversationId: string } };

async function getGroup(conversationId: string) {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('id, name, is_group, is_active')
    .eq('id', conversationId)
    .maybeSingle();
  return data?.is_group && data?.is_active !== false ? data : null;
}

async function touchConversation(conversationId: string) {
  await supabaseAdmin
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  const group = await getGroup(params.conversationId);
  if (!group) return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 });
  const actor = await requireConversationParticipant(params.conversationId, session.user.id);
  if (!actor || !['owner', 'moderator'].includes(actor.role || 'member')) {
    return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  if (!userId || userId === session.user.id) {
    return NextResponse.json({ error: 'Membre invalide' }, { status: 400 });
  }
  const [{ data: existing }, { count }, profiles] = await Promise.all([
    supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', params.conversationId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('conversation_participants')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', params.conversationId),
    getMessagingProfiles([userId, session.user.id]),
  ]);
  if (existing) return NextResponse.json({ error: 'Cette personne est deja membre' }, { status: 409 });
  if ((count || 0) >= MAX_GROUP_PARTICIPANTS) {
    return NextResponse.json({ error: `Le groupe est limite a ${MAX_GROUP_PARTICIPANTS} membres` }, { status: 409 });
  }
  const target = profiles.get(userId);
  if (!target) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  const [blocked, friends] = await Promise.all([
    usersAreBlocked(session.user.id, userId),
    usersAreFriends(session.user.id, userId),
  ]);
  if (blocked) return NextResponse.json({ error: 'Cette personne ne peut pas rejoindre ce groupe' }, { status: 403 });
  if (!friends) return NextResponse.json({ error: 'Ajoute d’abord cette personne a tes amis' }, { status: 403 });

  const { error } = await supabaseAdmin.from('conversation_participants').insert({
    conversation_id: params.conversationId,
    user_id: userId,
    role: 'member',
    joined_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: 'Ajout impossible' }, { status: 500 });
  await touchConversation(params.conversationId);

  const actorProfile = profiles.get(session.user.id) || formatMessagingProfile({ id: session.user.id, name: session.user.name });
  void notifyGroupMemberAdded(
    session.user.id,
    userId,
    actorProfile.name,
    group.name || 'Groupe Synaura',
    params.conversationId,
    actorProfile.avatar,
  ).catch((notificationError) => console.error('[messages/participants] notification failed:', notificationError));

  return NextResponse.json({
    participant: { user: target, role: 'member', nickname: null },
  }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  if (!await getGroup(params.conversationId)) {
    return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 });
  }
  const actor = await requireConversationParticipant(params.conversationId, session.user.id);
  if (!actor || actor.role !== 'owner') {
    return NextResponse.json({ error: 'Seul le proprietaire peut changer les roles' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  const role = body?.role === 'moderator' ? 'moderator' : body?.role === 'member' ? 'member' : null;
  if (!userId || !role || userId === session.user.id) {
    return NextResponse.json({ error: 'Role invalide' }, { status: 400 });
  }
  const target = await requireConversationParticipant(params.conversationId, userId);
  if (!target || target.role === 'owner') {
    return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
  }
  const { error } = await supabaseAdmin
    .from('conversation_participants')
    .update({ role })
    .eq('conversation_id', params.conversationId)
    .eq('user_id', userId);
  if (error) return NextResponse.json({ error: 'Role impossible a modifier' }, { status: 500 });
  await touchConversation(params.conversationId);
  return NextResponse.json({ success: true, userId, role });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  if (!await getGroup(params.conversationId)) {
    return NextResponse.json({ error: 'Groupe introuvable' }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === 'string' && body.userId.trim() ? body.userId.trim() : session.user.id;
  const actor = await requireConversationParticipant(params.conversationId, session.user.id);
  const target = await requireConversationParticipant(params.conversationId, userId);
  if (!actor || !target) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });

  if (userId === session.user.id) {
    if (actor.role === 'owner') {
      return NextResponse.json({ error: 'Le proprietaire doit rester dans le groupe' }, { status: 409 });
    }
  } else {
    const actorCanRemove = actor.role === 'owner'
      || (actor.role === 'moderator' && target.role === 'member');
    if (!actorCanRemove || target.role === 'owner') {
      return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 });
    }
  }

  const { error } = await supabaseAdmin
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', params.conversationId)
    .eq('user_id', userId);
  if (error) return NextResponse.json({ error: 'Retrait impossible' }, { status: 500 });
  await touchConversation(params.conversationId);
  return NextResponse.json({ success: true, userId, left: userId === session.user.id });
}
