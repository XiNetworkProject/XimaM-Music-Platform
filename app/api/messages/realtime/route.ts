import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiSession } from '@/lib/getApiSession';

export const dynamic = 'force-dynamic';

async function conversationMember(conversationId: string, userId: string) {
  const { data, error } = await db.from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  const conversationId = request.nextUrl.searchParams.get('conversationId')?.trim() || '';
  if (!conversationId || !await conversationMember(conversationId, session.user.id)) {
    return NextResponse.json({ error: 'Conversation interdite' }, { status: 403 });
  }
  const rawSince = request.nextUrl.searchParams.get('since');
  const parsedSince = rawSince ? new Date(rawSince) : new Date(Date.now() - 5_000);
  const since = Number.isFinite(parsedSince.getTime()) ? parsedSince.toISOString() : new Date(Date.now() - 5_000).toISOString();
  const { data: events, error } = await db.from('conversation_realtime_events')
    .select('id, user_id, event_type, payload, created_at, expires_at')
    .eq('conversation_id', conversationId)
    .gte('created_at', since)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ now: new Date().toISOString(), events: events || [] }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const conversationId = typeof body?.conversationId === 'string' ? body.conversationId.trim() : '';
  const type = typeof body?.type === 'string' ? body.type : '';
  if (!['typing', 'recording', 'presence'].includes(type)) {
    return NextResponse.json({ error: 'Evenement invalide' }, { status: 400 });
  }
  if (!conversationId || !await conversationMember(conversationId, session.user.id)) {
    return NextResponse.json({ error: 'Conversation interdite' }, { status: 403 });
  }
  const { error } = await db.from('conversation_realtime_events').insert({
    conversation_id: conversationId,
    user_id: session.user.id,
    event_type: type,
    payload: { active: Boolean(body?.active) },
    expires_at: new Date(Date.now() + (body?.active ? 45_000 : 2_000)).toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
