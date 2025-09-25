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

    // Sélection des pistes IA liées à l'utilisateur via un INNER JOIN sur la génération
    const { data, error } = await supabaseAdmin
      .from('ai_tracks')
      .select(
        `
          *,
          generation:ai_generations!inner(id, user_id, model, created_at, prompt, status)
        `
      )
      .eq('generation.user_id', session.user.id)
      .ilike('title', search ? `%${search}%` : '%')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return NextResponse.json({ tracks: data || [], pagination: { limit, offset, total: (data || []).length } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}


