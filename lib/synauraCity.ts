export type CityTrack = {
  _id: string;
  title: string;
  artist: {
    _id?: string;
    username?: string;
    name?: string;
    artistName?: string;
    avatar?: string | null;
  };
  audioUrl: string;
  coverUrl?: string | null;
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  duration?: number;
  genre?: string[];
  tags?: string[];
  plays?: number;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  createdAt?: string;
  isAI?: boolean;
  isFeatured?: boolean;
};

export type CityPulseTrack = CityTrack & {
  pulse: number;
  pulseState: 'Calme' | 'Ca demarre' | 'Ca chauffe' | 'En feu' | 'Viral potentiel';
  pulseReasons: string[];
  recentPlays: number;
  recentLikes: number;
  recentComments: number;
  retention: number;
};

export type CityArtist = {
  id: string;
  username: string;
  name: string;
  avatar?: string | null;
  bio?: string;
  genre: string[];
  createdAt?: string;
  trackCount: number;
  totalPlays: number;
  totalLikes: number;
  followerCount: number;
  level: number;
  levelName: string;
  xp: number;
  nextLevelXp: number;
  featuredTrack?: CityTrack | null;
};

export type CityShowcaseItem = {
  id: string;
  label: string;
  caption: string;
  accent: string;
  icon: string;
  track: CityTrack;
};

export type CityAward = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  track?: CityTrack | null;
  artist?: CityArtist | null;
};

export type CityBadge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
};

export type CityEvent = {
  id: string;
  kind: 'friday_drop' | 'challenge' | 'battle' | 'seasonal';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: string;
  status?: 'scheduled' | 'live' | 'ended' | 'resolved' | 'archived';
  isLive?: boolean;
  isEnded?: boolean;
  startsAt?: string;
  endsAt?: string;
  challengeTag?: string;
  theme?: string;
  tracks?: CityPulseTrack[];
  selectedTrackId?: string | null;
  voteCounts?: Record<string, number>;
  totalVotes?: number;
  participationCount?: number;
  participants?: CityEventParticipant[];
  userParticipation?: CityEventParticipation | null;
  canParticipate?: boolean;
  winnerTrackId?: string | null;
  winners?: CityEventWinner[];
  userIsWinner?: boolean;
  celebration?: {
    title: string;
    message: string;
    trackId?: string | null;
    rewardTitle?: string | null;
  } | null;
  reward?: CityEventReward | null;
  claimStatus?: 'none' | 'available' | 'claimed' | 'expired';
  detailCta?: {
    label: string;
    action: 'vote' | 'participate' | 'claim' | 'open' | 'create';
    href?: string;
  };
  config?: Record<string, unknown>;
};

export type CityEventParticipant = {
  id: string;
  eventId: string;
  userId: string;
  username?: string | null;
  name: string;
  avatar?: string | null;
  trackId: string;
  createdAt?: string | null;
  status: 'submitted' | 'accepted' | 'rejected' | 'winner' | 'contender';
  track?: CityPulseTrack | null;
};

export type CityVoteSession = CityEvent & {
  kind: 'battle';
  config: {
    format: 'vote_session';
    sessionKey: 'morning' | 'afternoon' | 'evening';
    sessionLabel: string;
    maxVotesPerUser: number;
  };
};

export type CityEventParticipation = {
  id: string;
  eventId: string;
  userId: string;
  trackId: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'winner';
  createdAt: string;
  track?: CityPulseTrack | null;
};

export type CityEventWinner = {
  id: string;
  eventId: string;
  trackId: string;
  userId?: string | null;
  rank: number;
  reason?: string | null;
  showcaseUntil?: string | null;
  track?: CityPulseTrack | null;
};

export type CityEventReward = {
  key: string;
  title: string;
  description: string;
  kind: 'badge' | 'booster' | 'showcase' | 'xp';
  amount?: number;
  metadata?: Record<string, unknown>;
};

export type SynauraCityData = {
  dayKey: string;
  weekKey: string;
  generatedAt: string;
  cityMood: {
    title: string;
    subtitle: string;
    activeListeners: number;
    reactionsToday: number;
    newDrops: number;
  };
  spotlightArtists: CityArtist[];
  showcase: CityShowcaseItem[];
  pulse: CityPulseTrack[];
  radar: CityPulseTrack[];
  premieres: CityPulseTrack[];
  events: CityEvent[];
  voteSessions: CityVoteSession[];
  currentVoteSession: CityVoteSession | null;
  nextVoteSession: CityVoteSession | null;
  hallOfFame: CityAward[];
  listenerBadges: CityBadge[];
  creatorCard: CityArtist | null;
};

export function getPulseState(pulse: number): CityPulseTrack['pulseState'] {
  if (pulse >= 92) return 'Viral potentiel';
  if (pulse >= 78) return 'En feu';
  if (pulse >= 60) return 'Ca chauffe';
  if (pulse >= 38) return 'Ca demarre';
  return 'Calme';
}

export function getArtistLevel(xp: number) {
  const safeXp = Math.max(0, Math.round(xp || 0));
  const levels = [
    { level: 1, name: 'Nouveau createur', min: 0, next: 300 },
    { level: 2, name: 'Createur actif', min: 300, next: 900 },
    { level: 3, name: 'Talent montant', min: 900, next: 2200 },
    { level: 4, name: 'Artiste Pulse', min: 2200, next: 5000 },
    { level: 5, name: 'Icone Synaura', min: 5000, next: 8000 },
  ];
  const current = [...levels].reverse().find((entry) => safeXp >= entry.min) || levels[0];
  return { level: current.level, levelName: current.name, xp: safeXp, nextLevelXp: current.next };
}

export function stableNumber(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}
