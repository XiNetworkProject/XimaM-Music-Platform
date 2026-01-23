import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get('limit') || 30);
    const limit = Math.max(1, Math.min(50, Number.isFinite(limitRaw) ? limitRaw : 30));
    const cursor = url.searchParams.get('cursor'); // opened_at ISO, fetch older than this
    const sourcePrefix = (url.searchParams.get('sourcePrefix') || '').trim();

    let q = supabaseAdmin
      .from('user_booster_open_history')
      .select('id, opened_at, source, booster_key, rarity, type, multiplier, duration_hours')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false })
      .limit(limit);

    if (cursor) q = q.lt('opened_at', cursor);
    if (sourcePrefix) q = q.ilike('source', `${sourcePrefix}%`);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: 'Erreur historique' }, { status: 500 });

    const items = (data || []) as any[];
    const nextCursor = items.length ? String(items[items.length - 1]?.opened_at || '') : null;

    return NextResponse.json({ items, nextCursor });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

