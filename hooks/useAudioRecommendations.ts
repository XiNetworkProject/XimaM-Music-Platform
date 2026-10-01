'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { boundedInteger, diversifyRanked, finitePositive, normalizedGenres, uniqueCandidates } from '@/lib/recommendation/policy';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: number | string[];
  comments: number | string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  tags?: string[];
  createdAt?: string;
  isBoosted?: boolean;
}

const HISTORY_LIMIT = 100;
const RECENT_AVOID_LIMIT = 12;

function countOf(value: unknown): number {
  if (typeof value === 'number') return finitePositive(value);
  if (Array.isArray(value)) return value.length;
  return 0;
}

function normalizeTags(values?: string[]) {
  return normalizedGenres(values);
}

function freshnessBoost(createdAt?: string) {
  if (!createdAt) return 0;
  const diff = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(diff)) return 0;
  const days = diff / (1000 * 60 * 60 * 24);
  if (days <= 3) return 8;
  if (days <= 14) return 5;
  if (days <= 30) return 2;
  return 0;
}

function popularityBoost(track: Track) {
  return Math.min(5, Math.log10(finitePositive(track.plays) + 1) * 2.2) + Math.min(5, Math.log10(countOf(track.likes) + 1) * 3.1);
}

function buildAffinity(history: Track[]) {
  const genreWeights = new Map<string, number>();
  const artistWeights = new Map<string, number>();

  history.forEach((track, index) => {
    const recencyWeight = Math.max(1, HISTORY_LIMIT - index) / 14;
    normalizeTags(track.genre).forEach((genre) => {
      genreWeights.set(genre, (genreWeights.get(genre) || 0) + recencyWeight);
    });
    if (track.artist?._id) {
      artistWeights.set(track.artist._id, (artistWeights.get(track.artist._id) || 0) + recencyWeight * 1.35);
    }
  });

  return { genreWeights, artistWeights };
}

export const useAudioRecommendations = () => {
  const { data: session } = useSession();
  const [storedHistory, setUserHistory] = useState<Track[]>([]);
  const [historyOwner, setHistoryOwner] = useState<string | null>(null);
  const [storedPreferences, setUserPreferences] = useState<{
    favoriteGenres: string[];
    favoriteArtists: string[];
    listeningTime: number;
  }>({
    favoriteGenres: [],
    favoriteArtists: [],
    listeningTime: 0,
  });
  const viewerId = session?.user?.id || null;
  const userHistory = historyOwner === viewerId ? storedHistory : [];
  const userPreferences = historyOwner === viewerId ? storedPreferences : { favoriteGenres: [], favoriteArtists: [], listeningTime: 0 };

  useEffect(() => {
    let history: Track[] = [];
    let preferences = { favoriteGenres: [] as string[], favoriteArtists: [] as string[], listeningTime: 0 };
    try {
      const saved = viewerId ? JSON.parse(localStorage.getItem(`userHistory_${viewerId}`) || '[]') : [];
      history = Array.isArray(saved) ? saved.filter((track) => track && typeof track._id === 'string').slice(0, HISTORY_LIMIT) : [];
    } catch { /* Storage can be disabled or incompatible. */ }
    try {
      const saved = viewerId ? JSON.parse(localStorage.getItem(`userPreferences_${viewerId}`) || '{}') : {};
      preferences = { favoriteGenres: Array.isArray(saved?.favoriteGenres) ? normalizeTags(saved.favoriteGenres).slice(0, 20) : [],
        favoriteArtists: Array.isArray(saved?.favoriteArtists) ? saved.favoriteArtists.filter((id: unknown) => typeof id === 'string').slice(0, 50) : [], listeningTime: finitePositive(saved?.listeningTime) };
    } catch { /* Never reuse the preceding account's preferences. */ }
    setUserHistory(history); setUserPreferences(preferences); setHistoryOwner(viewerId);
  }, [session?.user?.id]);

  const saveToHistory = useCallback((track: Track) => {
    if (!session?.user?.id || historyOwner !== session.user.id || !track?._id) return;

    setUserHistory((previous) => {
      const nextHistory = [track, ...previous.filter((entry) => entry._id !== track._id)].slice(0, HISTORY_LIMIT);
      try { localStorage.setItem(`userHistory_${session.user.id}`, JSON.stringify(nextHistory)); } catch { /* Optional persistence. */ }
      return nextHistory;
    });
  }, [session?.user?.id, historyOwner]);

  const updatePreferences = useCallback((track: Track) => {
    if (!session?.user?.id || historyOwner !== session.user.id) return;

    setUserPreferences((previous) => {
      const nextPreferences = {
        ...previous,
        favoriteGenres: Array.from(new Set([...previous.favoriteGenres, ...normalizeTags(track.genre)])).slice(0, 20),
        favoriteArtists: Array.from(new Set([...previous.favoriteArtists, track.artist?._id].filter(Boolean) as string[])).slice(0, 50),
      };

      try { localStorage.setItem(`userPreferences_${session.user.id}`, JSON.stringify(nextPreferences)); } catch { /* Optional persistence. */ }
      return nextPreferences;
    });
  }, [session?.user?.id, historyOwner]);

  const getSimilarTracks = useCallback((currentTrack: Track, allTracks: Track[], limit: number = 10): Track[] => {
    if (!currentTrack?._id || !allTracks.length) return [];

    const currentGenres = new Set(normalizeTags(currentTrack.genre));
    const currentTags = new Set(normalizeTags(currentTrack.tags));
    const recentIds = new Set(userHistory.slice(0, RECENT_AVOID_LIMIT).map((track) => track._id));

    const scored = uniqueCandidates(allTracks, (track) => track._id)
      .filter((track) => Boolean(track.audioUrl))
      .filter((track) => track._id !== currentTrack._id)
      .map((track) => {
        let score = 0;
        const trackGenres = normalizeTags(track.genre);
        const trackTags = normalizeTags(track.tags);
        const sharedGenres = trackGenres.filter((genre) => currentGenres.has(genre)).length;
        const sharedTags = trackTags.filter((tag) => currentTags.has(tag)).length;

        score += sharedGenres * 18;
        score += sharedTags * 7;
        if (track.artist?._id && track.artist._id === currentTrack.artist?._id) score += 26;
        score += popularityBoost(track);
        score += freshnessBoost(track.createdAt);
        if (recentIds.has(track._id)) score -= 22;

        return { track, score };
      });
    return diversifyRanked(scored, { id: (entry) => entry.track._id, creator: (entry) => entry.track.artist?._id || '', score: (entry) => entry.score, limit: boundedInteger(limit, 10, 0, 100) }).map((entry) => entry.track);
  }, [userHistory]);

  const getRecommendedTracks = useCallback((allTracks: Track[], limit: number = 10): Track[] => {
    if (!allTracks.length) return [];

    const history = userHistory.slice(0, HISTORY_LIMIT);
    const recentIds = new Set(history.slice(0, RECENT_AVOID_LIMIT).map((track) => track._id));
    const recentArtists = new Set(history.slice(0, 4).map((track) => track.artist?._id).filter(Boolean));
    const { genreWeights, artistWeights } = buildAffinity(history);
    const preferredGenres = new Set(userPreferences.favoriteGenres);
    const preferredArtists = new Set(userPreferences.favoriteArtists);

    const scored = uniqueCandidates(allTracks, (track) => track._id)
      .filter((track) => Boolean(track.audioUrl))
      .filter((track) => !recentIds.has(track._id))
      .map((track) => {
        let score = popularityBoost(track) + freshnessBoost(track.createdAt);

        normalizeTags(track.genre).forEach((genre) => {
          score += Math.min(10, (genreWeights.get(genre) || 0) * 2.6) / Math.max(1, normalizeTags(track.genre).length);
          if (preferredGenres.has(genre)) score += 4;
        });

        if (track.artist?._id) {
          score += Math.min(12, (artistWeights.get(track.artist._id) || 0) * 4.5);
          if (preferredArtists.has(track.artist._id)) score += 7;
          if (recentArtists.has(track.artist._id)) score -= 6;
        }

        if (track.isBoosted) score += 2.5;
        if (track.isLiked) score += 6;

        return { track, score };
      });
    return diversifyRanked(scored, { id: (entry) => entry.track._id, creator: (entry) => entry.track.artist?._id || '', score: (entry) => entry.score, limit: boundedInteger(limit, 10, 0, 100) }).map((entry) => entry.track);
  }, [userHistory, userPreferences.favoriteArtists, userPreferences.favoriteGenres]);

  const getAutoPlayNext = useCallback((currentTrack: Track, queue: Track[], allTracks: Track[]): Track | null => {
    if (!currentTrack?._id) return null;

    if (queue.length > 1) {
      const currentIndex = queue.findIndex((track) => track._id === currentTrack._id);
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
        return queue[currentIndex + 1];
      }
    }

    const recentIds = new Set(userHistory.slice(0, 6).map((track) => track._id));
    const similarTracks = getSimilarTracks(currentTrack, allTracks, 12);
    const recommendedTracks = getRecommendedTracks(allTracks, 12);
    const candidateIds = new Set<string>();
    const mergedCandidates: Track[] = [];

    for (const track of [...similarTracks, ...recommendedTracks]) {
      if (!track?._id || track._id === currentTrack._id || recentIds.has(track._id) || candidateIds.has(track._id)) continue;
      candidateIds.add(track._id);
      mergedCandidates.push(track);
    }

    if (mergedCandidates.length) {
      return mergedCandidates[0];
    }

    const fallback = allTracks
      .filter((track) => track._id !== currentTrack._id && !recentIds.has(track._id))
      .sort((left, right) => {
        const rightScore = popularityBoost(right) + freshnessBoost(right.createdAt);
        const leftScore = popularityBoost(left) + freshnessBoost(left.createdAt);
        return rightScore - leftScore;
      });

    return fallback[0] || null;
  }, [getRecommendedTracks, getSimilarTracks, userHistory]);

  const getMoodBasedRecommendations = useCallback((mood: string, allTracks: Track[], limit: number = 10): Track[] => {
    const moodGenres: Record<string, string[]> = {
      energetic: ['rock', 'electronic', 'dance', 'pop'],
      chill: ['ambient', 'jazz', 'lofi', 'classical'],
      happy: ['pop', 'reggae', 'folk', 'indie'],
      sad: ['blues', 'soul', 'ballad', 'acoustic'],
      focused: ['instrumental', 'classical', 'ambient', 'post-rock'],
      party: ['dance', 'hip-hop', 'electronic', 'reggaeton'],
    };

    const targetGenres = new Set(moodGenres[mood.toLowerCase()] || []);
    if (!targetGenres.size) return [];

    const matching = allTracks.filter((track) => track.audioUrl && normalizeTags(track.genre).some((genre) => targetGenres.has(genre)));
    return diversifyRanked(matching, { id: (track) => track._id, creator: (track) => track.artist?._id || '',
      score: (track) => popularityBoost(track) + freshnessBoost(track.createdAt), limit: boundedInteger(limit, 10, 0, 100) });
  }, []);

  const analyzeListeningSession = useCallback((track: Track, listenDuration: number) => {
    saveToHistory(track);
    // A brief accidental play/skip is not a positive taste signal.
    const qualified = finitePositive(listenDuration) >= Math.min(30, finitePositive(track.duration) > 0 ? track.duration * .5 : 30);
    if (qualified) updatePreferences(track);

    if (session?.user?.id && historyOwner === session.user.id) {
      setUserPreferences((previous) => {
        const nextPreferences = {
          ...previous,
          listeningTime: previous.listeningTime + Math.min(finitePositive(listenDuration), finitePositive(track.duration) || finitePositive(listenDuration)),
        };
        try { localStorage.setItem(`userPreferences_${session.user.id}`, JSON.stringify(nextPreferences)); } catch { /* Optional persistence. */ }
        return nextPreferences;
      });
    }
  }, [saveToHistory, session?.user?.id, historyOwner, updatePreferences]);

  return {
    userHistory,
    userPreferences,
    getSimilarTracks,
    getRecommendedTracks,
    getAutoPlayNext,
    getMoodBasedRecommendations,
    analyzeListeningSession,
    saveToHistory,
    updatePreferences,
  };
};
