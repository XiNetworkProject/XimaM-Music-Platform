import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = (searchParams.get('search') || '').trim();

    // Sélection de toutes les pistes IA de l'utilisateur (via la génération parente)
    let query = supabaseAdmin
      .from('ai_tracks')
      .select(`
        *,
        generation:ai_generations!ai_tracks_generation_id_fkey(id, user_id, model, created_at, prompt, status)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filtrer côté serveur: ne garder que les pistes dont la génération appartient à l'utilisateur courant
    const tracks = (data || []).filter((t: any) => t.generation?.user_id === session.user.id);

    return NextResponse.json({ tracks, pagination: { limit, offset, total: tracks.length } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}


