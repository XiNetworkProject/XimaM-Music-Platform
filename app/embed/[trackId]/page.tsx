import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import EmbedPlayerClient from './EmbedPlayerClient';

interface Props {
  params: { trackId: string };
}

async function getTrack(trackId: string) {
  const isAI = trackId.startsWith('ai-');
  const realId = isAI ? trackId.slice(3) : trackId;

  if (isAI) {
    const { data } = await supabaseAdmin
      .from('ai_generated_tracks')
      .select('id, title, audio_url, image_url, duration, prompt, ai_generations(prompt, style)')
      .eq('id', realId)
      .single();
    if (!data) return null;
    const gen = (data as any).ai_generations;
    return {
      id: `ai-${data.id}`,
      title: data.title || gen?.prompt?.slice(0, 40) || 'Titre IA',
      artist: 'Synaura AI',
      coverUrl: data.image_url || null,
      audioUrl: data.audio_url,
      duration: data.duration || 0,
      isAI: true,
    };
  }

  const { data } = await supabaseAdmin
    .from('tracks')
    .select('id, title, audio_url, cover_url, duration, profiles!tracks_user_id_fkey(username, name, artist_name)')
    .eq('id', realId)
    .single();

  if (!data) return null;
  const p = (data as any).profiles;
  return {
    id: data.id,
    title: data.title || 'Sans titre',
    artist: p?.artist_name || p?.name || p?.username || 'Artiste',
    coverUrl: data.cover_url || null,
    audioUrl: data.audio_url,
    duration: data.duration || 0,
    isAI: false,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const track = await getTrack(params.trackId);
  return {
    title: track ? `${track.title} - ${track.artist} | Synaura` : 'Synaura',
    description: track ? `Ecoute "${track.title}" par ${track.artist} sur Synaura` : 'Synaura - Plateforme musicale',
  };
}

export default async function EmbedPage({ params }: Props) {
  const track = await getTrack(params.trackId);

  if (!track) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b14', color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
        Track introuvable
      </div>
    );
  }

  return <EmbedPlayerClient track={track} />;
}
