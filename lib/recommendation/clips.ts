import type { MusicClip } from '@/lib/musicClips';
import { deterministicUnit } from './engine';
import type { UserRecommendationSignals } from './types';
import { diversifyRanked, finitePositive, normalizedGenres, uniqueCandidates } from './policy.ts';

function genres(value: unknown) {
  return normalizedGenres(value);
}

function seenPenalty(clipId: string, signals: UserRecommendationSignals, now: number) {
  const sessionCount = signals.currentSessionRecommendationCounts.get(clipId) || 0;
  if (signals.currentSessionRecommendedClipIds.has(clipId) || sessionCount > 0) {
    return Math.max(0.012, 0.07 * Math.pow(0.48, Math.max(0, sessionCount - 1)));
  }
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
  const now = input.now ?? Date.now();
  const scored = uniqueCandidates(clips, (clip) => String(clip.id || ''))
    .filter((clip) => clip.visibility === 'published' && Boolean(clip.videoUrl) && clip.sourceTrack?.isPublic === true)
    .filter((clip) => !signals.hiddenArtistIds.has(String(clip.creatorId || '')) && !signals.hiddenArtistIds.has(String(clip.sourceTrack?.artist?._id || '')))
    .map((clip) => {
    const created = Date.parse(clip.createdAt || '');
    const ageHours = Number.isFinite(created) ? Math.max(0, (now - created) / 3_600_000) : 24 * 365;
    const fresh = 8 * Math.exp(-ageHours * Math.LN2 / (24 * 7));
    const social = Math.min(6, Math.log1p(finitePositive(clip.likesCount)) * 1.7) + Math.min(7, Math.log1p(finitePositive(clip.commentsCount)) * 2.4);
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
    const avoidedGenre = genres(clip.sourceTrack?.genre).reduce((sum, genre) => sum + (signals.avoidedGenres.get(genre) || 0) + (signals.currentSessionAvoidedGenres.get(genre) || 0), 0);
    const negative = Math.min(8, (signals.artistAversion.get(creatorId) || 0) + (signals.currentSessionArtistAversion.get(creatorId) || 0)) + Math.min(6, avoidedGenre);
    const skipped = signals.currentSessionSkippedTrackIds.has(sourceId) ? .08 : signals.skippedTrackIds.has(sourceId) ? .35 : 1;
    const score = Math.max(0, fresh + social + sourceAffinity + creatorAffinity + Math.min(3.5, genreAffinity * 0.35) - negative) * exposurePenalty * skipped + jitter;
    const reasons = [
      fresh >= 3.5 ? 'fresh' : null,
      social > 0 ? 'social_engagement' : null,
      sourceAffinity > 0 ? 'source_affinity' : null,
      creatorAffinity > 0 ? 'creator_affinity' : null,
      exposurePenalty < 1 ? 'already_seen' : null,
      skipped < 1 ? 'skip_penalty' : null,
    ].filter((reason): reason is string => Boolean(reason));
    return { ...clip, recommendationScore: Number(score.toFixed(6)), recommendationReasons: reasons.length ? reasons : ['exploration'] };
  }).sort((a, b) => Number(b.recommendationScore || 0) - Number(a.recommendationScore || 0));

  return diversifyRanked(scored, { id: (clip) => clip.id, creator: (clip) => String(clip.creatorId || ''),
    source: (clip) => String(clip.sourceTrackId || ''), score: (clip) => clip.recommendationScore });
}
