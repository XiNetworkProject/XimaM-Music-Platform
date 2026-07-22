import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { requireConversationParticipant } from '@/lib/messaging';

export const dynamic = 'force-dynamic';
const REACTIONS = new Set(['heart', 'fire', 'wow', 'support', 'laugh']);

async function validate(request: NextRequest, conversationId: string, messageId: string) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Non authentifie' }, { status: 401 }) };
  if (!await requireConversationParticipant(conversationId, session.user.id)) {
    return { error: NextResponse.json({ error: 'Acces refuse' }, { status: 403 }) };
  }
  const { data: message } = await supabaseAdmin
    .from('messages')
    .select('id')
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .maybeSingle();
  if (!message) return { error: NextResponse.json({ error: 'Message introuvable' }, { status: 404 }) };
  return { userId: session.user.id };
}

export async function GET(request: NextRequest, { params }: { params: { conversationId: string; messageId: string } }) {
  try {
    const checked = await validate(request, params.conversationId, params.messageId);
    if (checked.error) return checked.error;
    const { data: reactions, error } = await supabaseAdmin
      .from('message_reactions')
      .select('user_id, reaction, created_at')
      .eq('message_id', params.messageId)
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: 'Reactions indisponibles' }, { status: 500 });
    const userIds = (reactions || []).map((reaction) => reaction.user_id);
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, name, username, avatar').in('id', userIds)
      : { data: [] as any[] };
    const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    return NextResponse.json({
      reactions: (reactions || []).map((reaction) => ({
        userId: reaction.user_id,
        reaction: reaction.reaction,
        createdAt: reaction.created_at,
        user: profilesById.get(reaction.user_id) || null,
      })),
    });
  } catch (error) {
    console.error('[messages/reactions] GET failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { conversationId: string; messageId: string } }) {
  try {
    const checked = await validate(request, params.conversationId, params.messageId);
    if (checked.error) return checked.error;
    const body = await request.json().catch(() => null);
    const reaction = typeof body?.reaction === 'string' ? body.reaction : '';
    if (!REACTIONS.has(reaction)) return NextResponse.json({ error: 'Reaction invalide' }, { status: 400 });
    const { error } = await supabaseAdmin
      .from('message_reactions')
      .upsert({ message_id: params.messageId, user_id: checked.userId, reaction }, { onConflict: 'message_id,user_id' });
    if (error) return NextResponse.json({ error: 'Reaction impossible' }, { status: 500 });
    return NextResponse.json({ success: true, reaction });
  } catch (error) {
    console.error('[messages/reactions] POST failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { conversationId: string; messageId: string } }) {
  try {
    const checked = await validate(request, params.conversationId, params.messageId);
    if (checked.error) return checked.error;
    const { error } = await supabaseAdmin
      .from('message_reactions')
      .delete()
      .eq('message_id', params.messageId)
      .eq('user_id', checked.userId);
    if (error) return NextResponse.json({ error: 'Reaction impossible a retirer' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[messages/reactions] DELETE failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
