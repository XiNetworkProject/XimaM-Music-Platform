import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

const EARLY_ACCESS_LIMIT = 50;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin (vous pouvez adapter cette logique)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', session.user.id)
      .single();

    // Pour l'instant, permettre à tous les utilisateurs authentifiés d'inviter
    // Vous pouvez ajouter une vérification admin plus stricte ici

    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    // Vérifier le nombre actuel d'utilisateurs early access
    const { count: currentCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('early_access', true);

    if ((currentCount || 0) >= EARLY_ACCESS_LIMIT) {
      return NextResponse.json({ 
        error: `Limite atteinte (${EARLY_ACCESS_LIMIT} utilisateurs)` 
      }, { status: 403 });
    }

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, early_access')
      .eq('email', email)
      .single();

    if (existingUser) {
      if (existingUser.early_access) {
        return NextResponse.json({ message: 'Utilisateur a déjà l\'accès anticipé' }, { status: 200 });
      }

      // Mettre à jour l'utilisateur existant
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ early_access: true })
        .eq('id', existingUser.id);

      if (updateError) {
        return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
      }

      // Mettre à jour le statut dans waiting_list
      await supabaseAdmin
        .from('waiting_list')
        .update({ 
          status: 'invited',
          invited_at: new Date().toISOString()
        })
        .eq('email', email);

      return NextResponse.json({ 
        message: 'Accès anticipé accordé à l\'utilisateur existant' 
      }, { status: 200 });
    }

    return NextResponse.json({ 
      message: 'Utilisateur non trouvé. Il doit d\'abord créer un compte.' 
    }, { status: 404 });

  } catch (error) {
    console.error('Erreur API invite early access:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Compter les utilisateurs early access
    const { count: earlyAccessCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('early_access', true);

    // Compter la liste d'attente
    const { count: waitingCount } = await supabaseAdmin
      .from('waiting_list')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting');

    return NextResponse.json({
      earlyAccessCount: earlyAccessCount || 0,
      waitingCount: waitingCount || 0,
      limit: EARLY_ACCESS_LIMIT,
      remaining: EARLY_ACCESS_LIMIT - (earlyAccessCount || 0)
    });
  } catch (error) {
    console.error('Erreur récupération stats early access:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
