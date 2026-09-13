/** New-generation capabilities from SunoAPI's V6 contract (September 2026).
 * Historical track model names are data: never normalize them in storage.
 */
export const CURRENT_SUNO_MODELS = [
  { id: 'V6', label: 'V6', description: 'Le modèle standard, pour toutes vos créations.', minPlan: 'starter' },
  { id: 'V6_WILD', label: 'V6 Wild', description: 'Une approche plus expérimentale.', minPlan: 'starter' },
  { id: 'V6_MINI', label: 'V6 Mini', description: 'La variante légère, accessible à tous.', minPlan: 'free' },
] as const;

export type CurrentSunoModel = (typeof CURRENT_SUNO_MODELS)[number]['id'];
export const DEFAULT_SUNO_MODEL: CurrentSunoModel = 'V6';

export const SUNO_GENERATION_LIMITS = {
  simplePrompt: 3000,
  coverSimplePrompt: 500,
  prompt: 5000,
  style: 1000,
  // Provider prose says 80, its schema says 100. Use their common safe limit.
  title: 80,
  minDuration: 10,
  maxDuration: 360,
} as const;

export function isCurrentSunoModel(value: unknown): value is CurrentSunoModel {
  return typeof value === 'string' && CURRENT_SUNO_MODELS.some((model) => model.id === value);
}

/** For new requests, restored drafts and re-use only — not history labels. */
export function normalizeGenerationModel(value: unknown, allowed?: readonly string[]): CurrentSunoModel {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : '';
  const permitted = allowed?.filter(isCurrentSunoModel);
  const choices: readonly CurrentSunoModel[] = permitted?.length ? permitted : [DEFAULT_SUNO_MODEL];
  if (isCurrentSunoModel(candidate) && (!allowed || choices.includes(candidate))) return candidate;
  return choices.includes(DEFAULT_SUNO_MODEL) ? DEFAULT_SUNO_MODEL : choices[0];
}

/** Display helper preserves unknown/legacy identity instead of relabelling it V6. */
export function getSunoModelLabel(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'Modèle non renseigné';
  const current = CURRENT_SUNO_MODELS.find((model) => model.id === value);
  if (current) return current.label;
  const legacy: Record<string, string> = {
    V4: 'V4', V4_5: 'V4.5', V4_5PLUS: 'V4.5+', V4_5ALL: 'V4.5 All',
    V5: 'V5', V5_5: 'V5.5',
  };
  return legacy[value] || value;
}
