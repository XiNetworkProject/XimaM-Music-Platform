import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { conversationId } = params;

    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id)
      .single();

    if (!participation) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { data: rawMessages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Erreur messages:', msgError);
      return NextResponse.json({ error: 'Erreur recuperation' }, { status: 500 });
    }

    const { data: reads } = await supabase
      .from('message_reads')
      .select('message_id, user_id')
      .in('message_id', (rawMessages || []).map((m) => m.id));

    const readMap = new Map<string, string[]>();
    (reads || []).forEach((r) => {
      const arr = readMap.get(r.message_id) || [];
      arr.push(r.user_id);
      readMap.set(r.message_id, arr);
    });

    const senderIds = Array.from(new Set((rawMessages || []).map((m) => m.sender_id)));
    const profileMap = new Map<string, any>();

    for (const sid of senderIds) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .eq('id', sid)
        .single();
      if (p) profileMap.set(sid, p);
    }

    const messages = (rawMessages || []).map((m) => {
      const profile = profileMap.get(m.sender_id);
      return {
        _id: m.id,
        sender: profile
          ? { _id: profile.id, name: profile.name, username: profile.username, avatar: profile.avatar }
          : { _id: m.sender_id, name: 'Utilisateur', username: 'user' },
        type: 'text',
        content: m.content,
        mediaUrl: null,
        seenBy: [m.sender_id, ...(readMap.get(m.id) || [])],
        createdAt: m.created_at,
      };
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Erreur messages:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { conversationId } = params;
    const { type = 'text', content, duration } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id)
      .single();

    if (!participation) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        sender_id: session.user.id,
        content: content.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Erreur envoi:', msgError);
      return NextResponse.json({ error: 'Erreur envoi' }, { status: 500 });
    }

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, username, avatar')
      .eq('id', session.user.id)
      .single();

    return NextResponse.json({
      message: {
        _id: message.id,
        sender: profile
          ? { _id: profile.id, name: profile.name, username: profile.username, avatar: profile.avatar }
          : { _id: session.user.id, name: 'Vous', username: 'user' },
        type: type || 'text',
        content: message.content,
        duration: duration || null,
        seenBy: [session.user.id],
        createdAt: message.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Erreur envoi message:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
