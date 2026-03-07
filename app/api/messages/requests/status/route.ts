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

    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('targetId');

    if (!targetId) {
      return NextResponse.json({ error: 'targetId requis' }, { status: 400 });
    }

    const userId = session.user.id;

    const { data: myParts } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (myParts && myParts.length > 0) {
      const convIds = myParts.map((p) => p.conversation_id);

      const { data: otherParts } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', targetId)
        .in('conversation_id', convIds);

      if (otherParts && otherParts.length > 0) {
        for (const op of otherParts) {
          const { data: conv } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('id', op.conversation_id)
            .eq('is_group', false)
            .single();

          if (conv) {
            return NextResponse.json({ status: 'accepted', conversationId: conv.id });
          }
        }
      }
    }

    const { data: sentReq } = await supabaseAdmin
      .from('message_requests')
      .select('id, status')
      .eq('requester_id', userId)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sentReq) {
      if (sentReq.status === 'accepted') {
        return NextResponse.json({ status: 'accepted' });
      }
      if (sentReq.status === 'pending') {
        return NextResponse.json({ status: 'pending' });
      }
    }

    return NextResponse.json({ status: 'none' });
  } catch (error) {
    console.error('Erreur statut demande:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
