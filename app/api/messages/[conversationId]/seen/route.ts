import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { conversationId } = params;

    // Vérifier que l'utilisateur fait partie de la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 });
    }

    if (!conversation.participants.includes(session.user.id)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Marquer tous les messages comme vus
    const { error: updateError } = await supabase
      .from('messages')
      .update({ 
        seen: true,
        seen_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', session.user.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour messages:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Messages marqués comme vus' });

  } catch (error) {
    console.error('❌ Erreur marquage messages:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}