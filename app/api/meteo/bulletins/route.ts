import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || session.user.email !== 'alertempsfrance@gmail.com') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer les paramètres (limit et status optionnels)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const safeLimit = Math.min(Math.max(1, limit), 100); // Entre 1 et 100
    const status = searchParams.get('status'); // 'draft', 'published' ou 'scheduled'

    // Construire la requête
    let query = supabaseAdmin
      .from('meteo_bulletins')
      .select('*')
      .eq('author_id', session.user.id);

    // Filtrer par status si fourni
    if (status === 'draft' || status === 'published' || status === 'scheduled') {
      query = query.eq('status', status);
    }

    // Récupérer tous les bulletins de l'utilisateur, triés par date de création DESC
    const { data: bulletins, error } = await query
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      return NextResponse.json({ 
        error: 'Erreur lors de la récupération des bulletins',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      bulletins: bulletins || [],
      count: bulletins?.length || 0
    });

  } catch (error) {
    console.error('Erreur API bulletins GET:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

