import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    const [normalRes, aiRes] = await Promise.all([
      supabase
        .from('tracks')
        .select(`
          *,
          profiles!tracks_creator_id_fkey (
            id, username, name, avatar, is_artist, artist_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit),

      supabaseAdmin
        .from('ai_tracks')
        .select(`
          id, title, audio_url, image_url, duration, tags, play_count, created_at, is_public,
          generation:ai_generations!inner (
            id, user_id, is_public, status, metadata, prompt
          )
        `)
        .eq('is_public', true)
        .eq('generation.status', 'completed')
        .order('created_at', { ascending: false })
        .limit(Math.floor(limit / 3)),
    ]);

    if (normalRes.error) {
      console.error('Erreur Supabase recent tracks:', normalRes.error);
    }

    const tracks = normalRes.data || [];
    const aiTracks = aiRes.data || [];

    const trackIds = tracks.map(t => t.id);
    let likedTrackIds = new Set<string>();
    if (userId && trackIds.length) {
      const { data: likes } = await supabaseAdmin
        .from('track_likes')
        .select('track_id')
        .eq('user_id', userId)
        .in('track_id', trackIds);
      if (likes) likes.forEach((like: any) => likedTrackIds.add(like.track_id));
    }

    const formattedNormal = tracks.map(track => ({
      _id: track.id,
      title: track.title,
      artist: {
        _id: track.creator_id,
        username: track.profiles?.username,
        name: track.profiles?.name,
        avatar: track.profiles?.avatar,
        isArtist: track.profiles?.is_artist,
        artistName: track.profiles?.artist_name
      },
      duration: track.duration,
      coverUrl: track.cover_url,
      audioUrl: track.audio_url,
      album: track.album || null,
      genre: track.genre,
      lyrics: track.lyrics || null,
      likes: track.likes || [],
      plays: track.plays || 0,
      createdAt: track.created_at,
      isFeatured: track.is_featured,
      isVerified: track.profiles?.is_verified || false,
      isLiked: likedTrackIds.has(track.id),
      isAI: false,
    }));

    let aiProfiles = new Map<string, any>();
    const aiUserIds = Array.from(new Set(aiTracks.map((t: any) => t.generation?.user_id).filter(Boolean)));
    if (aiUserIds.length) {
      const { data: profiles } = await supabaseAdmin.from('profiles').select('id, username, name, avatar').in('id', aiUserIds);
      (profiles || []).forEach((p: any) => aiProfiles.set(p.id, p));
    }

    const formattedAI = aiTracks.map((t: any) => {
      const gen = t.generation;
      const profile = aiProfiles.get(gen?.user_id) || {};
      const meta = typeof gen?.metadata === 'object' && gen?.metadata ? gen.metadata : {};
      const hasSource = Boolean(meta.sourceTrackId || meta.source_track_id || meta.sourceAudioUrl);
      return {
        _id: `ai-${t.id}`,
        title: t.title || gen?.prompt?.slice(0, 40) || 'Musique IA',
        artist: {
          _id: gen?.user_id || 'ai',
          username: profile.username || 'synaura-ai',
          name: profile.name || 'Synaura IA',
          avatar: profile.avatar || '',
        },
        duration: t.duration || 120,
        coverUrl: t.image_url || '/default-cover.jpg',
        audioUrl: t.audio_url || '',
        album: null,
        genre: t.tags || [],
        lyrics: null,
        likes: [],
        plays: t.play_count || 0,
        createdAt: t.created_at,
        isFeatured: false,
        isVerified: false,
        isLiked: false,
        isAI: true,
        isRemix: hasSource,
      };
    });

    const combined = [...formattedNormal, ...formattedAI]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({ tracks: combined });

  } catch (error) {
    console.error('Erreur serveur recent tracks:', error);
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
