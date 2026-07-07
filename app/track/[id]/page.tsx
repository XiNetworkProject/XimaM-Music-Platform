import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TrackPageClient from './TrackPageClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getPublishedVariationCounts, getRemixAttributionForChildren, getRemixSourceSummary } from '@/lib/remixServer';
import { remixPermissionsFromRow } from '@/lib/remixPermissions';
import { getPublishedClipCounts } from '@/lib/musicClips';
import { canViewAiTrack, canViewTrack } from '@/lib/publicTracks';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://www.synaura.fr').replace(/\/$/, '');

async function getTrack(id: string) {
  const isAI = id.startsWith('ai-');
  const cleanId = isAI ? id.slice(3) : id;
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id || null;

  if (isAI) {
    const { data } = await supabase
      .from('ai_tracks')
      .select('*, generation:ai_generations!inner(id, user_id, prompt, metadata, is_public, status)')
      .eq('id', cleanId)
      .single();
    if (!data || !canViewAiTrack(data, userId)) return null;
    const source = await getRemixSourceSummary({ sourceTrackId: id, userId });
    const [attributions, counts] = await Promise.all([
      getRemixAttributionForChildren([{ id: cleanId, type: 'ai_track' }]),
      getPublishedVariationCounts([{ id: cleanId, type: 'ai_track' }]),
    ]);
    const clipCounts = await getPublishedClipCounts([{ id: cleanId, type: 'ai_track' }]);
    return {
      id: `ai-${data.id}`,
      title: data.title || 'Creation IA',
      artist: source?.artist || 'Artiste IA',
      artistUsername: source?.artistUsername || '',
      artistAvatar: null,
      creatorId: (data as any).generation?.user_id || null,
      coverUrl: data.image_url || null,
      audioUrl: data.audio_url,
      duration: data.duration || 0,
      genre: Array.isArray(data.tags) ? data.tags : (data.style ? [data.style] : []),
      plays: 0,
      likes: 0,
      createdAt: data.created_at,
      isAI: true,
      ...remixPermissionsFromRow(data),
      canRemixAiVariation: source?.canRemixAiVariation || false,
      remixAttribution: attributions.get(`ai_track:${cleanId}`) || null,
      variationsCount: counts.get(`ai_track:${cleanId}`) || 0,
      musicClipsCount: clipCounts.get(`ai_track:${cleanId}`) || 0,
    };
  }

  const { data: track } = await supabase
    .from('tracks')
    .select('*')
    .eq('id', id)
    .single();

  if (!track || !canViewTrack(track, userId)) return null;
  const source = await getRemixSourceSummary({ sourceTrackId: id, sourceTrackType: 'track', userId });
  const [attributions, counts] = await Promise.all([
    getRemixAttributionForChildren([{ id, type: 'track' }]),
    getPublishedVariationCounts([{ id, type: 'track' }]),
  ]);
  const clipCounts = await getPublishedClipCounts([{ id, type: 'track' }]);

  let artistProfile: any = null;
  if (track.creator_id) {
    const { data: p } = await supabase
      .from('profiles')
      .select('username, name, avatar')
      .eq('id', track.creator_id)
      .single();
    artistProfile = p;
  }

  return {
    id: track.id,
    title: track.title,
    artist: artistProfile?.name || track.artist_name || track.creator_name || 'Artiste inconnu',
    artistUsername: artistProfile?.username || '',
    artistAvatar: artistProfile?.avatar || null,
    creatorId: track.creator_id || null,
    coverUrl: track.cover_url,
    coverVideoUrl: track.cover_video_url || track.data?.cover_video_url || null,
    coverVideoPosterUrl: track.cover_video_poster_url || track.data?.cover_video_poster_url || null,
    audioUrl: track.audio_url,
    duration: track.duration || 0,
    genre: track.genre || [],
    plays: track.plays || 0,
    likes: track.likes || 0,
    createdAt: track.created_at,
    isAI: false,
    ...remixPermissionsFromRow(track),
    canRemixAiVariation: source?.canRemixAiVariation || false,
    remixAttribution: attributions.get(`track:${id}`) || null,
    variationsCount: counts.get(`track:${id}`) || 0,
    musicClipsCount: clipCounts.get(`track:${id}`) || 0,
  };
}
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const track = await getTrack(params.id);
  if (!track) {
    return { title: 'Track introuvable — Synaura' };
  }

  const title = `${track.title} — ${track.artist} | Synaura`;
  const description = `Écoute "${track.title}" par ${track.artist} sur Synaura.${track.genre?.length ? ` Genre : ${track.genre.join(', ')}.` : ''} Découvre, écoute et crée de la musique avec l'IA.`;
  const url = `${BASE_URL}/track/${track.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Synaura',
      type: 'music.song',
      ...(track.coverUrl ? { images: [{ url: track.coverUrl, width: 600, height: 600, alt: track.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(track.coverUrl ? { images: [track.coverUrl] } : {}),
    },
    alternates: { canonical: url },
  };
}

export default async function TrackPage({ params }: { params: { id: string } }) {
  const track = await getTrack(params.id);
  if (!track) notFound();

  const jsonLd = track ? {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: track.title,
    byArtist: { '@type': 'MusicGroup', name: track.artist },
    duration: track.duration ? `PT${Math.floor(track.duration / 60)}M${track.duration % 60}S` : undefined,
    genre: track.genre?.join(', ') || undefined,
    url: `${BASE_URL}/track/${track.id}`,
    ...(track.coverUrl ? { image: track.coverUrl } : {}),
    inAlbum: { '@type': 'MusicAlbum', name: 'Synaura' },
  } : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <TrackPageClient track={track} />
    </>
  );
}
