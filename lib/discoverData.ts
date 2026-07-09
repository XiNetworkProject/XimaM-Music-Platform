import { supabaseAdmin } from '@/lib/supabase';

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

function isMissingTableError(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('schema cache');
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

function increment(map: Map<string, number>, key: unknown, amount = 1) {
  const id = String(key || '');
  if (!id) return;
  map.set(id, (map.get(id) || 0) + amount);
}

async function optionalRows<T>(label: string, run: () => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  try {
    const { data, error } = await run();
    if (error) {
      if (!isMissingColumnError(error) && !isMissingTableError(error)) {
        console.warn(`radar: signal ${label} unavailable`, error.message || error);
      }
      return [];
    }
    return data || [];
  } catch (error: any) {
    console.warn(`radar: signal ${label} unavailable`, error?.message || error);
    return [];
  }
}

export function calculateRadarScore(input: RadarScoreInput): number {
  const plays = Math.max(0, Math.round(input.plays || 0));
  const likes = Math.max(0, Math.round(input.likes || 0));
  const saves = Math.max(0, Math.round(input.saves || 0));
  const comments = Math.max(0, Math.round(input.comments || 0));
  const reactions = Math.max(0, Math.round(input.reactions || 0));
  const completionRate = Math.max(0, Math.min(100, Number(input.completionRate || 0)));
  const ageDays = Math.max(0, Number(input.ageDays || 9999));

  const completionRateBonus =
    completionRate >= 70 ? 18 :
    completionRate >= 55 ? 12 :
    completionRate >= 40 ? 7 :
    0;

  const ratioBonus = Math.min(
    28,
    ratio(likes, plays) * 80 +
    ratio(saves, plays) * 95 +
    ratio(comments + reactions, plays) * 55,
  );

  const freshnessBonus =
    ageDays <= RADAR_NEW_THIS_WEEK_DAYS ? 14 :
    ageDays <= 30 ? 8 :
    ageDays <= RADAR_RECENT_DAYS ? 4 :
    0;

  const lowPlayBonus =
    plays < 50 ? 10 :
    plays < 200 ? 7 :
    plays < RADAR_LOW_PLAY_CEILING ? 3 :
    0;

  const progressionBonus = Math.min(
    20,
    Math.max(0, input.recentPlays || 0) * 0.6 +
    Math.max(0, input.recentLikes || 0) * 2 +
    Math.max(0, input.shares || 0) * 2,
  );

  return Math.round(
    likes * 2 +
    saves * 3 +
    comments * 2 +
    reactions +
    completionRateBonus +
    ratioBonus +
    freshnessBonus +
    lowPlayBonus +
    progressionBonus,
  );
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
 * Regles Radar V1 : morceaux publics reels (getPublicTrackPool filtre is_public
 * + audio valide), faible volume d'ecoutes et signaux qualite mesurables. Le
 * score reste volontairement simple et lisible :
 * likes x2 + saves x3 + comments x2 + reactions + completion_rate_bonus.
 * Les bonus de fraicheur, faible exposition et progression aident les nouveaux
 * sons sans transformer le Radar en page des morceaux deja populaires.
 */
export async function getRadarTracks(limit = 16): Promise<PublicTrackRow[]> {
  const pool = await getPublicTrackPool({ limit: 260, order: 'recent' });
  if (!pool.length) return [];

  const ids = pool.map((track) => track._id);
  const since30d = new Date(Date.now() - 30 * DAY_MS).toISOString();

  const [likesRows, commentsRows, savesRows, reactionsRows, statsRows, eventRows] = await Promise.all([
    optionalRows<any>('likes', () => supabaseAdmin.from('track_likes').select('track_id, created_at').in('track_id', ids).limit(10000)),
    optionalRows<any>('comments', () => supabaseAdmin.from('comments').select('track_id, created_at').in('track_id', ids).limit(10000)),
    optionalRows<any>('playlist_saves', () => supabaseAdmin.from('playlist_tracks').select('track_id, added_at').in('track_id', ids).limit(10000)),
    optionalRows<any>('moment_reactions', () => supabaseAdmin.from('track_moment_reactions').select('track_id, created_at').in('track_id', ids).limit(10000)),
    optionalRows<any>('rolling_stats', () => supabaseAdmin
      .from('track_stats_rolling_30d')
      .select('track_id, plays_30d, likes_30d, completes_30d, shares_30d, retention_complete_rate_30d')
      .in('track_id', ids)
      .limit(10000)),
    optionalRows<any>('events', () => supabaseAdmin
      .from('track_events')
      .select('track_id, event_type, created_at')
      .in('track_id', ids)
      .gte('created_at', since30d)
      .limit(10000)),
  ]);

  const likesMap = new Map<string, number>();
  const commentsMap = new Map<string, number>();
  const savesMap = new Map<string, number>();
  const reactionsMap = new Map<string, number>();
  const statsMap = new Map<string, any>();
  const eventsMap = new Map<string, { starts: number; completes: number; likes: number; shares: number }>();

  for (const row of likesRows) increment(likesMap, row.track_id);
  for (const row of commentsRows) increment(commentsMap, row.track_id);
  for (const row of savesRows) increment(savesMap, row.track_id);
  for (const row of reactionsRows) increment(reactionsMap, row.track_id);
  for (const row of statsRows) statsMap.set(String(row.track_id), row);
  for (const row of eventRows) {
    const id = String(row.track_id || '');
    if (!id) continue;
    const entry = eventsMap.get(id) || { starts: 0, completes: 0, likes: 0, shares: 0 };
    if (row.event_type === 'play_start') entry.starts += 1;
    if (row.event_type === 'play_complete') entry.completes += 1;
    if (row.event_type === 'like' || row.event_type === 'favorite') entry.likes += 1;
    if (row.event_type === 'share') entry.shares += 1;
    eventsMap.set(id, entry);
  }

  const artistLatestTrackAge = new Map<string, number>();
  for (const track of pool) {
    const artistId = track.artist._id || track._id;
    const age = daysSince(track.createdAt);
    artistLatestTrackAge.set(artistId, Math.min(artistLatestTrackAge.get(artistId) ?? 9999, age));
  }

  const scored = pool.map((track) => {
    const stats = statsMap.get(track._id) || {};
    const events = eventsMap.get(track._id) || { starts: 0, completes: 0, likes: 0, shares: 0 };
    const recentPlays = Number(stats.plays_30d || events.starts || 0);
    const completes = Number(stats.completes_30d || events.completes || 0);
    const completionRate = Number(stats.retention_complete_rate_30d || (recentPlays > 0 ? (completes / recentPlays) * 100 : 0));
    const likes = Math.max(countValue(track.likes), likesMap.get(track._id) || 0);
    const ageDays = daysSince(track.createdAt);
    const artistAge = artistLatestTrackAge.get(track.artist._id || track._id) ?? ageDays;
    return withRadarSignals(track, {
      plays: Number(track.plays || 0),
      likes,
      saves: savesMap.get(track._id) || 0,
      comments: commentsMap.get(track._id) || 0,
      reactions: reactionsMap.get(track._id) || 0,
      completionRate,
      ageDays: Math.min(ageDays, artistAge),
      recentPlays,
      recentLikes: Number(stats.likes_30d || events.likes || 0),
      shares: Number(stats.shares_30d || events.shares || 0),
    });
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
      track.radarScore >= 18;
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
