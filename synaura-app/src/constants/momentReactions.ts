import { Ionicons } from '@expo/vector-icons';
import type { MomentReactionType } from '@/api/types';

export type ReactionMeta = {
  type: MomentReactionType;
  label: string;
  shortLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export const MOMENT_REACTIONS: ReactionMeta[] = [
  { type: 'drop', label: 'Drop incroyable', shortLabel: 'Drop', icon: 'flame', color: '#D96D63' },
  { type: 'emotional', label: 'Passage émotionnel', shortLabel: 'Émotion', icon: 'water', color: '#4A9EAA' },
  { type: 'mindblown', label: 'Moment fou', shortLabel: 'Fou', icon: 'sparkles', color: '#7357C6' },
  { type: 'favorite', label: 'Passage préféré', shortLabel: 'Favori', icon: 'heart', color: '#7357C6' },
  { type: 'vocals', label: 'Voix / punchline', shortLabel: 'Voix', icon: 'mic', color: '#D96D63' },
  { type: 'production', label: 'Production', shortLabel: 'Prod', icon: 'headset', color: '#4A9EAA' },
];
