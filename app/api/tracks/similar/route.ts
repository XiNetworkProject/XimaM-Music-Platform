import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('trackId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20);

    if (!trackId) {
      return NextResponse.json({ error: 'trackId requis' }, { status: 400 });
    }

    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    // Get the source track's genres
    const { data: source } = await supabaseAdmin
      .from('tracks')
      .select('id, genre, creator_id, title')
      .eq('id', trackId)
      .single();

    if (!source) {
      return NextResponse.json({ tracks: [], sourceTitle: '' });
    }

    const genres: string[] = Array.isArray(source.genre) ? source.genre : source.genre ? [source.genre] : [];

    let similarTracks: any[] = [];

    if (genres.length > 0) {
      // Find tracks sharing at least one genre, ordered by plays
      const { data } = await supabaseAdmin
        .from('tracks')
        .select(`
          id, title, creator_id, created_at, cover_url, audio_url, duration, genre, plays,
          profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
        `)
        .neq('id', trackId)
        .overlaps('genre', genres)
        .order('plays', { ascending: false })
        .limit(limit + 10);

      similarTracks = data || [];
    }

    // If not enough results, fill with same-artist tracks
    if (similarTracks.length < limit) {
      const existingIds = new Set(similarTracks.map(t => t.id));
      existingIds.add(trackId);
      const { data: artistTracks } = await supabaseAdmin
        .from('tracks')
        .select(`
          id, title, creator_id, created_at, cover_url, audio_url, duration, genre, plays,
          profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
        `)
        .eq('creator_id', source.creator_id)
        .not('id', 'in', `(${Array.from(existingIds).join(',')})`)
        .order('plays', { ascending: false })
        .limit(limit - similarTracks.length);

      if (artistTracks) {
        similarTracks.push(...artistTracks);
      }
    }

    // Deduplicate and limit
    const seen = new Set<string>();
    seen.add(trackId);
    similarTracks = similarTracks.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    }).slice(0, limit);

    let likedIds = new Set<string>();
    if (userId && similarTracks.length) {
      const ids = similarTracks.map((t: any) => t.id);
      const { data: likes } = await supabaseAdmin
        .from('track_likes')
        .select('track_id')
        .eq('user_id', userId)
        .in('track_id', ids);
      if (likes) likes.forEach((l: any) => likedIds.add(l.track_id));
    }

    const formatted = similarTracks.map((t: any) => ({
      _id: t.id,
      title: t.title,
      artist: {
        _id: t.creator_id,
        username: t.profiles?.username,
        name: t.profiles?.name,
        avatar: t.profiles?.avatar,
        isArtist: t.profiles?.is_artist,
        artistName: t.profiles?.artist_name,
      },
      duration: t.duration || 0,
      coverUrl: t.cover_url,
      audioUrl: t.audio_url,
      genre: t.genre || [],
      likes: [],
      plays: t.plays || 0,
      createdAt: t.created_at,
      isFeatured: false,
      isVerified: t.profiles?.is_verified || false,
      isLiked: likedIds.has(t.id),
      isAI: false,
    }));

    return NextResponse.json({ tracks: formatted, sourceTitle: source.title });
  } catch (error) {
    console.error('Erreur /api/tracks/similar:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
