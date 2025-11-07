import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;

    if (!username) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur requis' },
        { status: 400 }
      );
    }

    console.log(`🔍 Récupération du profil pour: ${username}`);

    // Récupérer la session pour vérifier si l'utilisateur connecté a liké les tracks
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    // Récupérer le profil utilisateur depuis Supabase
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      console.log(`❌ Profil non trouvé pour: ${username}`);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    console.log(`✅ Profil trouvé pour: ${username}`);

    // Récupérer les tracks de l'utilisateur
    const { data: tracks, error: tracksError } = await supabaseAdmin
      .from('tracks')
      .select('*')
      .eq('creator_id', profile.id)
      .order('created_at', { ascending: false });

    // Si un utilisateur est connecté, récupérer l'état de like pour chaque track
    let tracksWithLikes = tracks || [];
    if (currentUserId && tracks && tracks.length > 0) {
      const trackIds = tracks.map(t => t.id);
      
      const { data: likes } = await supabaseAdmin
        .from('track_likes')
        .select('track_id')
        .eq('user_id', currentUserId)
        .in('track_id', trackIds);

      const likedTrackIds = new Set(likes?.map(l => l.track_id) || []);
      
      tracksWithLikes = tracks.map(track => ({
        ...track,
        isLiked: likedTrackIds.has(track.id)
      }));
    } else {
      tracksWithLikes = tracks?.map(track => ({
        ...track,
        isLiked: false
      })) || [];
    }

    // Remplacer tracks par tracksWithLikes dans la suite du code
    const tracks_final = tracksWithLikes;

    // Récupérer les playlists de l'utilisateur
    const { data: playlists, error: playlistsError } = await supabaseAdmin
      .from('playlists')
      .select('*')
      .eq('creator_id', profile.id)
      .order('created_at', { ascending: false });

    // Calculer les statistiques
    const totalPlays = tracks_final?.reduce((sum, track) => sum + (track.plays || 0), 0) || 0;
    const totalLikes = tracks_final?.reduce((sum, track) => sum + (track.likes || 0), 0) || 0;
    const tracksCount = tracks_final?.length || 0;
    const playlistsCount = playlists?.length || 0;

    // Construire la réponse
    const userProfile = {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
      banner: profile.banner || null,
      bio: profile.bio || '',
      location: profile.location || '',
      website: profile.website || '',
      isArtist: profile.is_artist || false,
      artistName: profile.artist_name || '',
      genre: profile.genre || [],
      isVerified: profile.is_verified || false,
      role: profile.role || 'user',
      totalPlays,
      totalLikes,
      tracksCount,
      playlistsCount,
      followerCount: profile.follower_count || 0,
      followingCount: profile.following_count || 0,
      tracks: tracks_final || [],
      playlists: playlists || [],
      lastSeen: profile.last_seen,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };

    return NextResponse.json(userProfile);

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du profil:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    const body = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur requis' },
        { status: 400 }
      );
    }

    console.log(`🔄 Mise à jour du profil pour: ${username}`);

    // Vérifier que l'utilisateur existe
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (profileError || !existingProfile) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Mettre à jour le profil
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        name: body.name,
        bio: body.bio,
        location: body.location,
        website: body.website,
        is_artist: body.isArtist,
        artist_name: body.artistName,
        genre: body.genre,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingProfile.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    console.log(`✅ Profil mis à jour pour: ${username}`);
    return NextResponse.json(updatedProfile);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du profil:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
