import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 30);

    const session = await getServerSession(authOptions).catch(() => null);
    const userId = (session?.user as any)?.id || null;

    const since48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    // Count play events per track in the last 48h
    const { data: events48, error: e48 } = await supabaseAdmin
      .from('track_events')
      .select('track_id, created_at')
      .in('event_type', ['play_start', 'play_complete'])
      .gte('created_at', since48h)
      .eq('is_ai_track', false);

    if (e48 || !events48?.length) {
      return NextResponse.json({ tracks: [] });
    }

    // Split into 0-24h and 24-48h buckets
    const recent = new Map<string, number>();
    const older = new Map<string, number>();
    for (const ev of events48) {
      const map = ev.created_at >= since24h ? recent : older;
      map.set(ev.track_id, (map.get(ev.track_id) || 0) + 1);
    }

    // Velocity = recent / max(older, 1) — tracks with big growth ratio win
    const velocities: { trackId: string; velocity: number; recentPlays: number }[] = [];
    recent.forEach((rc, tid) => {
      const ol = older.get(tid) || 0;
      const velocity = rc / Math.max(ol, 1);
      if (rc >= 2) {
        velocities.push({ trackId: tid, velocity, recentPlays: rc });
      }
    });
    // Also include tracks that only appear in recent (brand new traction)
    velocities.sort((a, b) => b.velocity - a.velocity || b.recentPlays - a.recentPlays);
    const topIds = velocities.slice(0, limit).map(v => v.trackId);

    if (!topIds.length) {
      return NextResponse.json({ tracks: [] });
    }

    const velocityMap = new Map(velocities.map(v => [v.trackId, v]));

    const { data: tracks, error } = await supabaseAdmin
      .from('tracks')
      .select(`
        id, title, creator_id, created_at, cover_url, audio_url, duration, genre, plays,
        profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
      `)
      .in('id', topIds);

    if (error || !tracks?.length) {
      return NextResponse.json({ tracks: [] });
    }

    let likedIds = new Set<string>();
    if (userId && topIds.length) {
      const { data: likes } = await supabaseAdmin
        .from('track_likes')
        .select('track_id')
        .eq('user_id', userId)
        .in('track_id', topIds);
      if (likes) likes.forEach((l: any) => likedIds.add(l.track_id));
    }

    const formatted = tracks
      .map(t => {
        const v = velocityMap.get(t.id);
        const p = t.profiles as any;
        return {
          _id: t.id,
          title: t.title,
          artist: {
            _id: t.creator_id,
            username: p?.username,
            name: p?.name,
            avatar: p?.avatar,
            isArtist: p?.is_artist,
            artistName: p?.artist_name,
          },
          duration: t.duration || 0,
          coverUrl: t.cover_url,
          audioUrl: t.audio_url,
          genre: t.genre || [],
          likes: [],
          plays: t.plays || 0,
          createdAt: t.created_at,
          isFeatured: false,
          isVerified: p?.is_verified || false,
          isLiked: likedIds.has(t.id),
          isAI: false,
          velocity: v?.velocity || 0,
          recentPlays: v?.recentPlays || 0,
          growthPercent: v ? Math.round((v.velocity - 1) * 100) : 0,
        };
      })
      .sort((a, b) => b.velocity - a.velocity);

    return NextResponse.json({ tracks: formatted });
  } catch (error) {
    console.error('Erreur /api/tracks/rising:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
