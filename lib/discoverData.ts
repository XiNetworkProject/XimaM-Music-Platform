import { supabaseAdmin } from '@/lib/supabase';
import { computeTrackDiscoveryMetrics } from '@/lib/ranking';
import { loadGlobalTrackCandidates } from '@/lib/recommendation/candidates';

const DAY_MS = 24 * 60 * 60 * 1000;
const RADAR_LOW_PLAY_CEILING = 500;
const RADAR_RECENT_DAYS = 90;
const RADAR_NEW_THIS_WEEK_DAYS = 7;

// Pool de morceaux reels et publics, reutilise par les ambiances, le Radar et
// le jumelage artiste/morceau jouable de la page Decouvrir. Centralise le filtre
// is_public + audio valide pour eviter de le dupliquer partout.
export type PublicTrackRow = {
  _id: string;
  title: string;
  artist: { _id: string; username: string; name: string; artistName?: string; avatar: string };
  coverUrl: string | null;
  audioUrl: string;
  duration: number;
  plays: number;
  likes: any[];
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  reactionsCount: number;
  completionRate: number;
  radarScore: number;
  radarReasons: string[];
  radarSignalLabel: string;
  isRadar: boolean;
  isNewThisWeek: boolean;
  genre: string[];
  createdAt: string;
  data?: Record<string, any>;
  isAI: false;
};

export type RadarScoreInput = {
  plays: number;
  likes: number;
  saves: number;
  comments: number;
  reactions: number;
  completionRate: number;
  ageDays: number;
  recentPlays: number;
  recentLikes: number;
  shares: number;
};

function countValue(value: unknown) {
  if (Array.isArray(value)) return value.length;
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTrackRow(track: any): PublicTrackRow {
  const likesCount = countValue(track.likes);
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
    likesCount,
    commentsCount: 0,
    savesCount: 0,
    reactionsCount: 0,
    completionRate: 0,
    radarScore: 0,
    radarReasons: [],
    radarSignalLabel: 'Signal en observation',
    isRadar: false,
    isNewThisWeek: false,
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
  // retente sans elle plutot que de casser toute la page Decouvrir si elle manque.
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

function daysSince(value?: string | null) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  if (!Number.isFinite(time)) return 9999;
  return Math.max(0, (Date.now() - time) / DAY_MS);
}

function ratio(part: number, total: number) {
  return total > 0 ? part / total : part > 0 ? 1 : 0;
}

export function calculateRadarScore(input: RadarScoreInput): number {
  const plays = Math.max(0, Math.round(input.plays || 0));
  const likes = Math.max(0, Math.round(input.likes || 0));
  const saves = Math.max(0, Math.round(input.saves || 0));
  const comments = Math.max(0, Math.round(input.comments || 0));
  const reactions = Math.max(0, Math.round(input.reactions || 0));
  const completionRate = Math.max(0, Math.min(100, Number(input.completionRate || 0)));
  const ageDays = Math.max(0, Number(input.ageDays || 9999));

  const recentPlays = Math.max(0, Number(input.recentPlays || 0));
  const uniqueListeners = Math.min(Math.max(1, recentPlays), Math.max(1, plays));
  const momentumRaw = recentPlays * 0.28 + Math.max(0, input.recentLikes || 0) * 1.8 + Math.max(0, input.shares || 0) * 2.2;
  const metrics = computeTrackDiscoveryMetrics({
    plays_30d: recentPlays || plays,
    completes_30d: Math.round((completionRate / 100) * (recentPlays || plays)),
    likes_30d: likes,
    shares_30d: Math.max(0, input.shares || 0),
    favorites_30d: saves,
    listen_ms_30d: 0,
    unique_listeners_30d: uniqueListeners,
    retention_complete_rate_30d: completionRate,
    ageHours: ageDays * 24,
    momentumScore: 10 * momentumRaw / (momentumRaw + 9),
    comments30d: comments,
    reactions30d: reactions,
    playlistSaves30d: saves,
  });
  return Math.round(metrics.emergingScore * 10);
}

function radarReasons(input: RadarScoreInput): string[] {
  const reasons: string[] = [];
  const plays = Math.max(0, input.plays || 0);
  if (plays < 100) reasons.push('peu ecoute');
  else if (plays < RADAR_LOW_PLAY_CEILING) reasons.push('encore sous les radars');
  if (input.ageDays <= RADAR_NEW_THIS_WEEK_DAYS) reasons.push('nouveau cette semaine');
  else if (input.ageDays <= 30) reasons.push('sortie recente');
  if (ratio(input.likes, plays) >= 0.05 && input.likes > 0) reasons.push('bon ratio likes/ecoutes');
  if (ratio(input.saves, plays) >= 0.025 && input.saves > 0) reasons.push('sauvegardes fortes');
  if (input.comments > 0) reasons.push('commentaires actifs');
  if (input.reactions > 0) reasons.push('reactions waveform');
  if (input.completionRate >= 55) reasons.push('ecoutes completes');
  if (input.recentPlays >= 5 || input.recentLikes >= 2) reasons.push('progression rapide');
  return reasons.slice(0, 3);
}

function radarSignalLabel(input: RadarScoreInput, reasons: string[]) {
  if (input.ageDays <= RADAR_NEW_THIS_WEEK_DAYS) return 'Nouveau cette semaine';
  if (input.completionRate >= 55) return 'Bonne retention';
  if (ratio(input.likes, input.plays) >= 0.05 && input.likes > 0) return 'Fort ratio like';
  if (input.saves > 0) return 'Sauvegarde par les auditeurs';
  if (input.comments + input.reactions > 0) return 'Discussion active';
  return reasons[0] || 'Signal en observation';
}

function withRadarSignals(track: PublicTrackRow, input: RadarScoreInput): PublicTrackRow {
  const reasons = radarReasons(input);
  return {
    ...track,
    likesCount: input.likes,
    commentsCount: input.comments,
    savesCount: input.saves,
    reactionsCount: input.reactions,
    completionRate: Math.round(input.completionRate),
    radarScore: calculateRadarScore(input),
    radarReasons: reasons.length ? reasons : ['premiers signaux reels'],
    radarSignalLabel: radarSignalLabel(input, reasons),
    isRadar: true,
    isNewThisWeek: input.ageDays <= RADAR_NEW_THIS_WEEK_DAYS,
  };
}

/**
 * Le Radar reutilise exactement les signaux de Discovery V2. Les ratios sont
 * corriges par un prior statistique : un like sur une seule ecoute reste un bon
 * debut, mais ne peut plus battre artificiellement un signal confirme.
 */
export async function getRadarTracks(limit = 16): Promise<PublicTrackRow[]> {
  const candidates = (await loadGlobalTrackCandidates(false)).filter((track) => !track.isAI);
  if (!candidates.length) return [];
  const scored = candidates.map((candidate) => {
    const track = candidate as any;
    const metrics = candidate.discoveryMetrics!;
    const input: RadarScoreInput = {
      plays: Number(candidate.plays || 0),
      likes: Number(metrics.likes30d || track.likesCount || 0),
      saves: Number(metrics.saves30d || track.savesCount || 0),
      comments: Number(metrics.comments30d || track.commentsCount || 0),
      reactions: Number(metrics.reactions30d || track.reactionsCount || 0),
      completionRate: Number(metrics.completionRate30d || 0),
      ageDays: Number(metrics.ageHours || 0) / 24,
      recentPlays: Number(metrics.plays30d || 0),
      recentLikes: Number(metrics.likes30d || 0),
      shares: Number(metrics.shares30d || 0),
    };
    const base = {
      ...track,
      artist: {
        _id: String(candidate.artist?._id || ''),
        username: String(candidate.artist?.username || ''),
        name: String(candidate.artist?.name || candidate.artist?.artistName || candidate.artist?.username || 'Artiste Synaura'),
        artistName: candidate.artist?.artistName,
        avatar: String(candidate.artist?.avatar || ''),
      },
      coverUrl: candidate.coverUrl || null,
      audioUrl: String(candidate.audioUrl || ''),
      duration: Number(candidate.duration || 0),
      likes: [],
      genre: Array.isArray(candidate.genre) ? candidate.genre : candidate.genre ? [candidate.genre] : [],
      isAI: false as const,
    } as PublicTrackRow;
    return {
      ...withRadarSignals(base, input),
      radarScore: Math.round(metrics.emergingScore * 10),
    };
  });

  const eligible = scored.filter((track) => {
    const plays = Number(track.plays || 0);
    const isLowKnown = plays < RADAR_LOW_PLAY_CEILING;
    const isRecent = daysSince(track.createdAt) <= RADAR_RECENT_DAYS;
    const hasQualitySignal =
      ratio(track.likesCount, plays) >= 0.04 ||
      ratio(track.savesCount, plays) >= 0.02 ||
      track.commentsCount > 0 ||
      track.reactionsCount > 0 ||
      track.completionRate >= 45 ||
      track.radarScore >= 34;
    return isLowKnown && (isRecent || hasQualitySignal);
  });

  const ranked = (eligible.length ? eligible : scored.filter((track) => Number(track.plays || 0) < RADAR_LOW_PLAY_CEILING))
    .sort((a, b) => b.radarScore - a.radarScore || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime() || Number(a.plays || 0) - Number(b.plays || 0));

  const seenArtists = new Set<string>();
  const selected: PublicTrackRow[] = [];
  for (const track of ranked) {
    const artistKey = track.artist._id || track._id;
    if (seenArtists.has(artistKey)) continue;
    seenArtists.add(artistKey);
    selected.push(track);
    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    const seenTracks = new Set(selected.map((track) => track._id));
    for (const track of ranked) {
      if (seenTracks.has(track._id)) continue;
      selected.push(track);
      if (selected.length >= limit) break;
    }
  }

  return selected.slice(0, limit);
}
