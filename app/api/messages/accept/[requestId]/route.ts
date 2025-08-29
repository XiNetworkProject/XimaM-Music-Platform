import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { requestId } = params;

    // Récupérer l'utilisateur actuel
    const { data: currentUser, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer la demande d'amis
    const { data: friendRequest, error: requestError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !friendRequest) {
      return NextResponse.json({ error: 'Demande d\'amis non trouvée' }, { status: 404 });
    }

    if (friendRequest.to_user_id !== currentUser.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Créer la conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        participants: [friendRequest.from_user_id, friendRequest.to_user_id],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (convError) {
      console.error('❌ Erreur création conversation:', convError);
      return NextResponse.json({ error: 'Erreur lors de la création de la conversation' }, { status: 500 });
    }

    // Supprimer la demande d'amis
    const { error: deleteError } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);

    if (deleteError) {
      console.error('❌ Erreur suppression demande:', deleteError);
    }

    console.log('✅ Demande d\'amis acceptée, conversation créée:', conversation.id);

    return NextResponse.json({ 
      message: 'Demande d\'amis acceptée',
      conversation: conversation
    });

  } catch (error) {
    console.error('❌ Erreur acceptation demande:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}