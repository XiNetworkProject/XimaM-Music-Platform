import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getApiSession } from '@/lib/getApiSession';
import { applyPublicTrackFilter } from '@/lib/publicTracks';

export const dynamic = 'force-dynamic';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const sort = searchParams.get('sort') || 'trending';
    const page = Math.max(0, Number(searchParams.get('page') || 0));
    const limit = clamp(Number(searchParams.get('limit') || 24), 6, 48);
    const profilePage = Math.max(0, Number(searchParams.get('profilePage') || page));
    const profileLimit = clamp(Number(searchParams.get('profileLimit') || 12), 4, 24);
    const from = page * limit;
    const profileFrom = profilePage * profileLimit;

    const session = await getApiSession(request).catch(() => null);
    const userId = String((session?.user as any)?.id || '');

    let tracksQuery = applyPublicTrackFilter(supabaseAdmin
      .from('tracks')
      .select(`
        id, title, creator_id, cover_url, audio_url, duration, plays, likes,
        is_featured, genre, created_at,
        profiles!tracks_creator_id_fkey (id, username, name, avatar, is_artist, artist_name)
      `, { count: 'exact' }));

    if (category !== 'all') tracksQuery = tracksQuery.contains('genre', [category]);
    if (sort === 'newest') tracksQuery = tracksQuery.order('created_at', { ascending: false });
    else if (sort === 'popular') tracksQuery = tracksQuery.order('likes', { ascending: false }).order('plays', { ascending: false });
    else if (sort === 'hidden') tracksQuery = tracksQuery.order('plays', { ascending: true }).order('likes', { ascending: false });
    else if (sort === 'featured') tracksQuery = tracksQuery.order('is_featured', { ascending: false }).order('plays', { ascending: false });
    else tracksQuery = tracksQuery.order('plays', { ascending: false }).order('created_at', { ascending: false });

    const [tracksResult, profilesResult] = await Promise.all([
      tracksQuery.range(from, from + limit - 1),
      supabaseAdmin
        .from('profiles')
        .select('id, username, name, avatar, bio, created_at', { count: 'exact' })
        .not('username', 'is', null)
        .order(sort === 'newest' ? 'created_at' : 'username', { ascending: sort !== 'newest' })
        .range(profileFrom, profileFrom + profileLimit - 1),
    ]);

    if (tracksResult.error) throw tracksResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const rows = tracksResult.data || [];
    const trackIds = rows.map((track: any) => track.id);
    let liked = new Set<string>();
    if (userId && trackIds.length) {
      const { data } = await supabaseAdmin.from('track_likes').select('track_id').eq('user_id', userId).in('track_id', trackIds);
      liked = new Set((data || []).map((entry: any) => String(entry.track_id)));
    }

    const tracks = rows.map((track: any) => ({
      _id: track.id,
      title: track.title,
      artist: {
        _id: track.creator_id,
        username: track.profiles?.username || '',
        name: track.profiles?.name || track.profiles?.artist_name || track.profiles?.username || 'Artiste Synaura',
        artistName: track.profiles?.artist_name || track.profiles?.name || track.profiles?.username || 'Artiste Synaura',
        avatar: track.profiles?.avatar || '',
      },
      coverUrl: track.cover_url,
      audioUrl: track.audio_url,
      duration: track.duration || 0,
      plays: track.plays || 0,
      likes: Array.isArray(track.likes) ? track.likes : [],
      likesCount: Array.isArray(track.likes) ? track.likes.length : Number(track.likes || 0),
      genre: track.genre || [],
      createdAt: track.created_at,
      isFeatured: Boolean(track.is_featured),
      isLiked: liked.has(track.id),
    }));

    const artists = (profilesResult.data || []).map((profile: any) => ({
      _id: profile.id,
      username: profile.username || '',
      name: profile.name || profile.username || 'Membre Synaura',
      avatar: profile.avatar || '',
      bio: profile.bio || '',
      createdAt: profile.created_at,
      isNew: Date.now() - new Date(profile.created_at || 0).getTime() < 14 * 86400000,
    }));

    const totalTracks = tracksResult.count || 0;
    const totalArtists = profilesResult.count || 0;
    return NextResponse.json({
      tracks,
      artists,
      page,
      nextPage: page + 1,
      hasMore: from + tracks.length < totalTracks,
      total: totalTracks,
      profilePage,
      nextProfilePage: profilePage + 1,
      hasMoreProfiles: profileFrom + artists.length < totalArtists,
      totalArtists,
      category,
      sort,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Discover API error:', error);
    return NextResponse.json({ error: error?.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
