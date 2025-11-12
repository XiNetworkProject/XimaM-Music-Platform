import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Récupérer les utilisateurs populaires depuis Supabase
    // Trier par follower_count, total_plays et total_likes pour obtenir les plus populaires
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        name,
        email,
        avatar,
        bio,
        location,
        website,
        is_artist,
        artist_name,
        genre,
        total_plays,
        total_likes,
        follower_count,
        following_count,
        is_verified,
        created_at,
        last_seen
      `)
      .order('follower_count', { ascending: false })
      .order('total_plays', { ascending: false })
      .order('total_likes', { ascending: false })
      .limit(limit * 2); // Récupérer plus pour filtrer et trier

    if (error) {
      console.error('❌ Erreur Supabase popular users:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des utilisateurs populaires' },
        { status: 500 }
      );
    }

    // Charger boosts artiste actifs et appliquer un score d'ordre boosté (plafonné x1.2)
    const userIds = (users || []).map(u => u.id);
    let artistBoostMap = new Map<string, number>();
    if (userIds.length) {
      const nowIso = new Date().toISOString();
      const { data: abs } = await supabaseAdmin
        .from('active_artist_boosts')
        .select('artist_id, multiplier, expires_at')
        .in('artist_id', userIds)
        .gt('expires_at', nowIso);
      (abs || []).forEach((b: any) => {
        const curr = artistBoostMap.get(b.artist_id) || 1;
        artistBoostMap.set(b.artist_id, Math.max(curr, Number(b.multiplier) || 1));
      });
    }

    // Calculer un score de popularité combiné
    const formattedUsers = users?.map(user => ({
      _id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      website: user.website,
      isArtist: user.is_artist || false,
      artistName: user.artist_name,
      genre: user.genre || [],
      totalPlays: user.total_plays || 0,
      totalLikes: user.total_likes || 0,
      followerCount: user.follower_count || 0,
      followingCount: user.following_count || 0,
      isVerified: user.is_verified || false,
      createdAt: user.created_at,
      lastSeen: user.last_seen,
      // Score de popularité: followers (poids 3) + plays (poids 1) + likes (poids 2) * boost
      popularityScore: (
        (user.follower_count || 0) * 3 +
        (user.total_plays || 0) * 1 +
        (user.total_likes || 0) * 2
      ) * Math.min(artistBoostMap.get(user.id) || 1, 1.2)
    })) || [];

    // Trier par score de popularité et limiter
    const sorted = formattedUsers
      .sort((a: any, b: any) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, limit);

    console.log(`✅ ${sorted.length} utilisateurs populaires récupérés`);
    return NextResponse.json({ users: sorted });

  } catch (error) {
    console.error('❌ Erreur serveur popular users:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}

