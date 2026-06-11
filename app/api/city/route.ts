import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import {
  getArtistLevel,
  getPulseState,
  stableNumber,
  type CityArtist,
  type CityAward,
  type CityBadge,
  type CityEvent,
  type CityEventParticipation,
  type CityEventReward,
  type CityEventWinner,
  type CityPulseTrack,
  type CityShowcaseItem,
  type CityTrack,
  type SynauraCityData,
} from '@/lib/synauraCity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHALLENGES = [
  ['EDM neon', '#NeonChallenge', 'Une nuit electrique, un drop lumineux, une melodie qui reste.'],
  ['Son triste mais dansant', '#SadDance', 'Fais danser une emotion qui devrait normalement faire pleurer.'],
  ['Boss final', '#BossFinal', 'Compose le morceau qui accompagne le dernier combat.'],
  ['Remix drole', '#RemixWTF', 'Prends une idee improbable et rends-la beaucoup trop efficace.'],
  ['Ambiance Disney dark', '#DarkFairytale', 'Un conte enchante qui cache quelque chose de plus sombre.'],
  ['Shatta francais', '#ShattaFR', 'Rythme solaire, refrain immediat et identite francophone.'],
  ['Summer drop', '#SummerDrop', 'Le son qui doit accompagner les meilleurs souvenirs de l ete.'],
] as const;

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isoWeekKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function countValue(value: unknown) {
  if (Array.isArray(value)) return value.length;
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asArray(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function profileFromRelation(value: any) {
  return Array.isArray(value) ? value[0] || {} : value || {};
}

function normalTrack(raw: any): CityTrack | null {
  if (!raw?.id || !raw?.audio_url) return null;
  const profile = profileFromRelation(raw.profiles);
  return {
    _id: String(raw.id),
    title: String(raw.title || 'Sans titre'),
    artist: {
      _id: String(raw.creator_id || profile.id || ''),
      username: String(profile.username || ''),
      name: String(profile.name || profile.artist_name || profile.username || 'Artiste Synaura'),
      artistName: String(profile.artist_name || profile.name || profile.username || 'Artiste Synaura'),
      avatar: profile.avatar || null,
    },
    audioUrl: String(raw.audio_url),
    coverUrl: raw.cover_url || null,
    coverVideoUrl: raw.cover_video_url || raw?.data?.coverVideoUrl || null,
    coverVideoPosterUrl: raw.cover_video_poster_url || raw.cover_url || null,
    duration: Number(raw.duration || 0),
    genre: asArray(raw.genre),
    tags: asArray(raw.tags),
    plays: Number(raw.plays || 0),
    likesCount: countValue(raw.likes),
    createdAt: raw.created_at,
    isAI: false,
    isFeatured: Boolean(raw.is_featured),
  };
}

function aiTrack(raw: any, profile: any): CityTrack | null {
  if (!raw?.id || !raw?.audio_url) return null;
  return {
    _id: `ai-${raw.id}`,
    title: String(raw.title || 'Creation IA'),
    artist: {
      _id: String(raw?.generation?.user_id || profile?.id || ''),
      username: String(profile?.username || ''),
      name: String(profile?.name || profile?.username || 'Artiste IA'),
      artistName: String(profile?.name || profile?.username || 'Artiste IA'),
      avatar: profile?.avatar || null,
    },
    audioUrl: String(raw.audio_url),
    coverUrl: raw.image_url || null,
    coverVideoPosterUrl: raw.image_url || null,
    duration: Number(raw.duration || 0),
    genre: asArray(raw.tags),
    tags: asArray(raw.tags),
    plays: Number(raw.play_count || 0),
    likesCount: 0,
    createdAt: raw.created_at,
    isAI: true,
    isFeatured: false,
  };
}

function rotate<T>(items: T[], seed: string) {
  if (!items.length) return items;
  const offset = stableNumber(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function uniqueTracks<T extends CityTrack>(tracks: T[]) {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    if (!track?._id || seen.has(track._id)) return false;
    seen.add(track._id);
    return true;
  });
}

function pulseReasons(stats: any, comments: number, followers: number) {
  const reasons: string[] = [];
  const plays = Number(stats?.plays_30d || 0);
  const completes = Number(stats?.completes_30d || 0);
  const likes = Number(stats?.likes_30d || 0);
  const shares = Number(stats?.shares_30d || 0);
  const retention = Number(stats?.retention_complete_rate_30d || 0);
  if (plays >= 10) reasons.push('ecoutes recentes');
  if (likes >= 3) reasons.push('likes qui accelerent');
  if (comments >= 2) reasons.push('discussion active');
  if (shares >= 2) reasons.push('partages en hausse');
  if (retention >= 55 || (plays > 0 && completes / plays >= 0.55)) reasons.push("ecoute jusqu'au bout");
  if (followers > 0) reasons.push('nouveaux fans');
  return reasons.length ? reasons.slice(0, 3) : ['fraicheur Synaura'];
}

function toPulse(track: CityTrack, stats: any, comments = 0, followers = 0): CityPulseTrack {
  const recentPlays = Number(stats?.plays_30d || 0);
  const completes = Number(stats?.completes_30d || 0);
  const recentLikes = Number(stats?.likes_30d || 0);
  const shares = Number(stats?.shares_30d || 0);
  const retention = Number(stats?.retention_complete_rate_30d || (recentPlays ? (completes / recentPlays) * 100 : 0));
  const raw =
    recentPlays * 1.1 +
    completes * 2.3 +
    recentLikes * 5.2 +
    shares * 7.5 +
    comments * 6 +
    followers * 9 +
    retention * 0.34 +
    Math.log10(Number(track.plays || 0) + 1) * 7;
  const pulse = Math.max(18, Math.min(99, Math.round(22 + Math.log10(raw + 1) * 24)));
  return {
    ...track,
    commentsCount: comments,
    sharesCount: shares,
    pulse,
    pulseState: getPulseState(pulse),
    pulseReasons: pulseReasons(stats, comments, followers),
    recentPlays,
    recentLikes,
    recentComments: comments,
    retention: Math.round(retention),
  };
}

function nextFriday() {
  const now = new Date();
  const result = new Date(now);
  const days = (5 - now.getDay() + 7) % 7;
  result.setDate(now.getDate() + days);
  result.setHours(18, 0, 0, 0);
  if (result.getTime() <= now.getTime()) result.setDate(result.getDate() + 7);
  return result;
}

function seasonalEvent(month: number): Pick<CityEvent, 'title' | 'subtitle' | 'description' | 'icon' | 'accent' | 'theme'> {
  if (month === 9) return { title: 'Halloween Sound Night', subtitle: 'Saison speciale', description: 'Des sons sombres, etranges et beaucoup trop addictifs.', icon: 'moon', accent: '#FF7A00', theme: 'halloween' };
  if (month === 11) return { title: 'Christmas Remix', subtitle: 'Saison speciale', description: 'Reinvente les melodies de fin d annee a ta facon.', icon: 'gift', accent: '#E11D48', theme: 'christmas' };
  if (month === 0) return { title: 'New Year Anthem', subtitle: 'Saison speciale', description: 'Le premier grand refrain de la nouvelle annee.', icon: 'sparkles', accent: '#7C5CFF', theme: 'new-year' };
  if (month === 1) return { title: 'Saint-Valentin Songs', subtitle: 'Saison speciale', description: 'Des chansons d amour, de rupture et de seconde chance.', icon: 'heart', accent: '#FF4B7A', theme: 'valentine' };
  if (month >= 5 && month <= 7) return { title: 'Synaura Summer Drop', subtitle: 'Saison speciale', description: 'La bande-son de l ete se construit maintenant.', icon: 'sunny', accent: '#00A7B2', theme: 'summer' };
  return { title: 'Synaura Neon Week', subtitle: 'Saison speciale', description: 'Une semaine pour construire le futur sonore de Synaura.', icon: 'flash', accent: '#7C5CFF', theme: 'neon' };
}

function cityEventStatus(event: CityEvent, now = new Date()): NonNullable<CityEvent['status']> {
  const start = event.startsAt ? new Date(event.startsAt).getTime() : Number.NaN;
  const end = event.endsAt ? new Date(event.endsAt).getTime() : Number.NaN;
  const time = now.getTime();
  if (Number.isFinite(end) && time > end) return 'ended';
  if (Number.isFinite(start) && time < start) return 'scheduled';
  return 'live';
}

function cityEventReward(event: CityEvent): CityEventReward {
  if (event.kind === 'battle') {
    return {
      key: 'battle-jury',
      title: 'Jure Synaura',
      description: 'Vote dans la battle et debloque ton badge de juré.',
      kind: 'badge',
    };
  }
  if (event.kind === 'challenge') {
    return {
      key: 'challenge-drop',
      title: 'Participant City Challenge',
      description: 'Soumets un son au theme de la semaine.',
      kind: 'badge',
    };
  }
  if (event.kind === 'friday_drop') {
    return {
      key: 'friday-drop',
      title: 'Friday Dropper',
      description: 'Entre dans les sorties officielles du vendredi.',
      kind: 'showcase',
    };
  }
  return {
    key: 'seasonal-spark',
    title: 'Saison Synaura',
    description: 'Participe a l event saisonnier de la ville.',
    kind: 'badge',
  };
}

function decorateCityEvent(event: CityEvent, now = new Date()): CityEvent {
  const status = event.status || cityEventStatus(event, now);
  const totalVotes = Object.values(event.voteCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const live = status === 'live';
  const ended = status === 'ended' || status === 'resolved' || status === 'archived';
  const detailCta = event.kind === 'battle'
    ? { label: event.selectedTrackId ? 'Vote enregistre' : 'Voter', action: 'vote' as const }
    : event.claimStatus === 'available'
      ? { label: 'Reclamer', action: 'claim' as const }
      : event.userParticipation
        ? { label: 'Participation envoyee', action: 'open' as const }
        : { label: 'Participer', action: 'participate' as const, href: event.kind === 'challenge' ? `/community?tag=${encodeURIComponent(event.challengeTag || '')}` : '/upload' };

  return {
    ...event,
    status,
    isLive: live,
    isEnded: ended,
    totalVotes,
    participationCount: event.participationCount || 0,
    canParticipate: event.canParticipate ?? (!ended && event.kind !== 'battle'),
    reward: event.reward || cityEventReward(event),
    claimStatus: event.claimStatus || 'none',
    detailCta,
  };
}

function cityTableMissing(error: any) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('schema cache');
}

async function hydratePersistedEvents(
  baseEvents: CityEvent[],
  allPulse: CityPulseTrack[],
  userId: string | null,
  dayKey: string,
  weekKey: string,
  now = new Date(),
) {
  const trackMap = new Map(allPulse.map((track) => [track._id, track]));
  const decorated = baseEvents.map((event) => decorateCityEvent(event, now));
  const eventRows = decorated.map((event) => ({
    id: event.id,
    kind: event.kind,
    title: event.title,
    subtitle: event.subtitle,
    description: event.description,
    icon: event.icon,
    accent: event.accent,
    week_key: weekKey,
    day_key: dayKey,
    status: event.status,
    starts_at: event.startsAt || null,
    ends_at: event.endsAt || null,
    challenge_tag: event.challengeTag || null,
    theme: event.theme || null,
    config: event.config || { generated: true },
    reward: event.reward || cityEventReward(event),
  }));

  const { error: upsertEventsError } = await supabaseAdmin
    .from('city_events')
    .upsert(eventRows, { onConflict: 'id' });
  if (upsertEventsError) throw upsertEventsError;

  const eventTrackRows = decorated.flatMap((event) => (event.tracks || []).map((track, slot) => ({
    event_id: event.id,
    track_id: track._id,
    slot,
    source: 'algorithmic',
    score: 'pulse' in track ? track.pulse : null,
    metadata: { title: track.title },
  })));
  if (eventTrackRows.length) {
    const { error } = await supabaseAdmin
      .from('city_event_tracks')
      .upsert(eventTrackRows, { onConflict: 'event_id,track_id' });
    if (error) throw error;
  }

  const ids = decorated.map((event) => event.id);
  const [eventsRes, tracksRes, votesRes, participationsRes, winnersRes, rewardsRes] = await Promise.all([
    supabaseAdmin.from('city_events').select('*').in('id', ids),
    supabaseAdmin.from('city_event_tracks').select('*').in('event_id', ids).order('slot', { ascending: true }),
    supabaseAdmin.from('city_event_votes').select('event_id, track_id, user_id, created_at').in('event_id', ids),
    supabaseAdmin.from('city_event_participations').select('*').in('event_id', ids).order('created_at', { ascending: false }),
    supabaseAdmin.from('city_event_winners').select('*').in('event_id', ids).order('rank', { ascending: true }),
    userId ? supabaseAdmin.from('city_user_rewards').select('*').eq('user_id', userId).in('event_id', ids) : Promise.resolve({ data: [] } as any),
  ]);

  for (const result of [eventsRes, tracksRes, votesRes, participationsRes, winnersRes, rewardsRes]) {
    if ((result as any).error) throw (result as any).error;
  }

  const eventById = new Map((eventsRes.data || []).map((row: any) => [String(row.id), row]));
  const tracksByEvent = new Map<string, CityPulseTrack[]>();
  for (const row of tracksRes.data || []) {
    const track = trackMap.get(String(row.track_id));
    if (!track) continue;
    tracksByEvent.set(String(row.event_id), [...(tracksByEvent.get(String(row.event_id)) || []), track]);
  }

  const votesByEvent = new Map<string, Record<string, number>>();
  const selectedByEvent = new Map<string, string>();
  for (const row of votesRes.data || []) {
    const eventId = String(row.event_id);
    const trackId = String(row.track_id);
    const counts = votesByEvent.get(eventId) || {};
    counts[trackId] = (counts[trackId] || 0) + 1;
    votesByEvent.set(eventId, counts);
    if (userId && String(row.user_id) === userId) selectedByEvent.set(eventId, trackId);
  }

  const participationByEvent = new Map<string, any[]>();
  const userParticipationByEvent = new Map<string, any>();
  for (const row of participationsRes.data || []) {
    const eventId = String(row.event_id);
    participationByEvent.set(eventId, [...(participationByEvent.get(eventId) || []), row]);
    if (userId && String(row.user_id) === userId && !userParticipationByEvent.has(eventId)) {
      userParticipationByEvent.set(eventId, row);
    }
  }

  const winnersByEvent = new Map<string, CityEventWinner[]>();
  for (const row of winnersRes.data || []) {
    const winner: CityEventWinner = {
      id: String(row.id),
      eventId: String(row.event_id),
      trackId: String(row.track_id),
      userId: row.user_id || null,
      rank: Number(row.rank || 1),
      reason: row.reason || null,
      showcaseUntil: row.showcase_until || null,
      track: trackMap.get(String(row.track_id)) || null,
    };
    winnersByEvent.set(winner.eventId, [...(winnersByEvent.get(winner.eventId) || []), winner]);
  }

  const rewardsByEvent = new Map<string, any>();
  for (const row of rewardsRes.data || []) rewardsByEvent.set(String(row.event_id), row);

  const resolvedEvents = await Promise.all(decorated.map(async (event) => {
    const row = eventById.get(event.id);
    const eventTracks = tracksByEvent.get(event.id) || event.tracks || [];
    const voteCounts = votesByEvent.get(event.id) || Object.fromEntries(eventTracks.map((track) => [track._id, 0]));
    const winners = winnersByEvent.get(event.id) || [];
    let winnerTrackId = winners[0]?.trackId || null;

    if (!winnerTrackId && (row?.status === 'ended' || row?.status === 'resolved')) {
      const bestTrack = event.kind === 'battle'
        ? [...eventTracks].sort((a, b) => Number(voteCounts[b._id] || 0) - Number(voteCounts[a._id] || 0))[0]
        : [...eventTracks].sort((a, b) => b.pulse - a.pulse)[0];
      if (bestTrack) {
        const { data: inserted } = await supabaseAdmin
          .from('city_event_winners')
          .upsert({
            event_id: event.id,
            track_id: bestTrack._id,
            user_id: bestTrack.artist?._id || null,
            rank: 1,
            reason: event.kind === 'battle' ? 'Vote de la communaute' : 'Meilleur signal Pulse',
            showcase_until: new Date(now.getTime() + DAY_MS).toISOString(),
            metadata: { autoResolved: true },
          }, { onConflict: 'event_id,rank' })
          .select('*')
          .maybeSingle();
        winnerTrackId = inserted?.track_id || bestTrack._id;
      }
    }

    const participation = userParticipationByEvent.get(event.id);
    const rewardRow = rewardsByEvent.get(event.id);
    const userParticipation: CityEventParticipation | null = participation ? {
      id: String(participation.id),
      eventId: String(participation.event_id),
      userId: String(participation.user_id),
      trackId: String(participation.track_id),
      status: participation.status,
      createdAt: participation.created_at,
      track: trackMap.get(String(participation.track_id)) || null,
    } : null;

    return decorateCityEvent({
      ...event,
      title: row?.title || event.title,
      subtitle: row?.subtitle || event.subtitle,
      description: row?.description || event.description,
      icon: row?.icon || event.icon,
      accent: row?.accent || event.accent,
      status: row?.status || event.status,
      startsAt: row?.starts_at || event.startsAt,
      endsAt: row?.ends_at || event.endsAt,
      challengeTag: row?.challenge_tag || event.challengeTag,
      theme: row?.theme || event.theme,
      config: row?.config || event.config,
      reward: row?.reward || event.reward || cityEventReward(event),
      tracks: eventTracks,
      voteCounts,
      selectedTrackId: selectedByEvent.get(event.id) || event.selectedTrackId || null,
      participationCount: (participationByEvent.get(event.id) || []).length,
      userParticipation,
      winners,
      winnerTrackId,
      claimStatus: rewardRow?.status || (userParticipation ? 'available' : 'none'),
    }, now);
  }));

  return resolvedEvents;
}

function applyLegacyEventState(
  events: CityEvent[],
  pulse: CityPulseTrack[],
  userId: string | null,
  legacyPrefs: any,
  now = new Date(),
) {
  const trackMap = new Map(pulse.map((track) => [track._id, track]));
  const participations = legacyPrefs?.cityParticipations && typeof legacyPrefs.cityParticipations === 'object'
    ? legacyPrefs.cityParticipations
    : {};
  const rewards = legacyPrefs?.cityRewards && typeof legacyPrefs.cityRewards === 'object'
    ? legacyPrefs.cityRewards
    : {};

  return events.map((event) => {
    const participation = participations[event.id];
    const rewardEntry = rewards[event.id];
    const userParticipation: CityEventParticipation | null = participation?.trackId && userId ? {
      id: `legacy-${event.id}`,
      eventId: event.id,
      userId,
      trackId: String(participation.trackId),
      status: 'submitted',
      createdAt: participation.at || now.toISOString(),
      track: trackMap.get(String(participation.trackId)) || null,
    } : null;
    return decorateCityEvent({
      ...event,
      userParticipation,
      participationCount: Math.max(event.participationCount || 0, userParticipation ? 1 : 0),
      claimStatus: rewardEntry?.status || (userParticipation ? 'available' : 'none'),
    }, now);
  });
}

async function tryHydratePersistedEvents(
  events: CityEvent[],
  pulse: CityPulseTrack[],
  userId: string | null,
  dayKey: string,
  weekKey: string,
  now = new Date(),
  legacyPrefs: any = null,
) {
  try {
    const hydrated = await hydratePersistedEvents(events, pulse, userId, dayKey, weekKey, now);
    // Les actions legacy (faites avant migration) restent visibles.
    return hydrated.map((event) => {
      if (event.userParticipation || !legacyPrefs) return event;
      const legacy = applyLegacyEventState([event], pulse, userId, legacyPrefs, now)[0];
      return legacy.userParticipation ? legacy : event;
    });
  } catch (error) {
    if (!cityTableMissing(error)) console.error('city: persisted events unavailable', error);
    return applyLegacyEventState(events, pulse, userId, legacyPrefs, now);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request).catch(() => null);
    const userId = session?.user?.id || null;
    const now = new Date();
    const dayKey = dateKey(now);
    const weekKey = isoWeekKey(now);
    const since7d = new Date(now.getTime() - 7 * DAY_MS).toISOString();
    const since30d = new Date(now.getTime() - 30 * DAY_MS).toISOString();
    const since90d = new Date(now.getTime() - 90 * DAY_MS).toISOString();

    const [normalRes, aiRes, statsRes, profilesRes, commentsRes, followsRes, userEventsRes, userLikesRes, currentProfileRes] = await Promise.all([
      supabaseAdmin
        .from('tracks')
        .select('*, profiles:profiles!tracks_creator_id_fkey(id, username, name, artist_name, avatar, bio, genre, created_at, is_verified)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(180),
      supabaseAdmin
        .from('ai_tracks')
        .select('id, title, audio_url, image_url, duration, tags, play_count, created_at, generation:ai_generations!inner(user_id, status, is_public)')
        .eq('is_public', true)
        .eq('generation.status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin.from('track_stats_rolling_30d').select('*').limit(1200),
      supabaseAdmin.from('profiles').select('id, username, name, artist_name, avatar, bio, genre, created_at, preferences').gte('created_at', since90d).order('created_at', { ascending: false }).limit(80),
      supabaseAdmin.from('comments').select('track_id, created_at').gte('created_at', since7d).limit(2500),
      supabaseAdmin.from('user_follows').select('following_id, created_at').gte('created_at', since30d).limit(2500),
      userId ? supabaseAdmin.from('track_events').select('track_id, event_type, created_at').eq('user_id', userId).gte('created_at', since30d).limit(3000) : Promise.resolve({ data: [] } as any),
      userId ? supabaseAdmin.from('track_likes').select('track_id, created_at').eq('user_id', userId).gte('created_at', since30d).limit(1000) : Promise.resolve({ data: [] } as any),
      userId ? supabaseAdmin.from('profiles').select('id, username, name, artist_name, avatar, bio, genre, created_at, preferences').eq('id', userId).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);

    const normal = (normalRes.data || []).map(normalTrack).filter(Boolean) as CityTrack[];
    const aiRows = aiRes.data || [];
    const aiUserIds = Array.from(new Set(aiRows.map((row: any) => row?.generation?.user_id).filter(Boolean)));
    const aiProfilesRes = aiUserIds.length
      ? await supabaseAdmin.from('profiles').select('id, username, name, artist_name, avatar, bio, genre, created_at').in('id', aiUserIds)
      : { data: [] as any[] };
    const aiProfiles = new Map((aiProfilesRes.data || []).map((profile: any) => [String(profile.id), profile]));
    const ai = aiRows
      .map((row: any) => aiTrack(row, aiProfiles.get(String(row?.generation?.user_id || ''))))
      .filter(Boolean) as CityTrack[];
    const allTracks = uniqueTracks([...normal, ...ai]);

    const statsMap = new Map((statsRes.data || []).map((row: any) => [String(row.track_id), row]));
    const commentMap = new Map<string, number>();
    for (const row of commentsRes.data || []) commentMap.set(String(row.track_id), (commentMap.get(String(row.track_id)) || 0) + 1);
    const followerMap = new Map<string, number>();
    for (const row of followsRes.data || []) followerMap.set(String(row.following_id), (followerMap.get(String(row.following_id)) || 0) + 1);

    const pulse = allTracks
      .map((track) => toPulse(track, statsMap.get(track._id) || statsMap.get(track._id.replace(/^ai-/, '')), commentMap.get(track._id) || 0, followerMap.get(String(track.artist?._id || '')) || 0))
      .sort((a, b) => b.pulse - a.pulse || b.recentLikes - a.recentLikes || Number(b.plays || 0) - Number(a.plays || 0));

    const tracksByArtist = new Map<string, CityTrack[]>();
    for (const track of allTracks) {
      const id = String(track.artist?._id || '');
      if (!id) continue;
      tracksByArtist.set(id, [...(tracksByArtist.get(id) || []), track]);
    }

    const artistFromProfile = (profile: any): CityArtist | null => {
      const id = String(profile?.id || '');
      const username = String(profile?.username || '');
      if (!id || !username) return null;
      const tracks = tracksByArtist.get(id) || [];
      if (!tracks.length) return null;
      const totalPlays = tracks.reduce((sum, track) => sum + Number(track.plays || 0), 0);
      const totalLikes = tracks.reduce((sum, track) => sum + Number(track.likesCount || 0), 0);
      const followerCount = followerMap.get(id) || 0;
      const level = getArtistLevel(tracks.length * 120 + totalLikes * 18 + totalPlays * 0.8 + followerCount * 90);
      return {
        id,
        username,
        name: String(profile.artist_name || profile.name || username),
        avatar: profile.avatar || null,
        bio: String(profile.bio || ''),
        genre: asArray(profile.genre || tracks.flatMap((track) => track.genre || [])).slice(0, 3),
        createdAt: profile.created_at,
        trackCount: tracks.length,
        totalPlays,
        totalLikes,
        followerCount,
        ...level,
        featuredTrack: tracks.sort((a, b) => Number(b.plays || 0) - Number(a.plays || 0))[0] || null,
      };
    };

    const profilePool = new Map<string, any>();
    for (const profile of profilesRes.data || []) profilePool.set(String(profile.id), profile);
    for (const track of normalRes.data || []) {
      const profile = profileFromRelation(track.profiles);
      if (profile?.id) profilePool.set(String(profile.id), profile);
    }
    for (const profile of Array.from(aiProfiles.values())) if (profile?.id) profilePool.set(String(profile.id), profile);

    const artists = Array.from(profilePool.values()).map(artistFromProfile).filter(Boolean) as CityArtist[];
    const spotlightArtists = rotate(
      artists.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
      dayKey,
    ).slice(0, 6);

    const rising = pulse[0] || null;
    const newTalentTrack = spotlightArtists[0]?.featuredTrack || null;
    const aiPick = rotate(pulse.filter((track) => track.isAI), dayKey)[0] || null;
    const funnyPick = rotate(
      pulse.filter((track) => `${track.title} ${(track.genre || []).join(' ')} ${(track.tags || []).join(' ')}`.toLowerCase().match(/wtf|drole|fun|absurd|parod|comedy|meme|chat/)),
      dayKey,
    )[0] || rotate(pulse, `${dayKey}-fun`)[0] || null;
    const featured = rotate(pulse.filter((track) => track.isFeatured), dayKey)[0] || rotate(pulse.slice(0, 12), `${dayKey}-heart`)[0] || null;

    const showcaseCandidates: Array<[string, string, string, string, string, CityTrack | null]> = [
      ['rising', 'Son qui monte', 'Le Pulse accelere maintenant', '#7C5CFF', 'rocket', rising],
      ['new-talent', 'Nouveau talent', 'Un univers vient de rejoindre la ville', '#00A7B2', 'person-add', newTalentTrack],
      ['ai-original', 'Creation IA originale', 'Une idee impossible devenue musique', '#FF4B7A', 'sparkles', aiPick],
      ['wtf', 'Son WTF', 'La surprise du jour', '#F59E0B', 'happy', funnyPick],
      ['favorite', 'Coup de coeur Synaura', 'Choisi pour sa personnalite', '#E11D48', 'heart', featured],
    ];
    const showcase = showcaseCandidates
      .filter((entry) => entry[5])
      .map(([id, label, caption, accent, icon, track]) => ({ id, label, caption, accent, icon, track: track! } satisfies CityShowcaseItem));

    const radar = pulse
      .filter((track) => Number(track.plays || 0) < 500)
      .sort((a, b) => b.pulse - a.pulse)
      .slice(0, 8);
    const premieres = pulse
      .filter((track) => Date.now() - new Date(track.createdAt || 0).getTime() <= 72 * 60 * 60 * 1000)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 8);

    const challenge = CHALLENGES[stableNumber(weekKey) % CHALLENGES.length];
    const battleTracks = rotate(pulse.slice(0, 8), weekKey).slice(0, 2);
    const profilePreferences = (currentProfileRes.data as any)?.preferences || {};
    const selectedTrackId = profilePreferences?.cityBattleVotes?.[weekKey] || null;
    const baseVoteCounts = Object.fromEntries(battleTracks.map((track) => [track._id, Math.max(3, Math.round(track.pulse * 0.42 + track.recentLikes * 1.8))]));
    if (selectedTrackId && baseVoteCounts[selectedTrackId] !== undefined) baseVoteCounts[selectedTrackId] += 1;
    const season = seasonalEvent(now.getMonth());
    const weekEndsAt = new Date(now.getTime() + 7 * DAY_MS).toISOString();
    const liveStartsAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const events: CityEvent[] = [
      {
        id: `${weekKey}-friday`,
        kind: 'friday_drop',
        title: 'Synaura Friday Drop',
        subtitle: 'Chaque vendredi, la ville change de son',
        description: 'Les nouvelles sorties de la semaine arrivent ensemble sous les projecteurs.',
        icon: 'calendar',
        accent: '#FF4B7A',
        startsAt: nextFriday().toISOString(),
        endsAt: new Date(nextFriday().getTime() + DAY_MS).toISOString(),
        tracks: premieres.slice(0, 4),
      },
      {
        id: `${weekKey}-challenge`,
        kind: 'challenge',
        title: 'Theme Challenge',
        subtitle: challenge[0],
        description: challenge[2],
        icon: 'color-wand',
        accent: '#7C5CFF',
        startsAt: liveStartsAt,
        endsAt: weekEndsAt,
        challengeTag: challenge[1],
        theme: challenge[0],
        tracks: pulse.filter((track) => (track.tags || []).some((tag) => tag.toLowerCase().includes(challenge[1].slice(1).toLowerCase()))).slice(0, 4),
      },
      {
        id: weekKey,
        kind: 'battle',
        title: 'Battle IA',
        subtitle: 'Quel son merite la lumiere ?',
        description: 'Vote pour ton favori. Le gagnant rejoint la vitrine pendant 24 heures.',
        icon: 'flash',
        accent: '#00A7B2',
        startsAt: liveStartsAt,
        endsAt: weekEndsAt,
        tracks: battleTracks,
        selectedTrackId,
        voteCounts: baseVoteCounts,
      },
      {
        id: `${weekKey}-season`,
        kind: 'seasonal',
        ...season,
        startsAt: liveStartsAt,
        endsAt: weekEndsAt,
        tracks: rotate(pulse, `${weekKey}-season`).slice(0, 4),
      },
    ];
    const hydratedEvents = await tryHydratePersistedEvents(events, pulse, userId, dayKey, weekKey, now, profilePreferences);
    const hydratedBattle = hydratedEvents.find((event) => event.kind === 'battle') || events.find((event) => event.kind === 'battle') || null;

    const topArtist = [...artists].sort((a, b) => b.totalPlays + b.totalLikes * 3 - (a.totalPlays + a.totalLikes * 3))[0] || null;
    const bestNewcomer = spotlightArtists[0] || null;
    const hallOfFame: CityAward[] = [
      { id: 'pulse', title: 'Son de la semaine', subtitle: 'Le plus fort Pulse du moment', icon: 'trophy', track: pulse[0] || null },
      { id: 'discovered', title: 'Artiste le plus decouvert', subtitle: 'La ville ouvre son univers', icon: 'telescope', artist: topArtist },
      { id: 'newcomer', title: 'Meilleur nouveau venu', subtitle: 'Premiers pas, grosse impression', icon: 'star', artist: bestNewcomer },
      { id: 'commented', title: 'Son le plus commente', subtitle: 'Celui qui fait parler la communaute', icon: 'chatbubbles', track: [...pulse].sort((a, b) => b.recentComments - a.recentComments)[0] || null },
      { id: 'ai', title: 'Meilleure musique IA', subtitle: 'La creation artificielle la plus vivante', icon: 'sparkles', track: pulse.filter((track) => track.isAI)[0] || null },
      { id: 'visual', title: 'Meilleur univers visuel', subtitle: 'Une cover qui donne envie d entrer', icon: 'image', track: rotate(pulse.filter((track) => track.coverUrl), weekKey)[0] || null },
    ].filter((award) => award.track || award.artist);

    const userEvents = userEventsRes.data || [];
    const userLikes = userLikesRes.data || [];
    const starts = userEvents.filter((event: any) => event.event_type === 'play_start').length;
    const completes = userEvents.filter((event: any) => event.event_type === 'play_complete').length;
    const shares = userEvents.filter((event: any) => event.event_type === 'share').length;
    const listenerBadges: CityBadge[] = [
      { id: 'first-fan', title: 'Fan de la premiere heure', description: 'Aime un son avant qu il atteigne 100 ecoutes.', icon: 'heart', unlocked: userLikes.length > 0, progress: Math.min(userLikes.length, 1), target: 1 },
      { id: 'talent-scout', title: 'Decouvreur de talent', description: 'Ecoute cinq pepites detectees par le Radar.', icon: 'telescope', unlocked: starts >= 5, progress: Math.min(starts, 5), target: 5 },
      { id: 'daily-listener', title: 'Journee en musique', description: 'Ecoute dix sons sur Synaura.', icon: 'headset', unlocked: starts >= 10, progress: Math.min(starts, 10), target: 10 },
      { id: 'full-listen', title: 'Supporter officiel', description: 'Ecoute cinq creations jusqu au bout.', icon: 'ribbon', unlocked: completes >= 5, progress: Math.min(completes, 5), target: 5 },
      { id: 'city-voice', title: 'Voix de la ville', description: 'Partage trois sons qui meritent plus de lumiere.', icon: 'megaphone', unlocked: shares >= 3, progress: Math.min(shares, 3), target: 3 },
      { id: 'battle-voter', title: 'Jure Synaura', description: 'Vote dans une Battle IA.', icon: 'flash', unlocked: Boolean(hydratedBattle?.selectedTrackId), progress: hydratedBattle?.selectedTrackId ? 1 : 0, target: 1 },
    ];

    const creatorCard = currentProfileRes.data ? artistFromProfile(currentProfileRes.data) : null;
    const reactionsToday = pulse.reduce((sum, track) => sum + track.recentLikes + track.recentComments + Number(track.sharesCount || 0), 0);
    const cityData: SynauraCityData = {
      dayKey,
      weekKey,
      generatedAt: now.toISOString(),
      cityMood: {
        title: pulse[0]?.pulse >= 78 ? 'La ville est en feu' : 'La ville se reveille',
        subtitle: `${pulse.filter((track) => track.pulse >= 60).length} sons prennent de la vitesse aujourd hui.`,
        activeListeners: new Set(userEvents.map((event: any) => event.user_id).filter(Boolean)).size || Math.max(1, pulse.reduce((sum, track) => sum + track.recentPlays, 0)),
        reactionsToday,
        newDrops: premieres.length,
      },
      spotlightArtists,
      showcase,
      pulse: pulse.slice(0, 12),
      radar,
      premieres,
      events: hydratedEvents,
      hallOfFame,
      listenerBadges,
      creatorCard,
    };

    return NextResponse.json(cityData, {
      headers: { 'Cache-Control': userId ? 'private, no-store' : 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('city: failed to build Synaura City', error);
    return NextResponse.json({ error: 'Impossible de charger Synaura City pour le moment.' }, { status: 500 });
  }
}
