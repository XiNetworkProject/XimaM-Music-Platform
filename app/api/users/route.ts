import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Récupérer les utilisateurs depuis Supabase
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
        is_verified,
        created_at,
        last_seen
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Erreur Supabase users:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des utilisateurs' },
        { status: 500 }
      );
    }

    // Transformer les données pour correspondre au format attendu
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
      isVerified: user.is_verified || false,
      createdAt: user.created_at,
      lastSeen: user.last_seen
    })) || [];

    console.log(`✅ ${formattedUsers.length} utilisateurs récupérés`);
    return NextResponse.json({ users: formattedUsers });

  } catch (error) {
    console.error('❌ Erreur serveur users:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
