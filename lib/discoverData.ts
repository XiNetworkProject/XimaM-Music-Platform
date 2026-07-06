import { supabaseAdmin } from '@/lib/supabase';

// Pool de morceaux réels et publics, réutilisé par les ambiances, le Radar et le
// jumelage artiste/morceau jouable de la page Découvrir. Centralise le filtre
// is_public + audio valide pour éviter de le dupliquer (et de l'oublier) partout.
export type PublicTrackRow = {
  _id: string;
  title: string;
  artist: { _id: string; username: string; name: string; artistName?: string; avatar: string };
  coverUrl: string | null;
  audioUrl: string;
  duration: number;
  plays: number;
  likes: any[];
  genre: string[];
  createdAt: string;
  data?: Record<string, any>;
  isAI: false;
};

function normalizeTrackRow(track: any): PublicTrackRow {
  return {
    _id: track.id,
    title: track.title,
    artist: {
      _id: track.creator_id,
      username: track.profiles?.username || '',
      name: track.profiles?.name || track.profiles?.artist_name || track.profiles?.username || 'Artiste Synaura',
      artistName: track.profiles?.artist_name || track.profiles?.name,
      avatar: track.profiles?.avatar || '',
    },
    coverUrl: track.cover_url,
    audioUrl: track.audio_url,
    duration: track.duration || 0,
    plays: track.plays || 0,
    likes: Array.isArray(track.likes) ? track.likes : [],
    genre: track.genre || [],
    createdAt: track.created_at,
    data: track.data && typeof track.data === 'object' && !Array.isArray(track.data) ? track.data : undefined,
    isAI: false,
  };
}

function isMissingColumnError(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42703' || message.includes('does not exist') || message.includes('column');
}

export async function getPublicTrackPool(input: { limit?: number; order?: 'plays_desc' | 'plays_asc' | 'recent' } = {}): Promise<PublicTrackRow[]> {
  const limit = input.limit || 300;
  const buildQuery = (withData: boolean) => {
    let query = supabaseAdmin
      .from('tracks')
      .select(`
        id, title, creator_id, cover_url, audio_url, duration, plays, likes, genre, created_at${withData ? ', data' : ''},
        profiles!tracks_creator_id_fkey (id, username, name, avatar, artist_name)
      `)
      .eq('is_public', true)
      .not('audio_url', 'is', null);

    if (input.order === 'plays_asc') query = query.order('plays', { ascending: true }).order('created_at', { ascending: false });
    else if (input.order === 'recent') query = query.order('created_at', { ascending: false });
    else query = query.order('plays', { ascending: false }).order('created_at', { ascending: false });

    return query.limit(limit);
  };

  // La colonne `data` (tags/mood JSON) est optionnelle selon l'environnement : on
  // retente sans elle plutôt que de casser toute la page Découvrir si elle manque.
  let { data, error } = await buildQuery(true);
  if (error && isMissingColumnError(error)) {
    ({ data, error } = await buildQuery(false));
  }
  if (error) throw error;
  return (data || []).filter((track: any) => track.audio_url).map(normalizeTrackRow);
}

export async function attachLikedFlag<T extends { _id: string }>(tracks: T[], userId: string | null | undefined): Promise<Array<T & { isLiked: boolean }>> {
  if (!userId || !tracks.length) return tracks.map((track) => ({ ...track, isLiked: false }));
  const ids = tracks.map((track) => track._id).filter((id) => !id.startsWith('ai-'));
  if (!ids.length) return tracks.map((track) => ({ ...track, isLiked: false }));
  const { data } = await supabaseAdmin.from('track_likes').select('track_id').eq('user_id', userId).in('track_id', ids);
  const liked = new Set((data || []).map((row: any) => row.track_id));
  return tracks.map((track) => ({ ...track, isLiked: liked.has(track._id) }));
}

/**
 * Règles Radar : morceaux publics réels (getPublicTrackPool filtre is_public + audio
 * valide), triés par le moins écouté en premier, jamais deux morceaux du même
 * artiste, aucun seuil fictif — si le catalogue est petit, on renvoie ce qui existe.
 */
export async function getRadarTracks(limit = 16): Promise<PublicTrackRow[]> {
  const pool = await getPublicTrackPool({ limit: 200, order: 'plays_asc' });
  const seenArtists = new Set<string>();
  const selected: PublicTrackRow[] = [];
  for (const track of pool) {
    const artistKey = track.artist._id || track._id;
    if (seenArtists.has(artistKey)) continue;
    seenArtists.add(artistKey);
    selected.push(track);
    if (selected.length >= limit) break;
  }
  return selected;
}
