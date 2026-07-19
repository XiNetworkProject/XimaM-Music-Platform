import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { requireConversationParticipant } from '@/lib/messaging';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function manager(request: NextRequest, conversationId: string) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Non authentifie' }, { status: 401 }) };
  const participant = await requireConversationParticipant(conversationId, session.user.id);
  if (!participant || !['owner', 'moderator'].includes(participant.role || 'member')) {
    return { error: NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 }) };
  }
  return { session };
}

function roomName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/^#+/, '').replace(/\s+/g, '-').slice(0, 40) : '';
}

export async function PATCH(request: NextRequest, { params }: { params: { conversationId: string; roomId: string } }) {
  const checked = await manager(request, params.conversationId);
  if ('error' in checked) return checked.error;
  const body = await request.json().catch(() => null);
  const name = roomName(body?.name);
  const changes: Record<string, string> = {};
  if (name) changes.name = name;
  if (body?.type === 'text' || body?.type === 'voice_notes') changes.room_type = body.type;
  if (!Object.keys(changes).length) return NextResponse.json({ error: 'Aucune modification' }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('conversation_rooms')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', params.roomId)
    .eq('conversation_id', params.conversationId)
    .select('id, name, room_type, position, created_by, created_at')
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.code === '23505' ? 'Ce nom est deja utilise' : 'Salon introuvable' }, { status: error?.code === '23505' ? 409 : 404 });
  return NextResponse.json({ room: { id: data.id, name: data.name, type: data.room_type, position: data.position, createdBy: data.created_by, createdAt: data.created_at } });
}

export async function DELETE(request: NextRequest, { params }: { params: { conversationId: string; roomId: string } }) {
  const checked = await manager(request, params.conversationId);
  if ('error' in checked) return checked.error;
  const { data: rooms, error: roomsError } = await supabaseAdmin
    .from('conversation_rooms')
    .select('id')
    .eq('conversation_id', params.conversationId)
    .order('position', { ascending: true });
  if (roomsError) return NextResponse.json({ error: 'Salons indisponibles' }, { status: 500 });
  if ((rooms || []).length <= 1) return NextResponse.json({ error: 'Garde au moins un salon' }, { status: 409 });
  const replacement = (rooms || []).find((room) => room.id !== params.roomId);
  if (!replacement) return NextResponse.json({ error: 'Salon introuvable' }, { status: 404 });
  await supabaseAdmin.from('messages').update({ room_id: replacement.id }).eq('conversation_id', params.conversationId).eq('room_id', params.roomId);
  const { error } = await supabaseAdmin.from('conversation_rooms').delete().eq('id', params.roomId).eq('conversation_id', params.conversationId);
  if (error) return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
  return NextResponse.json({ success: true, replacementRoomId: replacement.id });
}
