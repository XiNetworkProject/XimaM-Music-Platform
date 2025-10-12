import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { getEntitlements } from '@/lib/entitlements';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const userId = session.user.id;
    const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', userId).maybeSingle();
    const plan = (profile?.plan || 'free') as any;
    const ent = getEntitlements(plan);

    const { count: tracksCount } = await supabaseAdmin.from('tracks').select('*', { count: 'exact', head: true }).eq('creator_id', userId);
    const { count: playlistsCount } = await supabaseAdmin.from('playlists').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    // Stockage supprimé

    return NextResponse.json({
      tracks: { used: tracksCount || 0, limit: ent.uploads.maxTracks, percentage: ent.uploads.maxTracks > 0 ? Math.min(100, Math.round(((tracksCount || 0) / ent.uploads.maxTracks) * 100)) : 0 },
      playlists: { used: playlistsCount || 0, limit: ent.uploads.maxPlaylists, percentage: ent.uploads.maxPlaylists > 0 ? Math.min(100, Math.round(((playlistsCount || 0) / ent.uploads.maxPlaylists) * 100)) : 0 },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}