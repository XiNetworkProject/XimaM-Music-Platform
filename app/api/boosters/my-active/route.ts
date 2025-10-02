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
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('active_track_boosts')
      .select('track_id, multiplier, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', nowIso)
      .order('expires_at', { ascending: false });
    const { data: artistBoosts, error: artErr } = await supabaseAdmin
      .from('active_artist_boosts')
      .select('artist_id, multiplier, expires_at')
      .eq('artist_id', userId)
      .gt('expires_at', nowIso)
      .order('expires_at', { ascending: false });

    if (error || artErr) {
      return NextResponse.json({ error: 'Erreur récupération boosts' }, { status: 500 });
    }

    return NextResponse.json({ boosts: data || [], artistBoosts: artistBoosts || [] });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}


