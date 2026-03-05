import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import TrackPageClient from './TrackPageClient';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://www.synaura.fr').replace(/\/$/, '');

async function getTrack(id: string) {
  const isAI = id.startsWith('ai-');
  const cleanId = isAI ? id.slice(3) : id;

  if (isAI) {
    const { data } = await supabase
      .from('ai_generated_tracks')
      .select('id, title, audio_url, cover_url, duration, genre, style, prompt, created_at, generation_id')
      .eq('id', cleanId)
      .single();
    if (!data) return null;
    const { data: gen } = await supabase
      .from('ai_generations')
      .select('profiles!ai_generations_user_id_fkey(username, name, avatar)')
      .eq('id', data.generation_id)
      .single();
    const p = (gen as any)?.profiles;
    return {
      id: `ai-${data.id}`,
      title: data.title || 'Création IA',
      artist: p?.name || p?.username || 'Artiste IA',
      artistUsername: p?.username || '',
      artistAvatar: p?.avatar || null,
      coverUrl: data.cover_url || null,
      audioUrl: data.audio_url,
      duration: data.duration || 0,
      genre: data.genre ? [data.genre] : (data.style ? [data.style] : []),
      plays: 0,
      likes: 0,
      createdAt: data.created_at,
      isAI: true,
    };
  }

  const { data: track } = await supabase
    .from('tracks')
    .select('*')
    .eq('id', id)
    .single();

  if (!track) return null;

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
    coverUrl: track.cover_url,
    audioUrl: track.audio_url,
    duration: track.duration || 0,
    genre: track.genre || [],
    plays: track.plays || 0,
    likes: track.likes || 0,
    createdAt: track.created_at,
    isAI: false,
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
