// Réactions rapides prédéfinies sur un instant précis d'un morceau. Un seul
// point de vérité (type + emoji + libellé + teinte de marque) partagé par l'API,
// le hook et l'UI (picker + marqueurs waveform).

export type MomentReactionType = 'drop' | 'emotional' | 'mindblown' | 'favorite' | 'vocals' | 'production';

export const MOMENT_REACTION_TYPES: MomentReactionType[] = [
  'drop',
  'emotional',
  'mindblown',
  'favorite',
  'vocals',
  'production',
];

export const MOMENT_REACTION_META: Record<MomentReactionType, { emoji: string; label: string; color: string }> = {
  drop: { emoji: '🔥', label: 'Drop incroyable', color: '#D96D63' },
  emotional: { emoji: '😭', label: 'Passage émotionnel', color: '#4A9EAA' },
  mindblown: { emoji: '🤯', label: 'Moment fou', color: '#7357C6' },
  favorite: { emoji: '💜', label: 'Passage préféré', color: '#7357C6' },
  vocals: { emoji: '🎤', label: 'Voix / punchline', color: '#D96D63' },
  production: { emoji: '🎧', label: 'Production', color: '#4A9EAA' },
};

export function isMomentReactionType(value: unknown): value is MomentReactionType {
  return typeof value === 'string' && (MOMENT_REACTION_TYPES as string[]).includes(value);
}
