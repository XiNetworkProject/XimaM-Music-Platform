import { normalizeGenerationModel, SUNO_GENERATION_LIMITS } from './sunoModels';

export function restoreGeneratorDuration(value: unknown): number {
  const duration = Number(value);
  return Number.isFinite(duration) && duration >= SUNO_GENERATION_LIMITS.minDuration && duration <= SUNO_GENERATION_LIMITS.maxDuration
    ? Math.round(duration)
    : 120;
}

type GeneratorPayloadInput = {
  model: unknown;
  allowedModels: readonly string[];
  customMode: boolean;
  instrumental: boolean;
  description: string;
  title: string;
  style: string;
  lyrics: string;
  selectedTags: string[];
  remixPrompt?: string;
  duration?: number;
  styleInfluence: number;
  weirdness: number;
  audioWeight: number;
  variety?: number;
  negativeTags: string;
  vocalGender: string;
  uploadUrl?: string | null;
  sourceDurationSec?: number;
};

function assertLength(value: string, max: number, label: string) {
  if (value.length > max) throw new Error(`${label} : ${max} caractères maximum (${value.length} actuellement).`);
}

function weight(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 50))) / 100;
}

function withSelectedTags(text: string, tags: readonly string[], extra?: string) {
  // Tag chips can already have inserted their value into the editor. Preserve that
  // text verbatim and append only additional tags, so limits count each tag once.
  const present = new Set(text.split(/[,\n]/).map((part) => part.trim().toLowerCase()));
  const additional = tags.filter((tag) => {
    const key = tag.trim().toLowerCase();
    if (!key || present.has(key)) return false;
    present.add(key);
    return true;
  });
  return [text, ...additional, extra].filter(Boolean).join(', ');
}

export function buildSunoGeneratorPayload(input: GeneratorPayloadInput): Record<string, unknown> {
  const customMode = Boolean(input.customMode || input.uploadUrl);
  const payload: Record<string, unknown> = {
    customMode,
    instrumental: input.instrumental,
    model: normalizeGenerationModel(input.model, input.allowedModels),
  };
  if (input.uploadUrl) {
    payload.uploadUrl = input.uploadUrl;
    payload.sourceDurationSec = input.sourceDurationSec;
  }

  if (customMode) {
    const style = withSelectedTags(input.style, input.selectedTags, input.remixPrompt);
    const title = input.title.trim() ? input.title : input.uploadUrl ? 'Remix' : '';
    // Generate V6 accepts lyrics alone; upload-cover retains its separate contract.
    if (input.uploadUrl && !style.trim()) throw new Error('Ajoute une direction musicale pour la reprise.');
    if (input.uploadUrl && !input.instrumental && !input.lyrics.trim()) throw new Error('Ajoute des paroles ou active Instrumental pour la reprise.');
    if (!style.trim() && !(input.instrumental ? '' : input.lyrics.trim()) && !input.negativeTags.trim()) throw new Error('Ajoute des paroles, un style ou des styles à exclure.');
    assertLength(style, SUNO_GENERATION_LIMITS.style, 'Direction musicale et tags');
    assertLength(title, SUNO_GENERATION_LIMITS.title, 'Titre');
    if (!input.instrumental) assertLength(input.lyrics, SUNO_GENERATION_LIMITS.prompt, 'Paroles');
    assertLength(input.negativeTags, 1000, 'Styles à exclure');
    if (input.duration != null && (!Number.isFinite(input.duration) || input.duration < SUNO_GENERATION_LIMITS.minDuration || input.duration > SUNO_GENERATION_LIMITS.maxDuration)) {
      throw new Error(`Choisis une durée entre ${SUNO_GENERATION_LIMITS.minDuration} et ${SUNO_GENERATION_LIMITS.maxDuration} secondes.`);
    }
    Object.assign(payload, {
      title: title || undefined,
      style,
      prompt: input.instrumental ? undefined : input.lyrics,
      duration: input.duration == null ? undefined : Math.round(input.duration),
      styleWeight: weight(input.styleInfluence),
      weirdnessConstraint: weight(input.weirdness),
      audioWeight: input.instrumental && !input.uploadUrl ? undefined : weight(input.audioWeight),
      ...(input.variety != null ? { variety: input.variety } : {}),
      negativeTags: input.negativeTags || undefined,
      vocalGender: input.vocalGender || undefined,
    });
  } else {
    if (!input.description.trim()) throw new Error('Décris la musique que tu souhaites créer.');
    const prompt = withSelectedTags(input.description, input.selectedTags, input.remixPrompt);
    assertLength(prompt, SUNO_GENERATION_LIMITS.simplePrompt, 'Description et tags');
    payload.prompt = prompt;
  }
  return payload;
}
