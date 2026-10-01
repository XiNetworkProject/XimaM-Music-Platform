import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { dbAdmin } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await dbAdmin
      .from('active_track_boosts')
      .select('id, track_id, booster_id, multiplier, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', nowIso)
      .order('expires_at', { ascending: false });
    const { data: artistBoosts, error: artErr } = await dbAdmin
      .from('active_artist_boosts')
      .select('id, artist_id, booster_id, multiplier, expires_at')
      .eq('artist_id', userId)
      .gt('expires_at', nowIso)
      .order('expires_at', { ascending: false });

    if (error || artErr) {
      return NextResponse.json({ error: 'Erreur récupération boosts' }, { status: 500 });
    }

    const ids = Array.from(new Set([...(data || []), ...(artistBoosts || [])].map((row: any) => row.booster_id).filter(Boolean)));
    const { data: catalog, error: catalogError } = ids.length
      ? await dbAdmin.from('boosters').select('id,key').in('id', ids)
      : { data: [], error: null };
    if (catalogError) return NextResponse.json({ error: 'Détails des boosts indisponibles' }, { status: 500 });
    const keys = new Map((catalog || []).map((row: any) => [row.id, row.key]));
    const detail = (row: any) => ({ ...row, booster_key: keys.get(row.booster_id) });
    return NextResponse.json({ boosts: (data || []).map(detail), artistBoosts: (artistBoosts || []).map(detail) });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
