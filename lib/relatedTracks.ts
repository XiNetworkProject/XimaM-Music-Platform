export type RelatedPlaylistMatch = {
  id: string;
  title: string;
  kind: 'playlist' | 'collection';
  positionDistance?: number | null;
};

export type RelatedTrackSource = {
  id: string;
  artistId: string;
  genres: string[];
  album?: string | null;
};

export type RelatedTrackCandidate<T> = {
  track: T;
  id: string;
  artistId: string;
  genres: string[];
  album?: string | null;
  plays?: number;
  createdAt?: string | null;
  playlistMatches?: RelatedPlaylistMatch[];
};

export type RankedRelatedTrack<T> = {
  track: T;
  score: number;
  reasons: string[];
};

function normalized(value: unknown) {
  return String(value || '').trim().toLocaleLowerCase('fr');
}

function normalizedGenres(values: string[] | null | undefined) {
  return Array.from(new Set((values || []).map(normalized).filter(Boolean)));
}

function deterministicUnit(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash / 0xffffffff;
}

function freshnessBonus(createdAt?: string | null) {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  const ageDays = Math.max(0, (Date.now() - created) / 86_400_000);
  if (ageDays <= 14) return 4;
  if (ageDays <= 90) return 2;
  return 0;
}

export function rankRelatedTrackCandidates<T>(
  source: RelatedTrackSource,
  candidates: RelatedTrackCandidate<T>[],
  limit = 8,
): RankedRelatedTrack<T>[] {
  const sourceGenres = normalizedGenres(source.genres);
  const sourceAlbum = normalized(source.album);
  const sourceArtist = normalized(source.artistId);
  const unique = new Map<string, RelatedTrackCandidate<T>>();

  for (const candidate of candidates) {
    if (!candidate.id || candidate.id === source.id) continue;
    const previous = unique.get(candidate.id);
    if (!previous) {
      unique.set(candidate.id, candidate);
      continue;
    }
    const matches = [...(previous.playlistMatches || []), ...(candidate.playlistMatches || [])];
    unique.set(candidate.id, {
      ...previous,
      ...candidate,
      playlistMatches: Array.from(new Map(matches.map((match) => [match.id, match])).values()),
    });
  }

  const scored = Array.from(unique.values()).flatMap((candidate) => {
    const candidateGenres = normalizedGenres(candidate.genres);
    const sharedGenres = sourceGenres.filter((genre) => candidateGenres.includes(genre));
    const sameAlbum = Boolean(sourceAlbum && normalized(candidate.album) === sourceAlbum);
    const sameArtist = Boolean(sourceArtist && normalized(candidate.artistId) === sourceArtist);
    const playlistMatches = (candidate.playlistMatches || []).filter((match) => match.id);
    let relationScore = 0;
    const reasons: string[] = [];

    if (playlistMatches.length) {
      const primary = playlistMatches
        .slice()
        .sort((left, right) => Number(left.positionDistance ?? 999) - Number(right.positionDistance ?? 999))[0];
      const distance = Number(primary.positionDistance ?? 8);
      relationScore += 82 + Math.max(0, 16 - Math.min(16, distance * 2));
      relationScore += Math.min(16, Math.max(0, playlistMatches.length - 1) * 8);
      reasons.push(`${primary.kind === 'collection' ? 'Même collection' : 'Même playlist'} · ${primary.title}`);
    }
    if (sameAlbum) {
      relationScore += 54;
      reasons.push('Même album');
    }
    if (sharedGenres.length) {
      relationScore += Math.min(56, sharedGenres.length * 28);
      reasons.push(`Même ambiance · ${sharedGenres[0]}`);
    }
    if (sameArtist) {
      relationScore += 16;
      reasons.push('Même créateur');
    }
    if (relationScore <= 0) return [];

    const quality = Math.min(9, Math.log10(Math.max(0, Number(candidate.plays || 0)) + 1) * 2.2);
    const score = relationScore
      + quality
      + freshnessBonus(candidate.createdAt)
      + deterministicUnit(candidate.id) * 0.35;
    return [{
      candidate,
      primaryGenre: sharedGenres[0] || candidateGenres[0] || '',
      score,
      reasons: reasons.slice(0, 3),
    }];
  });

  const selected: RankedRelatedTrack<T>[] = [];
  const artistExposure = new Map<string, number>();
  const recentGenres: string[] = [];
  while (scored.length && selected.length < Math.max(1, Math.min(20, limit))) {
    scored.sort((left, right) => {
      const adjusted = (entry: (typeof scored)[number]) => {
        const artist = normalized(entry.candidate.artistId);
        const artistPenalty = (artistExposure.get(artist) || 0) * 18;
        const genrePenalty = entry.primaryGenre
          ? recentGenres.slice(-3).filter((genre) => genre === entry.primaryGenre).length * 8
          : 0;
        return entry.score - artistPenalty - genrePenalty;
      };
      return adjusted(right) - adjusted(left);
    });
    const next = scored.shift()!;
    const artist = normalized(next.candidate.artistId);
    if (artist) artistExposure.set(artist, (artistExposure.get(artist) || 0) + 1);
    if (next.primaryGenre) recentGenres.push(next.primaryGenre);
    selected.push({
      track: next.candidate.track,
      score: Number(next.score.toFixed(3)),
      reasons: next.reasons,
    });
  }

  return selected;
}
