import type { MusicClip } from '@/lib/musicClips';
import { deterministicUnit } from './engine';
import type { UserRecommendationSignals } from './types';

function genres(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
  return [];
}

function seenPenalty(clipId: string, signals: UserRecommendationSignals, now: number) {
  const last = signals.lastRecommendedAt.get(clipId) || 0;
  if (!last) return 1;
  const hours = Math.max(0, (now - last) / 3_600_000);
  return hours < 6 ? 0.3 : hours < 24 ? 0.5 : hours < 72 ? 0.72 : 0.86;
}

export function rankMusicClips(
  clips: MusicClip[],
  signals: UserRecommendationSignals,
  input: { now?: number; sessionSeed?: string | null } = {},
) {
  const now = input.now || Date.now();
  const scored = clips.map((clip) => {
    const created = clip.createdAt ? new Date(clip.createdAt).getTime() : now;
    const ageHours = Math.max(0, (now - created) / 3_600_000);
    const fresh = 8 * Math.exp(-ageHours * Math.LN2 / (24 * 7));
    const social = Math.log1p(Math.max(0, clip.likesCount)) * 1.7 + Math.log1p(Math.max(0, clip.commentsCount)) * 2.4;
    const sourceId = String(clip.sourceTrackId || '');
    const sourceArtistId = String(clip.sourceTrack?.artist?._id || '');
    const creatorId = String(clip.creatorId || '');
    const sourceAffinity = signals.currentObsessionTrackIds.has(sourceId)
      ? 6
      : signals.likedTrackIds.has(sourceId)
        ? 4.2
        : signals.completedTrackIds.has(sourceId)
          ? 2.8
          : signals.collaborativeTrackIds.has(sourceId)
            ? 2.2
            : 0;
    const creatorAffinity = (signals.followedArtistIds.has(creatorId) ? 4.5 : 0)
      + Math.min(3.5, (signals.artistAffinity.get(creatorId) || 0) * 0.45)
      + Math.min(2.5, (signals.artistAffinity.get(sourceArtistId) || 0) * 0.3);
    const genreAffinity = genres(clip.sourceTrack?.genre).reduce((sum, genre) => sum + (signals.preferredGenres.get(genre) || 0), 0);
    const exposurePenalty = seenPenalty(clip.id, signals, now);
    const jitter = (deterministicUnit(input.sessionSeed || 'synaura-clips', clip.id) - 0.5) * 0.18;
    const score = (fresh + social + sourceAffinity + creatorAffinity + Math.min(3.5, genreAffinity * 0.35)) * exposurePenalty + jitter;
    const reasons = [
      fresh >= 3.5 ? 'fresh' : null,
      social > 0 ? 'social_engagement' : null,
      sourceAffinity > 0 ? 'source_affinity' : null,
      creatorAffinity > 0 ? 'creator_affinity' : null,
      exposurePenalty < 1 ? 'already_seen' : null,
    ].filter((reason): reason is string => Boolean(reason));
    return { ...clip, recommendationScore: Number(score.toFixed(6)), recommendationReasons: reasons.length ? reasons : ['exploration'] };
  }).sort((a, b) => Number(b.recommendationScore || 0) - Number(a.recommendationScore || 0));

  const result: typeof scored = [];
  const deferred: typeof scored = [];
  const creatorCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  for (const clip of scored) {
    const creatorCount = creatorCounts.get(clip.creatorId) || 0;
    const sourceCount = sourceCounts.get(clip.sourceTrackId) || 0;
    const repeatsCreator = result[result.length - 1]?.creatorId === clip.creatorId;
    if ((repeatsCreator || creatorCount >= 3 || sourceCount >= 2) && result.length < 24) {
      deferred.push(clip);
      continue;
    }
    result.push(clip);
    creatorCounts.set(clip.creatorId, creatorCount + 1);
    sourceCounts.set(clip.sourceTrackId, sourceCount + 1);
  }
  return [...result, ...deferred];
}
