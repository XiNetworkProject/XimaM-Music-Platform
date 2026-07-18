import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getApiSession } from '@/lib/getApiSession';
import { applyPublicTrackFilter, canViewTrack } from '@/lib/publicTracks';
import { normalizeLegacyCollectionFromPlaylist } from '@/lib/editorialCollections';
import {
  rankRelatedTrackCandidates,
  type RelatedPlaylistMatch,
  type RelatedTrackCandidate,
} from '@/lib/relatedTracks';

export const dynamic = 'force-dynamic';

const TRACK_SELECT = `
  id, title, creator_id, created_at, cover_url, audio_url, duration, genre, album, plays, is_public,
  profiles:profiles!tracks_creator_id_fkey ( id, username, name, avatar, is_artist, artist_name, is_verified )
`;

function stringList(value: unknown) {
  if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackId = String(searchParams.get('trackId') || '').trim();
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 8), 20));
    if (!trackId) return NextResponse.json({ error: 'trackId requis' }, { status: 400 });

    const session = await getApiSession(request).catch(() => null);
    const userId = (session?.user as any)?.id || null;
    const [sourceResult, membershipResult] = await Promise.all([
      supabaseAdmin
        .from('tracks')
        .select('id, genre, creator_id, title, is_public, audio_url, album, created_at')
        .eq('id', trackId)
        .maybeSingle(),
      supabaseAdmin
        .from('playlist_tracks')
        .select('playlist_id, position')
        .eq('track_id', trackId)
        .limit(24),
    ]);
    const source = sourceResult.data;
    if (!source || !canViewTrack(source, userId)) {
      return NextResponse.json({ tracks: [], sourceTitle: '', contextLabel: '' });
    }

    const genres = stringList(source.genre);
    const memberships = membershipResult.data || [];
    const playlistIds = Array.from(new Set(memberships.map((row: any) => String(row.playlist_id || '')).filter(Boolean)));
    const sourcePositions = new Map(memberships.map((row: any) => [String(row.playlist_id), Number(row.position || 0)]));
    const playlistInfo = new Map<string, { id: string; title: string; kind: 'playlist' | 'collection' }>();

    if (playlistIds.length) {
      const [playlistsResult, collectionsResult] = await Promise.all([
        supabaseAdmin
          .from('playlists')
          .select('id, name, description, cover_url, creator_id, is_public, created_at, updated_at')
          .in('id', playlistIds),
        supabaseAdmin
          .from('editorial_collections')
          .select('playlist_id, title, is_published')
          .in('playlist_id', playlistIds),
      ]);
      const collections = new Map(
        (collectionsResult.data || [])
          .filter((row: any) => row.is_published === true)
          .map((row: any) => [String(row.playlist_id), String(row.title || 'Collection Synaura')]),
      );
      for (const playlist of playlistsResult.data || []) {
        if (playlist.is_public !== true && playlist.creator_id !== userId) continue;
        const legacyCollection = normalizeLegacyCollectionFromPlaylist(playlist);
        const collectionTitle = collections.get(String(playlist.id))
          || (legacyCollection?.isPublished ? legacyCollection.title : null);
        playlistInfo.set(String(playlist.id), {
          id: String(playlist.id),
          title: collectionTitle || String(playlist.name || 'Playlist'),
          kind: collectionTitle ? 'collection' : 'playlist',
        });
      }
    }

    const visiblePlaylistIds = Array.from(playlistInfo.keys());
    const playlistCandidatesPromise = visiblePlaylistIds.length
      ? supabaseAdmin
          .from('playlist_tracks')
          .select(`playlist_id, position, track_id, tracks!inner(${TRACK_SELECT})`)
          .in('playlist_id', visiblePlaylistIds)
          .limit(240)
      : Promise.resolve({ data: [] as any[], error: null });
    const genreCandidatesPromise = genres.length
      ? applyPublicTrackFilter(supabaseAdmin
          .from('tracks')
          .select(TRACK_SELECT)
          .neq('id', trackId)
          .overlaps('genre', genres))
          .order('created_at', { ascending: false })
          .limit(90)
      : Promise.resolve({ data: [] as any[], error: null });
    const albumCandidatesPromise = source.album
      ? applyPublicTrackFilter(supabaseAdmin
          .from('tracks')
          .select(TRACK_SELECT)
          .neq('id', trackId)
          .eq('album', source.album))
          .order('created_at', { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] as any[], error: null });
    const artistCandidatesPromise = source.creator_id
      ? applyPublicTrackFilter(supabaseAdmin
          .from('tracks')
          .select(TRACK_SELECT)
          .neq('id', trackId)
          .eq('creator_id', source.creator_id))
          .order('created_at', { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] as any[], error: null });

    const [playlistCandidates, genreCandidates, albumCandidates, artistCandidates] = await Promise.all([
      playlistCandidatesPromise,
      genreCandidatesPromise,
      albumCandidatesPromise,
      artistCandidatesPromise,
    ]);

    type CandidateValue = { track: any; playlistMatches: RelatedPlaylistMatch[] };
    const candidateMap = new Map<string, CandidateValue>();
    const addCandidate = (track: any, match?: RelatedPlaylistMatch) => {
      if (!track?.id || track.id === trackId || !canViewTrack(track, userId)) return;
      const current = candidateMap.get(String(track.id)) || { track, playlistMatches: [] };
      if (match && !current.playlistMatches.some((entry) => entry.id === match.id)) current.playlistMatches.push(match);
      candidateMap.set(String(track.id), current);
    };

    for (const row of playlistCandidates.data || []) {
      const playlist = playlistInfo.get(String(row.playlist_id));
      const track = one(row.tracks as any);
      if (!playlist || !track) continue;
      addCandidate(track, {
        ...playlist,
        positionDistance: Math.abs(Number(row.position || 0) - Number(sourcePositions.get(playlist.id) || 0)),
      });
    }
    for (const track of genreCandidates.data || []) addCandidate(track);
    for (const track of albumCandidates.data || []) addCandidate(track);
    for (const track of artistCandidates.data || []) addCandidate(track);

    const candidateInputs: RelatedTrackCandidate<any>[] = Array.from(candidateMap.values()).map(({ track, playlistMatches }) => ({
      track,
      id: String(track.id),
      artistId: String(track.creator_id || ''),
      genres: stringList(track.genre),
      album: track.album || null,
      plays: Number(track.plays || 0),
      createdAt: track.created_at || null,
      playlistMatches,
    }));
    const ranked = rankRelatedTrackCandidates({
      id: trackId,
      artistId: String(source.creator_id || ''),
      genres,
      album: source.album || null,
    }, candidateInputs, limit);

    let likedIds = new Set<string>();
    if (userId && ranked.length) {
      const { data: likes } = await supabaseAdmin
        .from('track_likes')
        .select('track_id')
        .eq('user_id', userId)
        .in('track_id', ranked.map((entry) => String(entry.track.id)));
      likedIds = new Set((likes || []).map((row: any) => String(row.track_id)));
    }

    const formatted = ranked.map(({ track, score, reasons }) => {
      const profile = one(track.profiles as any);
      return {
        _id: track.id,
        title: track.title,
        artist: {
          _id: track.creator_id,
          username: profile?.username,
          name: profile?.name,
          avatar: profile?.avatar,
          isArtist: profile?.is_artist,
          artistName: profile?.artist_name,
        },
        duration: Number(track.duration || 0),
        coverUrl: track.cover_url,
        audioUrl: track.audio_url,
        album: track.album || null,
        genre: stringList(track.genre),
        likes: [],
        plays: Number(track.plays || 0),
        createdAt: track.created_at,
        isFeatured: false,
        isVerified: Boolean(profile?.is_verified),
        isLiked: likedIds.has(String(track.id)),
        isAI: false,
        recommendationScore: score,
        recommendationReasons: reasons,
      };
    });

    return NextResponse.json({
      tracks: formatted,
      sourceTitle: source.title,
      contextLabel: ranked[0]?.reasons[0] || (genres[0] ? `Même ambiance · ${genres[0]}` : ''),
    });
  } catch (error) {
    console.error('Erreur /api/tracks/similar:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
