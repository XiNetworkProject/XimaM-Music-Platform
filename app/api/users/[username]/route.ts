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
    const isOwnProfile = Boolean(currentUserId && String(currentUserId) === String(profile.id));

    // Récupérer les tracks "manuelles" de l'utilisateur
    let tracksQuery = supabaseAdmin
      .from('tracks')
      .select('*')
      .eq('creator_id', profile.id)
      .order('created_at', { ascending: false });

    if (!isOwnProfile) {
      tracksQuery = tracksQuery.eq('is_public', true);
    }

    const { data: tracks, error: tracksError } = await tracksQuery;
    if (tracksError) {
      console.error('❌ Erreur récupération tracks manuelles:', tracksError);
    }

    // Récupérer les tracks IA publiées (ou toutes si propriétaire du profil)
    let aiTracksQuery = supabaseAdmin
      .from('ai_tracks')
      .select(`
        id, title, audio_url, image_url, duration, prompt, tags, play_count, like_count, created_at,
        generation:ai_generations!inner(id, user_id, is_public, status, task_id, model)
      `)
      .eq('generation.user_id', profile.id)
      .eq('generation.status', 'completed')
      .order('created_at', { ascending: false });

    if (!isOwnProfile) {
      aiTracksQuery = aiTracksQuery.eq('generation.is_public', true);
    }

    const { data: aiTracks, error: aiTracksError } = await aiTracksQuery;
    if (aiTracksError) {
      console.error('❌ Erreur récupération tracks IA:', aiTracksError);
    }

    // Si un utilisateur est connecté, récupérer l'état de like pour chaque track
    let manualTracksWithLikes = tracks || [];
    if (currentUserId && tracks && tracks.length > 0) {
      const trackIds = tracks.map((t: any) => t.id);
      
      const { data: likes } = await supabaseAdmin
        .from('track_likes')
        .select('track_id')
        .eq('user_id', currentUserId)
        .in('track_id', trackIds);

      const likedTrackIds = new Set(likes?.map(l => l.track_id) || []);
      
      manualTracksWithLikes = tracks.map(track => ({
        ...track,
        isLiked: likedTrackIds.has(track.id)
      }));
    } else {
      manualTracksWithLikes = tracks?.map(track => ({
        ...track,
        isLiked: false
      })) || [];
    }

    const aiTracksNormalized = (aiTracks || []).map((t: any) => ({
      id: `ai-${t.id}`,
      raw_id: t.id,
      title: t.title || 'Titre IA',
      audio_url: t.audio_url || '',
      cover_url: t.image_url || '/default-cover.jpg',
      duration: t.duration || 0,
      created_at: t.created_at,
      prompt: t.prompt || '',
      genre: Array.isArray(t.tags) ? t.tags : [],
      plays: t.play_count || 0,
      likes: t.like_count || 0,
      is_public: Boolean(t?.generation?.is_public),
      isLiked: false, // Like IA non supporté par le système tracks classique
      is_ai: true,
      generation_id: t?.generation?.id || null,
      generation_task_id: t?.generation?.task_id || null,
      model_name: t?.generation?.model || null,
      creator_id: profile.id,
      artist_name: profile.artist_name || profile.name || profile.username || 'Synaura IA',
    }));

    const tracks_final = [...manualTracksWithLikes, ...aiTracksNormalized].sort((a: any, b: any) => {
      const ad = new Date(a?.created_at || 0).getTime();
      const bd = new Date(b?.created_at || 0).getTime();
      return bd - ad;
    });

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

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
      .select('id, username')
      .eq('username', username)
      .single();

    if (profileError || !existingProfile) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur modifie son propre profil
    if (existingProfile.id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
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
      .eq('id', session.user.id)
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
