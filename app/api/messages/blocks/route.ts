import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { findDirectConversation, getMessagingProfiles, removeFriendship } from '@/lib/messaging';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const { data: rows, error } = await supabaseAdmin
      .from('user_blocks')
      .select('id, blocked_id, created_at')
      .eq('blocker_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: 'Blocages indisponibles' }, { status: 500 });
    const profiles = await getMessagingProfiles((rows || []).map((row) => row.blocked_id));
    return NextResponse.json({
      blocks: (rows || []).map((row) => ({ id: row.id, user: profiles.get(row.blocked_id), createdAt: row.created_at })).filter((row) => Boolean(row.user)),
    });
  } catch (error) {
    console.error('[messages/blocks] GET failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : '';
    if (!targetId || targetId === session.user.id) return NextResponse.json({ error: 'Utilisateur invalide' }, { status: 400 });
    const { data: target } = await supabaseAdmin.from('profiles').select('id').eq('id', targetId).maybeSingle();
    if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    const { error } = await supabaseAdmin
      .from('user_blocks')
      .upsert({ blocker_id: session.user.id, blocked_id: targetId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: 'Blocage impossible' }, { status: 500 });
    await removeFriendship(session.user.id, targetId).catch(() => {});
    const now = new Date().toISOString();
    await Promise.all([
      supabaseAdmin
        .from('message_requests')
        .update({ status: 'rejected', resolved_at: now, updated_at: now })
        .eq('status', 'pending')
        .eq('requester_id', session.user.id)
        .eq('target_id', targetId),
      supabaseAdmin
        .from('message_requests')
        .update({ status: 'rejected', resolved_at: now, updated_at: now })
        .eq('status', 'pending')
        .eq('requester_id', targetId)
        .eq('target_id', session.user.id),
    ]);
    const conversation = await findDirectConversation(session.user.id, targetId);
    if (conversation) {
      await supabaseAdmin
        .from('conversation_participants')
        .update({ archived_at: now })
        .eq('conversation_id', conversation.id)
        .eq('user_id', session.user.id);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[messages/blocks] POST failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : '';
    if (!targetId) return NextResponse.json({ error: 'Utilisateur requis' }, { status: 400 });
    const { error } = await supabaseAdmin
      .from('user_blocks')
      .delete()
      .eq('blocker_id', session.user.id)
      .eq('blocked_id', targetId);
    if (error) return NextResponse.json({ error: 'Deblocage impossible' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[messages/blocks] DELETE failed:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
