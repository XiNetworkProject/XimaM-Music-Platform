// Miroir mobile de lib/discoverMoods.ts (web). Mêmes ambiances, mêmes textes.

export type MoodId = 'night' | 'drive' | 'club' | 'focus' | 'bittersweet' | 'rap' | 'electro' | 'ai';

export type MoodConfig = {
  id: MoodId;
  label: string;
  promise: string;
  icon: string;
  gradient: [string, string];
};

export const DISCOVER_MOODS: MoodConfig[] = [
  { id: 'night', label: 'Nuit & nostalgie', promise: 'Sons feutrés pour les heures tardives.', icon: 'moon-outline', gradient: ['#171313', '#4A3A63'] },
  { id: 'drive', label: 'Route de nuit', promise: 'Le tempo parfait pour rouler tard.', icon: 'car-sport-outline', gradient: ['#171313', '#2F5E67'] },
  { id: 'club', label: 'Club & énergie', promise: 'Basses et énergie pour monter le son.', icon: 'flash-outline', gradient: ['#171313', '#8A3A34'] },
  { id: 'focus', label: 'Calme / concentration', promise: 'Fond sonore pour se concentrer.', icon: 'leaf-outline', gradient: ['#F7F6F3', '#4A9EAA'] },
  { id: 'bittersweet', label: 'Triste mais beau', promise: 'Mélancolie soignée, sans artifice.', icon: 'rainy-outline', gradient: ['#171313', '#6B4F73'] },
  { id: 'rap', label: 'Rap & écriture', promise: 'Plumes affûtées et flows travaillés.', icon: 'mic-outline', gradient: ['#171313', '#7A3B33'] },
  { id: 'electro', label: 'Électro émergente', promise: 'Les sons électro encore peu écoutés.', icon: 'pulse-outline', gradient: ['#171313', '#5B3F8C'] },
  { id: 'ai', label: 'Créations IA', promise: 'Générées par IA, publiées par de vrais créateurs.', icon: 'sparkles-outline', gradient: ['#171313', '#7357C6'] },
];

export function getMoodById(id: string | null | undefined): MoodConfig | null {
  return DISCOVER_MOODS.find((mood) => mood.id === id) || null;
}
