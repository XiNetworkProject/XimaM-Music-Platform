import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

    const { data: boosts, error: boostsErr } = await supabaseAdmin
      .from('active_track_boosts')
      .select('track_id, multiplier, expires_at, user_id, started_at')
      .gt('expires_at', new Date().toISOString())
      .order('multiplier', { ascending: false })
      .limit(limit);

    if (boostsErr || !boosts?.length) {
      return NextResponse.json({ tracks: [] });
    }

    const trackIds = Array.from(new Set(boosts.map(b => b.track_id)));

    const { data: tracks, error: tracksErr } = await supabaseAdmin
      .from('tracks')
      .select('id, title, genre, plays, created_at, duration, cover_url, audio_url, artist_id')
      .in('id', trackIds);

    if (tracksErr || !tracks?.length) {
      return NextResponse.json({ tracks: [] });
    }

    const artistIds = Array.from(new Set(tracks.map(t => t.artist_id).filter(Boolean)));
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username, name, avatar_url')
      .in('id', artistIds);

    const profileMap = new Map<string, any>();
    for (const p of (profiles || [])) profileMap.set(p.id, p);

    const boostMap = new Map<string, { multiplier: number; expires_at: string; started_at: string }>();
    for (const b of boosts) {
      const existing = boostMap.get(b.track_id);
      if (!existing || b.multiplier > existing.multiplier) {
        boostMap.set(b.track_id, { multiplier: b.multiplier, expires_at: b.expires_at, started_at: b.started_at });
      }
    }

    const result = tracks
      .map(t => {
        const boost = boostMap.get(t.id);
        const artist = profileMap.get(t.artist_id);
        return {
          id: t.id,
          _id: t.id,
          title: t.title,
          genre: t.genre,
          plays: t.plays || 0,
          duration: t.duration || 0,
          coverUrl: t.cover_url,
          audioUrl: t.audio_url,
          createdAt: t.created_at,
          artist: artist ? {
            id: artist.id,
            username: artist.username,
            name: artist.name,
            avatar: artist.avatar_url,
          } : null,
          isBoosted: true,
          boostMultiplier: Number(boost?.multiplier || 1),
          boostExpiresAt: boost?.expires_at || null,
          boostStartedAt: boost?.started_at || null,
        };
      })
      .sort((a, b) => b.boostMultiplier - a.boostMultiplier);

    return NextResponse.json({ tracks: result });
  } catch (err: any) {
    console.error('Erreur /api/tracks/boosted:', err);
    return NextResponse.json({ tracks: [], error: err?.message }, { status: 500 });
  }
}
