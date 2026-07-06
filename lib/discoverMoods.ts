// Ambiances de "Découvrir" : des filtres réels sur les genres / tags / mood déjà
// stockés sur les morceaux (colonne genre, ou data.tags / data.mood quand présents).
// Aucune ambiance ne fabrique de contenu : si rien ne correspond, l'UI affiche un
// état honnête ("Pas encore assez de morceaux pour cette ambiance").

export type MoodId = 'night' | 'drive' | 'club' | 'focus' | 'bittersweet' | 'rap' | 'electro' | 'ai';

export type MoodConfig = {
  id: MoodId;
  label: string;
  promise: string;
  /** Mots-clés comparés (en minuscules) à genre[], data.tags[] et data.mood. */
  keywords: string[];
  /** true = ne filtre pas par mot-clé, sélectionne les créations IA réelles (ai_tracks). */
  isAiOnly?: boolean;
  /** Dégradé premium sans néon, construit sur la palette Synaura + noir profond. */
  gradient: [string, string];
};

export const DISCOVER_MOODS: MoodConfig[] = [
  {
    id: 'night',
    label: 'Nuit & nostalgie',
    promise: 'Sons feutrés pour les heures tardives.',
    keywords: ['lo-fi', 'lofi', 'ambient', 'soul', 'r&b', 'rnb', 'nostalgie', 'nostalgic', 'chill', 'dream', 'synthwave'],
    gradient: ['#171313', '#4A3A63'],
  },
  {
    id: 'drive',
    label: 'Route de nuit',
    promise: 'Le tempo parfait pour rouler tard.',
    keywords: ['synthwave', 'electronic', 'indie', 'rock', 'city pop', 'cyberpunk', 'driving', 'night drive'],
    gradient: ['#171313', '#2F5E67'],
  },
  {
    id: 'club',
    label: 'Club & énergie',
    promise: 'Basses et énergie pour monter le son.',
    keywords: ['electronic', 'house', 'techno', 'dance', 'edm', 'hip-hop', 'club', 'energy'],
    gradient: ['#171313', '#8A3A34'],
  },
  {
    id: 'focus',
    label: 'Calme / concentration',
    promise: 'Fond sonore pour se concentrer.',
    keywords: ['ambient', 'lo-fi', 'lofi', 'classical', 'jazz', 'instrumental', 'focus', 'calm', 'piano'],
    gradient: ['#F7F6F3', '#4A9EAA'],
  },
  {
    id: 'bittersweet',
    label: 'Triste mais beau',
    promise: 'Mélancolie soignée, sans artifice.',
    keywords: ['soul', 'r&b', 'rnb', 'piano', 'ballad', 'acoustic', 'sad', 'melancolie', 'mélancolie', 'indie'],
    gradient: ['#171313', '#6B4F73'],
  },
  {
    id: 'rap',
    label: 'Rap & écriture',
    promise: 'Plumes affûtées et flows travaillés.',
    keywords: ['rap', 'hip-hop', 'boom bap', 'ecriture', 'écriture', 'lyrics'],
    gradient: ['#171313', '#7A3B33'],
  },
  {
    id: 'electro',
    label: 'Électro émergente',
    promise: 'Les sons électro encore peu écoutés.',
    keywords: ['electronic', 'techno', 'house', 'edm', 'synth', 'indie electronic'],
    gradient: ['#171313', '#5B3F8C'],
  },
  {
    id: 'ai',
    label: 'Créations IA',
    promise: 'Générées par IA, publiées par de vrais créateurs.',
    keywords: [],
    isAiOnly: true,
    gradient: ['#171313', '#7357C6'],
  },
];

export function getMoodById(id: string | null | undefined): MoodConfig | null {
  return DISCOVER_MOODS.find((mood) => mood.id === id) || null;
}

/** Match pur (réutilisé par l'API et par la page serveur pour les covers d'aperçu). */
export function matchesMoodKeywords(
  track: { genre?: string[] | null; data?: { tags?: string[]; mood?: string } | null },
  mood: MoodConfig,
): boolean {
  if (!mood.keywords.length) return true;
  const genres = Array.isArray(track.genre) ? track.genre.map((g) => String(g).toLowerCase()) : [];
  const tags = Array.isArray(track.data?.tags) ? track.data!.tags!.map((t) => String(t).toLowerCase()) : [];
  const trackMood = typeof track.data?.mood === 'string' ? [track.data.mood.toLowerCase()] : [];
  const haystack = [...genres, ...tags, ...trackMood];
  return haystack.some((value) => mood.keywords.some((keyword) => value.includes(keyword)));
}
