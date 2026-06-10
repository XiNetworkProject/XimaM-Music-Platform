// app/api/ai/library/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    let query = supabaseAdmin
      .from('ai_generations')
      .select('*, tracks:ai_tracks(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (search) query = query.ilike('prompt', `%${search.replace(/[%_]/g, '\\$&')}%`);
    const { data: generations, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      generations,
      pagination: {
        limit,
        offset,
        total: generations?.length || 0
      }
    });

  } catch (error: any) {
    console.error('Erreur bibliothèque:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
