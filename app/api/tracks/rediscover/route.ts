import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    if (!userId) {
      return NextResponse.json({ tracks: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20);
    const minPlays = parseInt(searchParams.get('minPlays') || '3');
    const minDaysAgo = parseInt(searchParams.get('minDaysAgo') || '14');

    const cutoff = new Date(Date.now() - minDaysAgo * 24 * 3600 * 1000).toISOString();

    // Find tracks user completed at least `minPlays` times, last played before cutoff
    const { data: events, error } = await supabaseAdmin
      .from('track_events')
      .select('track_id, created_at')
      .eq('user_id', userId)
      .eq('event_type', 'play_complete')
      .eq('is_ai_track', false);

    if (error || !events?.length) {
      return NextResponse.json({ tracks: [] });
    }

    // Group by track_id: count completions and find last play date
    const trackStats = new Map<string, { count: number; lastPlayed: string }>();
    for (const ev of events) {
      const existing = trackStats.get(ev.track_id);
      if (!existing) {
        trackStats.set(ev.track_id, { count: 1, lastPlayed: ev.created_at });
      } else {
        existing.count++;
        if (ev.created_at > existing.lastPlayed) existing.lastPlayed = ev.created_at;
      }
    }

    // Filter: enough completions AND not played recently
    const candidates = Array.from(trackStats.entries())
      .filter(([, stats]) => stats.count >= minPlays && stats.lastPlayed < cutoff)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([id]) => id);

    if (!candidates.length) {
      return NextResponse.json({ tracks: [] });
    }

    const { data: tracks } = await supabaseAdmin
      .from('tracks')
      .select(`
        id, title, creator_id, created_at, cover_url, audio_url, duration, genre, plays,
        profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
      `)
      .in('id', candidates);

    if (!tracks?.length) {
      return NextResponse.json({ tracks: [] });
    }

    let likedIds = new Set<string>();
    const ids = tracks.map(t => t.id);
    const { data: likes } = await supabaseAdmin
      .from('track_likes')
      .select('track_id')
      .eq('user_id', userId)
      .in('track_id', ids);
    if (likes) likes.forEach((l: any) => likedIds.add(l.track_id));

    // Preserve the order from candidates (most completed first)
    const trackMap = new Map(tracks.map(t => [t.id, t]));
    const formatted = candidates
      .map(id => trackMap.get(id))
      .filter(Boolean)
      .map((t: any) => ({
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
        completions: trackStats.get(t.id)?.count || 0,
      }));

    return NextResponse.json({ tracks: formatted });
  } catch (error) {
    console.error('Erreur /api/tracks/rediscover:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
