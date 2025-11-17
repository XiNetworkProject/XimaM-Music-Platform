import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint pour publier automatiquement les bulletins programmés dont l'heure est passée.
 * 
 * À appeler :
 * - Par un job CRON (Vercel Cron ou autre) toutes les 5-10 minutes
 * - Manuellement depuis le dashboard admin
 * 
 * Protection : 
 * - GET : peut être appelé par un CRON externe avec une clé API (CRON_SECRET)
 * - POST : nécessite l'authentification admin
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier la clé API pour les appels CRON
    const { searchParams } = new URL(request.url);
    const cronSecret = searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'your-secret-key-change-in-production';

    if (cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Clé API invalide' }, { status: 403 });
    }

    // Appeler la logique de publication
    return await publishScheduledBulletins();
  } catch (error) {
    console.error('Erreur API publish-scheduled GET:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification (admin uniquement)
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || session.user.email !== 'alertempsfrance@gmail.com') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Appeler la logique de publication
    return await publishScheduledBulletins();
  } catch (error) {
    console.error('Erreur API publish-scheduled POST:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

async function publishScheduledBulletins() {
  // Récupérer tous les bulletins programmés dont l'heure est passée
  const now = new Date().toISOString();
  
  const { data: scheduledBulletins, error: fetchError } = await supabaseAdmin
    .from('meteo_bulletins')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now);

  if (fetchError) {
    return NextResponse.json({ 
      error: 'Erreur lors de la récupération des bulletins programmés',
      details: fetchError.message 
    }, { status: 500 });
  }

  if (!scheduledBulletins || scheduledBulletins.length === 0) {
    return NextResponse.json({ 
      publishedCount: 0,
      publishedIds: [],
      message: 'Aucun bulletin programmé à publier'
    });
  }

  const publishedIds: string[] = [];

  // Pour chaque bulletin programmé, le publier
  for (const bulletin of scheduledBulletins) {
    try {
      // Mettre tous les bulletins publiés existants à is_current = false
      await supabaseAdmin
        .from('meteo_bulletins')
        .update({ is_current: false })
        .eq('author_id', bulletin.author_id)
        .eq('is_current', true)
        .eq('status', 'published');

      // Publier le bulletin programmé
      const { error: updateError } = await supabaseAdmin
        .from('meteo_bulletins')
        .update({ 
          status: 'published',
          is_current: true,
          scheduled_at: null // Retirer la date de programmation
        })
        .eq('id', bulletin.id);

      if (!updateError) {
        publishedIds.push(bulletin.id);
      } else {
        console.error(`Erreur publication bulletin ${bulletin.id}:`, updateError);
      }
    } catch (error) {
      console.error(`Erreur lors de la publication du bulletin ${bulletin.id}:`, error);
    }
  }

  return NextResponse.json({ 
    publishedCount: publishedIds.length,
    publishedIds,
    message: `${publishedIds.length} bulletin(s) publié(s) avec succès`
  });
}

