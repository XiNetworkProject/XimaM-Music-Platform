// Options de l'onboarding V1 ("personnaliser mon experience"). Reutilise
// exactement les ambiances de Decouvrir (lib/discoverMoods.ts) et des genres
// deja references dans lib/genres.ts : aucune categorie n'est inventee ici.
// Miroir mobile : synaura-app/src/onboarding/options.ts (memes ids, memes libelles).

import { DISCOVER_MOODS, type MoodId } from './discoverMoods';

export type OnboardingUniverseId = 'pop' | 'rap' | 'electro' | 'club' | 'night' | 'focus' | 'rock' | 'ai';

export type OnboardingUniverseOption = {
  id: OnboardingUniverseId;
  label: string;
  /** Ambiance Decouvrir reutilisee telle quelle (meme id que DISCOVER_MOODS). */
  moodId?: MoodId;
  /** Genres reutilises tels quels (memes chaines que lib/genres.ts). */
  genres?: string[];
};

export const ONBOARDING_UNIVERSES: OnboardingUniverseOption[] = [
  { id: 'pop', label: 'Pop', genres: ['Pop'] },
  { id: 'rap', label: 'Rap & écriture', moodId: 'rap' },
  { id: 'electro', label: 'Électro', moodId: 'electro' },
  { id: 'club', label: 'Club & énergie', moodId: 'club' },
  { id: 'night', label: 'Nuit & nostalgie', moodId: 'night' },
  { id: 'focus', label: 'Calme / concentration', moodId: 'focus' },
  { id: 'rock', label: 'Rock / alternatif', genres: ['Rock'] },
  { id: 'ai', label: 'Créations IA', moodId: 'ai' },
];

export type CreatorIntentionId = 'discover' | 'follow' | 'create_ai' | 'publish' | 'clips' | 'remix' | 'collab';

export const CREATOR_INTENTIONS: { id: CreatorIntentionId; label: string }[] = [
  { id: 'discover', label: 'Découvrir de nouveaux sons' },
  { id: 'follow', label: 'Suivre des artistes' },
  { id: 'create_ai', label: "Créer avec l'IA" },
  { id: 'publish', label: 'Publier mes morceaux' },
  { id: 'clips', label: 'Faire des Clips' },
  { id: 'remix', label: 'Participer à des remixes' },
  { id: 'collab', label: 'Trouver des collaborations' },
];

export type OnboardingPreferences = {
  onboardingCompleted: boolean;
  favoriteMoods: MoodId[];
  favoriteGenres: string[];
  creatorIntentions: CreatorIntentionId[];
  completedAt: string | null;
};

export const EMPTY_ONBOARDING_PREFERENCES: OnboardingPreferences = {
  onboardingCompleted: false,
  favoriteMoods: [],
  favoriteGenres: [],
  creatorIntentions: [],
  completedAt: null,
};

export function getUniverseOption(id: string): OnboardingUniverseOption | null {
  return ONBOARDING_UNIVERSES.find((item) => item.id === id) || null;
}

/** Deduit favoriteMoods / favoriteGenres a partir des univers coches (ecran 2). */
export function deriveTasteFromUniverses(universeIds: string[]): { favoriteMoods: MoodId[]; favoriteGenres: string[] } {
  const favoriteMoods: MoodId[] = [];
  const favoriteGenres: string[] = [];
  for (const id of universeIds) {
    const option = getUniverseOption(id);
    if (!option) continue;
    if (option.moodId && !favoriteMoods.includes(option.moodId)) favoriteMoods.push(option.moodId);
    for (const genre of option.genres || []) {
      if (!favoriteGenres.includes(genre)) favoriteGenres.push(genre);
    }
  }
  return { favoriteMoods, favoriteGenres };
}

/** Univers coches equivalents a un ensemble favoriteMoods/favoriteGenres (mode edition). */
export function universeIdsFromTaste(favoriteMoods: string[], favoriteGenres: string[]): OnboardingUniverseId[] {
  const moods = new Set(favoriteMoods);
  const genres = new Set(favoriteGenres);
  return ONBOARDING_UNIVERSES
    .filter((option) => (option.moodId && moods.has(option.moodId)) || (option.genres || []).some((g) => genres.has(g)))
    .map((option) => option.id);
}

export function parseOnboardingPreferences(raw: unknown): OnboardingPreferences {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const validMoodIds = new Set(DISCOVER_MOODS.map((m) => m.id));
  const validIntentionIds = new Set(CREATOR_INTENTIONS.map((c) => c.id));
  return {
    onboardingCompleted: Boolean(value.onboardingCompleted),
    favoriteMoods: Array.isArray(value.favoriteMoods)
      ? (value.favoriteMoods as unknown[]).map(String).filter((id): id is MoodId => validMoodIds.has(id as MoodId))
      : [],
    favoriteGenres: Array.isArray(value.favoriteGenres) ? (value.favoriteGenres as unknown[]).map(String).filter(Boolean) : [],
    creatorIntentions: Array.isArray(value.creatorIntentions)
      ? (value.creatorIntentions as unknown[]).map(String).filter((id): id is CreatorIntentionId => validIntentionIds.has(id as CreatorIntentionId))
      : [],
    completedAt: typeof value.completedAt === 'string' ? value.completedAt : null,
  };
}
