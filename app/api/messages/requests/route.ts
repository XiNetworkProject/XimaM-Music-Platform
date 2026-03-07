import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const userId = session.user.id;

    const { data: requests, error } = await supabaseAdmin
      .from('message_requests')
      .select('*')
      .eq('target_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur recuperation demandes:', error);
      return NextResponse.json({ requests: [] });
    }

    const enriched = await Promise.all(
      (requests || []).map(async (req) => {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, name, username, avatar')
          .eq('id', req.requester_id)
          .single();

        return {
          _id: req.id,
          from: profile
            ? { _id: profile.id, name: profile.name, username: profile.username, avatar: profile.avatar }
            : { _id: req.requester_id, name: 'Utilisateur', username: 'user', avatar: null },
          message: req.message,
          status: req.status,
          createdAt: req.created_at,
        };
      }),
    );

    return NextResponse.json({ requests: enriched });
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { targetId, message } = await request.json();
    const requesterId = session.user.id;

    if (!targetId) {
      return NextResponse.json({ error: 'ID cible requis' }, { status: 400 });
    }

    if (requesterId === targetId) {
      return NextResponse.json({ error: 'Impossible de s\'envoyer une demande' }, { status: 400 });
    }

    const { data: existingConv } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', requesterId);

    if (existingConv && existingConv.length > 0) {
      const convIds = existingConv.map((p) => p.conversation_id);

      const { data: otherParts } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', targetId)
        .in('conversation_id', convIds);

      if (otherParts && otherParts.length > 0) {
        for (const op of otherParts) {
          const { data: conv } = await supabaseAdmin
            .from('conversations')
            .select('id, type')
            .eq('id', op.conversation_id)
            .eq('type', 'direct')
            .eq('is_active', true)
            .single();

          if (conv) {
            return NextResponse.json({
              alreadyConnected: true,
              conversationId: conv.id,
            });
          }
        }
      }
    }

    const { data: existingReq } = await supabaseAdmin
      .from('message_requests')
      .select('id, status')
      .eq('requester_id', requesterId)
      .eq('target_id', targetId)
      .in('status', ['pending'])
      .maybeSingle();

    if (existingReq) {
      return NextResponse.json({ alreadySent: true });
    }

    const { data: reverseReq } = await supabaseAdmin
      .from('message_requests')
      .select('id')
      .eq('requester_id', targetId)
      .eq('target_id', requesterId)
      .eq('status', 'pending')
      .maybeSingle();

    if (reverseReq) {
      const convId = await acceptAndCreateConversation(requesterId, targetId, reverseReq.id);
      return NextResponse.json({ alreadyConnected: true, conversationId: convId });
    }

    const { data: newReq, error: insertError } = await supabaseAdmin
      .from('message_requests')
      .insert({
        requester_id: requesterId,
        target_id: targetId,
        message: message || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur creation demande:', insertError);
      return NextResponse.json({ error: 'Erreur creation demande' }, { status: 500 });
    }

    return NextResponse.json({ success: true, requestId: newReq.id });
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

async function acceptAndCreateConversation(
  userId1: string,
  userId2: string,
  requestId: string,
): Promise<string> {
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .insert({ type: 'direct', created_by: userId1 })
    .select()
    .single();

  if (conv) {
    await supabaseAdmin
      .from('conversation_participants')
      .insert([
        { conversation_id: conv.id, user_id: userId1 },
        { conversation_id: conv.id, user_id: userId2 },
      ]);
  }

  await supabaseAdmin
    .from('message_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId);

  return conv?.id || '';
}
