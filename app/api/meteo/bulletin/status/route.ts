import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || session.user.email !== 'alertempsfrance@gmail.com') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer le body JSON
    const body = await request.json();
    const { id, status } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID du bulletin requis' }, { status: 400 });
    }

    if (!status || (status !== 'draft' && status !== 'published')) {
      return NextResponse.json({ 
        error: 'Status invalide. Doit être "draft" ou "published"' 
      }, { status: 400 });
    }

    // Vérifier que le bulletin existe et appartient à l'utilisateur
    const { data: bulletin, error: fetchError } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('*')
      .eq('id', id)
      .eq('author_id', session.user.id)
      .single();

    if (fetchError || !bulletin) {
      return NextResponse.json({ 
        error: 'Bulletin introuvable ou accès non autorisé',
        details: fetchError?.message 
      }, { status: 404 });
    }

    // Si on publie le bulletin
    if (status === 'published') {
      // Mettre tous les bulletins publiés à is_current = false
      const { error: updateAllError } = await supabaseAdmin
        .from('meteo_bulletins')
        .update({ is_current: false })
        .eq('author_id', session.user.id)
        .eq('is_current', true)
        .eq('status', 'published');

      if (updateAllError) {
        console.error('Erreur mise à jour bulletins existants:', updateAllError);
        return NextResponse.json({ 
          error: 'Erreur lors de la mise à jour des bulletins',
          details: updateAllError.message 
        }, { status: 500 });
      }

      // Mettre le bulletin cible à published et is_current = true
      const { data: updatedBulletin, error: updateError } = await supabaseAdmin
        .from('meteo_bulletins')
        .update({ 
          status: 'published',
          is_current: true 
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ 
          error: 'Erreur lors de la publication du bulletin',
          details: updateError.message 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true,
        bulletin: updatedBulletin,
        message: 'Bulletin publié avec succès'
      });
    }

    // Si on met en brouillon
    if (status === 'draft') {
      // Mettre le bulletin à draft et is_current = false
      const { data: updatedBulletin, error: updateError } = await supabaseAdmin
        .from('meteo_bulletins')
        .update({ 
          status: 'draft',
          is_current: false 
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ 
          error: 'Erreur lors de la mise en brouillon',
          details: updateError.message 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true,
        bulletin: updatedBulletin,
        message: 'Bulletin mis en brouillon'
      });
    }

    return NextResponse.json({ 
      error: 'Status non géré' 
    }, { status: 400 });

  } catch (error) {
    console.error('Erreur API bulletin status:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

