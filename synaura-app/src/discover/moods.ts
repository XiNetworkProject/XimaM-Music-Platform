import type { Track } from '@/api/types';

// Miroir mobile de lib/discoverMoods.ts. Les cartes utilisent uniquement les
// genres, tags et métadonnées réels des morceaux reçus par l'API Discover.

export type MoodId = 'night' | 'drive' | 'club' | 'focus' | 'bittersweet' | 'rap' | 'electro' | 'ai';

export type MoodConfig = {
  id: MoodId;
  label: string;
  promise: string;
  icon: string;
  keywords: string[];
  isAiOnly?: boolean;
  gradient: [string, string];
};

export const DISCOVER_MOODS: MoodConfig[] = [
  {
    id: 'night',
    label: 'Nuit & nostalgie',
    promise: 'Sons feutrés pour les heures tardives.',
    icon: 'moon-outline',
    keywords: ['lo-fi', 'lofi', 'ambient', 'soul', 'r&b', 'rnb', 'nostalgie', 'nostalgic', 'chill', 'dream', 'synthwave'],
    gradient: ['#171313', '#4A3A63'],
  },
  {
    id: 'drive',
    label: 'Route de nuit',
    promise: 'Le tempo parfait pour rouler tard.',
    icon: 'car-sport-outline',
    keywords: ['synthwave', 'electronic', 'indie', 'rock', 'city pop', 'cyberpunk', 'driving', 'night drive'],
    gradient: ['#171313', '#2F5E67'],
  },
  {
    id: 'club',
    label: 'Club & énergie',
    promise: 'Basses et énergie pour monter le son.',
    icon: 'flash-outline',
    keywords: ['electronic', 'house', 'techno', 'dance', 'edm', 'hip-hop', 'club', 'energy'],
    gradient: ['#171313', '#8A3A34'],
  },
  {
    id: 'focus',
    label: 'Calme / concentration',
    promise: 'Fond sonore pour se concentrer.',
    icon: 'leaf-outline',
    keywords: ['ambient', 'lo-fi', 'lofi', 'classical', 'jazz', 'instrumental', 'focus', 'calm', 'piano'],
    gradient: ['#111111', '#4A9EAA'],
  },
  {
    id: 'bittersweet',
    label: 'Triste mais beau',
    promise: 'Mélancolie soignée, sans artifice.',
    icon: 'rainy-outline',
    keywords: ['soul', 'r&b', 'rnb', 'piano', 'ballad', 'acoustic', 'sad', 'melancolie', 'mélancolie', 'indie'],
    gradient: ['#171313', '#6B4F73'],
  },
  {
    id: 'rap',
    label: 'Rap & écriture',
    promise: 'Plumes affûtées et flows travaillés.',
    icon: 'mic-outline',
    keywords: ['rap', 'hip-hop', 'boom bap', 'ecriture', 'écriture', 'lyrics'],
    gradient: ['#171313', '#7A3B33'],
  },
  {
    id: 'electro',
    label: 'Électro émergente',
    promise: 'Les sons électro encore peu écoutés.',
    icon: 'pulse-outline',
    keywords: ['electronic', 'techno', 'house', 'edm', 'synth', 'indie electronic'],
    gradient: ['#171313', '#5B3F8C'],
  },
  {
    id: 'ai',
    label: 'Créations IA',
    promise: 'Générées par IA, publiées par de vrais créateurs.',
    icon: 'sparkles-outline',
    keywords: [],
    isAiOnly: true,
    gradient: ['#171313', '#7357C6'],
  },
];

export function getMoodById(id: string | null | undefined): MoodConfig | null {
  return DISCOVER_MOODS.find((mood) => mood.id === id) || null;
}

export function matchesMoodKeywords(track: Track, mood: MoodConfig): boolean {
  if (mood.isAiOnly) return Boolean(track.isAI || track._id.startsWith('ai-'));
  if (!mood.keywords.length) return true;
  const haystack = [...(track.genre || []), ...(track.tags || []), track.style || '']
    .filter(Boolean)
    .map((value) => String(value).toLocaleLowerCase('fr'));
  return haystack.some((value) => mood.keywords.some((keyword) => value.includes(keyword)));
}
