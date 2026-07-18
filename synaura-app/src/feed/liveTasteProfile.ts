import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Track } from '@/api/types';

const STORAGE_PREFIX = 'synaura.recommendation.live-taste.v1';
const HALF_LIFE_DAYS = 10;
const MAX_KEYS = 80;
const MAX_RECENT_TRACKS = 48;

export type LiveTasteSignal =
  | 'play_start'
  | 'play_progress_25'
  | 'play_progress_65'
  | 'play_complete'
  | 'like'
  | 'unlike'
  | 'skip'
  | 'next'
  | 'prev'
  | 'post_like';

export type LiveTasteProfile = {
  version: 1;
  updatedAt: number;
  artistScores: Record<string, number>;
  genreScores: Record<string, number>;
  recentTrackIds: string[];
};

export function emptyLiveTasteProfile(): LiveTasteProfile {
  return { version: 1, updatedAt: Date.now(), artistScores: {}, genreScores: {}, recentTrackIds: [] };
}

function keyFor(ownerId?: string | null) {
  return `${STORAGE_PREFIX}:${ownerId || 'guest'}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function genresOf(track: Track) {
  const value = Array.isArray(track.genre) ? track.genre : [];
  return Array.from(new Set(value.map((genre) => String(genre || '').trim().toLowerCase()).filter(Boolean)));
}

function artistIdOf(track: Track) {
  return String(track.artist?._id || track.artist?.username || '').trim().toLowerCase();
}

function signalValue(type: LiveTasteSignal, weight: number) {
  const multiplier = clamp(Number(weight || 1), 0.5, 5);
  const base: Record<LiveTasteSignal, number> = {
    play_start: 0.12,
    play_progress_25: 0.45,
    play_progress_65: 1.45,
    play_complete: 3.2,
    like: 4.4,
    unlike: -2.8,
    skip: -4.2,
    next: -2.4,
    prev: -1.1,
    post_like: 1.25,
  };
  return base[type] * Math.min(2, multiplier);
}

function trimScores(scores: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(scores)
      .filter(([key, value]) => key && Number.isFinite(value) && Math.abs(value) >= 0.04)
      .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
      .slice(0, MAX_KEYS),
  );
}

function decayed(profile: LiveTasteProfile, now = Date.now()) {
  const elapsedDays = Math.max(0, now - Number(profile.updatedAt || now)) / 86_400_000;
  const factor = Math.pow(0.5, elapsedDays / HALF_LIFE_DAYS);
  return {
    ...profile,
    updatedAt: now,
    artistScores: trimScores(Object.fromEntries(Object.entries(profile.artistScores || {}).map(([key, value]) => [key, Number(value) * factor]))),
    genreScores: trimScores(Object.fromEntries(Object.entries(profile.genreScores || {}).map(([key, value]) => [key, Number(value) * factor]))),
    recentTrackIds: Array.isArray(profile.recentTrackIds) ? profile.recentTrackIds.filter(Boolean).slice(0, MAX_RECENT_TRACKS) : [],
  } satisfies LiveTasteProfile;
}

export async function readLiveTasteProfile(ownerId?: string | null) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(ownerId));
    if (!raw) return emptyLiveTasteProfile();
    const parsed = JSON.parse(raw) as LiveTasteProfile;
    if (parsed?.version !== 1) return emptyLiveTasteProfile();
    return decayed(parsed);
  } catch {
    return emptyLiveTasteProfile();
  }
}

export async function writeLiveTasteProfile(ownerId: string | null | undefined, profile: LiveTasteProfile) {
  await AsyncStorage.setItem(keyFor(ownerId), JSON.stringify(decayed(profile))).catch(() => {});
}

export function applyLiveTasteSignal(
  current: LiveTasteProfile,
  track: Track,
  type: LiveTasteSignal,
  weight = 1,
) {
  const profile = decayed(current);
  const value = signalValue(type, weight);
  const artistId = artistIdOf(track);
  if (artistId) profile.artistScores[artistId] = clamp((profile.artistScores[artistId] || 0) + value, -12, 12);
  for (const genre of genresOf(track)) {
    profile.genreScores[genre] = clamp((profile.genreScores[genre] || 0) + value * 0.72, -10, 10);
  }
  profile.artistScores = trimScores(profile.artistScores);
  profile.genreScores = trimScores(profile.genreScores);
  profile.recentTrackIds = [track._id, ...profile.recentTrackIds.filter((id) => id !== track._id)].slice(0, MAX_RECENT_TRACKS);
  return profile;
}

function deterministicUnit(id: string) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash / 0xffffffff;
}

export function rerankTracksWithLiveTaste(
  tracks: Track[],
  profile: LiveTasteProfile,
  viewedTracks: Track[] = [],
) {
  if (tracks.length < 2) return tracks;
  const artistExposure = new Map<string, number>();
  const genreExposure = new Map<string, number>();
  for (const track of viewedTracks.slice(-20)) {
    const artistId = artistIdOf(track);
    if (artistId) artistExposure.set(artistId, (artistExposure.get(artistId) || 0) + 1);
    for (const genre of genresOf(track)) genreExposure.set(genre, (genreExposure.get(genre) || 0) + 1);
  }

  const scored = tracks.map((track) => {
    const artistId = artistIdOf(track);
    const genres = genresOf(track);
    const artistTaste = profile.artistScores[artistId] || 0;
    const genreTaste = genres.length
      ? genres.reduce((sum, genre) => sum + (profile.genreScores[genre] || 0), 0) / genres.length
      : 0;
    const recentIndex = profile.recentTrackIds.indexOf(track._id);
    const recentPenalty = recentIndex < 0 ? 0 : Math.max(0.25, 2.8 - recentIndex * 0.08);
    const exposurePenalty = (artistExposure.get(artistId) || 0) * 0.82
      + genres.reduce((sum, genre) => sum + (genreExposure.get(genre) || 0) * 0.16, 0);
    const serverScore = Number(track.recommendationScore ?? (track as Track & { rankingScore?: number }).rankingScore ?? 0);
    const exploration = (deterministicUnit(track._id) - 0.5) * 0.22;
    return {
      track,
      artistId,
      primaryGenre: genres[0] || '',
      score: serverScore + artistTaste * 1.05 + genreTaste * 0.78 - recentPenalty - exposurePenalty + exploration,
    };
  });

  const result: Track[] = [];
  while (scored.length) {
    scored.sort((left, right) => {
      const adjusted = (entry: (typeof scored)[number]) => {
        const previous = result[result.length - 1];
        const previousArtist = previous ? artistIdOf(previous) : '';
        const recentGenres = result.slice(-3).flatMap(genresOf);
        return entry.score
          - (entry.artistId && entry.artistId === previousArtist ? 3.5 : 0)
          - (entry.primaryGenre && recentGenres.filter((genre) => genre === entry.primaryGenre).length >= 2 ? 1.8 : 0);
      };
      return adjusted(right) - adjusted(left);
    });
    result.push(scored.shift()!.track);
  }
  return result;
}
