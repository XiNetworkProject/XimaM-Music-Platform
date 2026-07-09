export type RemixType =
  | 'faster'
  | 'slower'
  | 'melancholic'
  | 'electro'
  | 'acoustic'
  | 'instrumental'
  | 'mood_shift'
  | 'keep_lyrics'
  | 'sequel'
  | 'short_extract';

export type RemixPromptVisibility = 'private' | 'public';

export type RemixTypeOption = {
  id: RemixType;
  label: string;
  shortLabel: string;
  prompt: string;
};

export const DEFAULT_REMIX_TYPE: RemixType = 'mood_shift';
export const DEFAULT_REMIX_PROMPT_VISIBILITY: RemixPromptVisibility = 'private';

export const REMIX_TYPE_OPTIONS: RemixTypeOption[] = [
  {
    id: 'faster',
    label: 'Version plus rapide',
    shortLabel: 'Plus rapide',
    prompt: 'Augmente legerement le tempo, garde une energie propre et preserve une structure musicale lisible.',
  },
  {
    id: 'slower',
    label: 'Version plus lente',
    shortLabel: 'Plus lente',
    prompt: 'Ralentis la sensation generale, laisse respirer les arrangements et rends le morceau plus ample.',
  },
  {
    id: 'melancholic',
    label: 'Version triste',
    shortLabel: 'Triste',
    prompt: 'Transforme l ambiance vers une couleur plus intime, douce et melancolique, sans rendre le rendu fragile.',
  },
  {
    id: 'electro',
    label: 'Version electro',
    shortLabel: 'Electro',
    prompt: 'Recompose la direction avec une production electro moderne, basse ronde, batterie nette et textures chaleureuses.',
  },
  {
    id: 'acoustic',
    label: 'Version acoustique',
    shortLabel: 'Acoustique',
    prompt: 'Reduis la production vers une version acoustique, organique et proche de l interpretation.',
  },
  {
    id: 'instrumental',
    label: 'Instrumentale',
    shortLabel: 'Instrumentale',
    prompt: 'Cree une version instrumentale centree sur la melodie, les harmonies et le groove, sans voix principale.',
  },
  {
    id: 'mood_shift',
    label: "Changer l'ambiance",
    shortLabel: 'Ambiance',
    prompt: 'Change l ambiance generale en gardant une filiation claire avec le morceau source et une identite originale.',
  },
  {
    id: 'keep_lyrics',
    label: 'Garder les paroles',
    shortLabel: 'Paroles',
    prompt: 'Garde l intention des paroles et change surtout le style, les instruments et la production.',
  },
  {
    id: 'sequel',
    label: 'Generer une suite',
    shortLabel: 'Suite',
    prompt: 'Imagine une suite naturelle au morceau, comme un nouveau chapitre, sans copier le refrain ni la melodie.',
  },
  {
    id: 'short_extract',
    label: 'Extrait court',
    shortLabel: 'Extrait',
    prompt: 'Cree un extrait court, direct et memorisable, pense pour une ecoute rapide.',
  },
];

const VALID_REMIX_TYPES = new Set(REMIX_TYPE_OPTIONS.map((option) => option.id));

export function sanitizeRemixType(value: unknown): RemixType {
  const raw = typeof value === 'string' ? value.trim() : '';
  return VALID_REMIX_TYPES.has(raw as RemixType) ? (raw as RemixType) : DEFAULT_REMIX_TYPE;
}

export function getRemixTypeOption(value: unknown): RemixTypeOption {
  const remixType = sanitizeRemixType(value);
  return REMIX_TYPE_OPTIONS.find((option) => option.id === remixType) || REMIX_TYPE_OPTIONS[0];
}

export function sanitizeRemixPrompt(value: unknown, maxLength = 1200): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw.slice(0, maxLength);
}

export function sanitizeRemixPromptVisibility(value: unknown): RemixPromptVisibility {
  return value === 'public' ? 'public' : DEFAULT_REMIX_PROMPT_VISIBILITY;
}

export function buildRemixPrompt(input: {
  remixType: unknown;
  userPrompt?: unknown;
  sourceTitle?: string | null;
}) {
  const option = getRemixTypeOption(input.remixType);
  const userPrompt = sanitizeRemixPrompt(input.userPrompt);
  const source = input.sourceTitle ? `Source: "${input.sourceTitle}". ` : '';
  const custom = userPrompt ? ` Direction utilisateur: ${userPrompt}.` : '';
  return `${option.label}. ${source}${option.prompt}${custom} Cree une variation originale, creditee, sans copier directement l audio, les stems ou les fichiers prives.`;
}
