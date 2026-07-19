import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { requireConversationParticipant } from '@/lib/messaging';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function roomName(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^#+/, '').replace(/\s+/g, '-').slice(0, 40);
}

export async function GET(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  if (!await requireConversationParticipant(params.conversationId, session.user.id)) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from('conversation_rooms')
    .select('id, name, room_type, position, created_by, created_at, updated_at')
    .eq('conversation_id', params.conversationId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: 'Salons indisponibles' }, { status: 500 });
  return NextResponse.json({ rooms: (data || []).map((room) => ({
    id: room.id,
    name: room.name,
    type: room.room_type,
    position: room.position,
    createdBy: room.created_by,
    createdAt: room.created_at,
  })) });
}

export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  const participant = await requireConversationParticipant(params.conversationId, session.user.id);
  if (!participant || !['owner', 'moderator'].includes(participant.role || 'member')) {
    return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const name = roomName(body?.name);
  const type = body?.type === 'voice_notes' ? 'voice_notes' : 'text';
  if (!name) return NextResponse.json({ error: 'Nom du salon requis' }, { status: 400 });
  const { count } = await supabaseAdmin
    .from('conversation_rooms')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', params.conversationId);
  if (Number(count || 0) >= 20) return NextResponse.json({ error: 'Limite de salons atteinte' }, { status: 409 });
  const { data, error } = await supabaseAdmin.from('conversation_rooms').insert({
    conversation_id: params.conversationId,
    name,
    room_type: type,
    position: Number(count || 0),
    created_by: session.user.id,
  }).select('id, name, room_type, position, created_by, created_at').single();
  if (error || !data) {
    const duplicate = error?.code === '23505';
    return NextResponse.json({ error: duplicate ? 'Ce nom est deja utilise' : 'Salon impossible a creer' }, { status: duplicate ? 409 : 500 });
  }
  return NextResponse.json({ room: {
    id: data.id,
    name: data.name,
    type: data.room_type,
    position: data.position,
    createdBy: data.created_by,
    createdAt: data.created_at,
  } }, { status: 201 });
}
