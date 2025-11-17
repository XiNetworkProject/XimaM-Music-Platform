import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MeteoStatsResponse = {
  bulletinId: string;
  totalViews: number;
  viewsPerDay: {
    date: string; // "2025-11-17"
    count: number;
  }[];
  bySource: {
    source: string; // 'home', 'meteo_page', 'unknown', ...
    count: number;
  }[];
};

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification (admin uniquement)
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || session.user.email !== 'alertempsfrance@gmail.com') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer les paramètres
    const { searchParams } = new URL(request.url);
    const bulletinIdParam = searchParams.get('bulletinId');
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 7;
    const safeDays = Math.min(Math.max(1, days), 365); // Entre 1 et 365 jours

    let bulletinId: string;

    // Si bulletinId n'est pas fourni, récupérer le bulletin actuel
    if (!bulletinIdParam) {
      const { data: currentBulletin, error: currentError } = await supabaseAdmin
        .from('meteo_bulletins')
        .select('id')
        .eq('is_current', true)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (currentError || !currentBulletin) {
        return NextResponse.json({ 
          error: 'Aucun bulletin actuel trouvé',
          details: currentError?.message 
        }, { status: 404 });
      }

      bulletinId = currentBulletin.id;
    } else {
      bulletinId = bulletinIdParam;
    }

    // Vérifier que le bulletin existe
    const { data: bulletin, error: bulletinError } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('id')
      .eq('id', bulletinId)
      .single();

    if (bulletinError || !bulletin) {
      return NextResponse.json({ 
        error: 'Bulletin introuvable',
        details: bulletinError?.message 
      }, { status: 404 });
    }

    // Calculer la date de début (N jours en arrière)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - safeDays);
    const startDateISO = startDate.toISOString();

    // Récupérer toutes les vues pour ce bulletin dans la période
    const { data: views, error: viewsError } = await supabaseAdmin
      .from('meteo_views')
      .select('created_at, source')
      .eq('bulletin_id', bulletinId)
      .gte('created_at', startDateISO)
      .order('created_at', { ascending: true });

    if (viewsError) {
      return NextResponse.json({ 
        error: 'Erreur lors de la récupération des vues',
        details: viewsError.message 
      }, { status: 500 });
    }

    const viewsList = views || [];

    // Calculer le total
    const totalViews = viewsList.length;

    // Agréger par jour
    const viewsByDay = new Map<string, number>();
    
    // Initialiser tous les jours de la période à 0
    for (let i = 0; i < safeDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (safeDays - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      viewsByDay.set(dateStr, 0);
    }

    // Compter les vues par jour
    viewsList.forEach((view) => {
      const dateStr = new Date(view.created_at).toISOString().split('T')[0];
      const current = viewsByDay.get(dateStr) || 0;
      viewsByDay.set(dateStr, current + 1);
    });

    // Convertir en tableau trié
    const viewsPerDay = Array.from(viewsByDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Agréger par source
    const viewsBySource = new Map<string, number>();
    viewsList.forEach((view) => {
      const source = view.source || 'unknown';
      const current = viewsBySource.get(source) || 0;
      viewsBySource.set(source, current + 1);
    });

    // Convertir en tableau trié par count décroissant
    const bySource = Array.from(viewsBySource.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    const response: MeteoStatsResponse = {
      bulletinId,
      totalViews,
      viewsPerDay,
      bySource,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erreur API meteo stats:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

