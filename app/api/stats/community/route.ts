import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Récupérer les statistiques de la communauté depuis Supabase
    const [
      { count: totalUsers },
      { count: totalTracks },
      { count: totalPlaylists },
      { count: totalComments }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('tracks').select('*', { count: 'exact', head: true }),
      supabase.from('playlists').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true })
    ]);

    // Récupérer les utilisateurs en ligne (dernière activité dans les 5 dernières minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: onlineUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', fiveMinutesAgo);

    const stats = {
      totalUsers: totalUsers || 0,
      totalTracks: totalTracks || 0,
      totalPlaylists: totalPlaylists || 0,
      totalComments: totalComments || 0,
      onlineUsers: onlineUsers || 0
    };

    console.log('✅ Statistiques communauté récupérées:', stats);
    return NextResponse.json({ success: true, data: stats });

  } catch (error) {
    console.error('❌ Erreur serveur stats community:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}
