import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
    }

    const { id } = params;
    const { action } = await request.json();

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide (accept/reject)' }, { status: 400 });
    }

    const { data: req, error: reqError } = await supabaseAdmin
      .from('message_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (reqError || !req) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    if (req.target_id !== session.user.id) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    if (req.status !== 'pending') {
      return NextResponse.json({ error: 'Demande deja traitee' }, { status: 400 });
    }

    if (action === 'accept') {
      const { data: conv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({ type: 'direct' })
        .select()
        .single();

      if (convError || !conv) {
        console.error('Erreur creation conversation:', convError);
        return NextResponse.json({ error: 'Erreur creation conversation' }, { status: 500 });
      }

      await supabaseAdmin.from('conversation_participants').insert([
        { conversation_id: conv.id, user_id: req.requester_id },
        { conversation_id: conv.id, user_id: req.target_id },
      ]);

      if (req.message) {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conv.id,
          sender_id: req.requester_id,
          content: req.message,
          message_type: 'text',
        });
      }

      await supabaseAdmin
        .from('message_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        action: 'accepted',
        conversationId: conv.id,
      });
    } else {
      await supabaseAdmin
        .from('message_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id);

      return NextResponse.json({ success: true, action: 'rejected' });
    }
  } catch (error) {
    console.error('Erreur traitement demande:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
