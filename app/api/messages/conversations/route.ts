import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const userId = session.user.id;

    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (partError) {
      console.error('Erreur recuperation participations:', partError);
      return NextResponse.json({ conversations: [], total: 0 });
    }

    if (!participations || participations.length === 0) {
      return NextResponse.json({ conversations: [], total: 0 });
    }

    const convIds = participations.map((p) => p.conversation_id);

    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('updated_at', { ascending: false });

    if (convError) {
      console.error('Erreur recuperation conversations:', convError);
      return NextResponse.json({ conversations: [], total: 0 });
    }

    const enriched = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: parts } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.id);

        const participantIds = (parts || []).map((p) => p.user_id);

        const participantsInfo = await Promise.all(
          participantIds.map(async (pid: string) => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, name, username, avatar')
                .eq('id', pid)
                .single();
              return profile
                ? { _id: profile.id, name: profile.name, username: profile.username, avatar: profile.avatar }
                : { _id: pid, name: 'Utilisateur', username: 'user', avatar: null };
            } catch {
              return { _id: pid, name: 'Utilisateur', username: 'user', avatar: null };
            }
          }),
        );

        const { data: lastMsgArr } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsg = lastMsgArr?.[0] || null;

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', userId)
          .eq('is_read', false);

        return {
          _id: conv.id,
          name: conv.name,
          type: conv.is_group ? 'group' : 'direct',
          accepted: true,
          participants: participantsInfo,
          lastMessage: lastMsg
            ? {
                _id: lastMsg.id,
                content: lastMsg.content,
                type: lastMsg.message_type || 'text',
                createdAt: lastMsg.created_at,
                senderId: lastMsg.sender_id,
              }
            : null,
          unreadCount: unreadCount || 0,
          createdAt: conv.created_at,
          updatedAt: conv.updated_at,
        };
      }),
    );

    return NextResponse.json({ conversations: enriched, total: enriched.length });
  } catch (error) {
    console.error('Erreur serveur conversations:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { participantId, name } = await request.json();

    if (!participantId) {
      return NextResponse.json({ error: 'ID du participant requis' }, { status: 400 });
    }

    const userId = session.user.id;

    {
      const { data: existingParts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (existingParts && existingParts.length > 0) {
        const existingConvIds = existingParts.map((p) => p.conversation_id);

        const { data: otherParts } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', participantId)
          .in('conversation_id', existingConvIds);

        if (otherParts && otherParts.length > 0) {
          for (const op of otherParts) {
            const { data: conv } = await supabase
              .from('conversations')
              .select('*')
              .eq('id', op.conversation_id)
              .eq('is_group', false)
              .single();

            if (conv) {
              return NextResponse.json({
                _id: conv.id,
                name: conv.name,
                type: 'direct',
                exists: true,
              });
            }
          }
        }
      }
    }

    const convId = crypto.randomUUID();
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        id: convId,
        name: name || null,
        is_group: false,
      })
      .select()
      .single();

    if (convError || !newConv) {
      console.error('Erreur creation conversation:', convError);
      return NextResponse.json({ error: 'Erreur creation conversation' }, { status: 500 });
    }

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConv.id, user_id: userId },
        { conversation_id: newConv.id, user_id: participantId },
      ]);

    if (partError) {
      console.error('Erreur ajout participants:', partError);
    }

    return NextResponse.json(
      { _id: newConv.id, name: newConv.name, type: 'direct' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Erreur creation conversation:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
