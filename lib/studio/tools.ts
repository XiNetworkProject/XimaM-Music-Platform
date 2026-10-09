import { STUDIO_TARIFFS, STUDIO_PRICING_POLICY, accessibleStudioPrices, studioTariffReady } from './pricing.ts';
/** Public catalogue. Prices still require explicit release configuration. */
export const STUDIO_TOOLS = [
  { id: 'extend', label: 'Prolonger', hint: 'Continuer un morceau à partir du point choisi.', group: 'Transformer', suggestedCredits: STUDIO_TARIFFS.extend, music: true },
  { id: 'replace', label: 'Remplacer un passage', hint: 'Réécrire au moins 10 secondes sans écraser l’original.', group: 'Transformer', suggestedCredits: STUDIO_TARIFFS.replace, music: true },
  { id: 'vocals', label: 'Ajouter une voix', hint: 'Poser des paroles sur votre instrumental.', group: 'Transformer', suggestedCredits: STUDIO_TARIFFS.vocals, music: true },
  { id: 'instrumental', label: 'Accompagner une voix', hint: 'Créer un arrangement autour de votre voix.', group: 'Transformer', suggestedCredits: STUDIO_TARIFFS.instrumental, music: true },
  { id: 'mashup', label: 'Mashup', hint: 'Croiser deux de vos morceaux dans une nouvelle version.', group: 'Transformer', suggestedCredits: STUDIO_TARIFFS.mashup, music: true },
  { id: 'sounds', label: 'Boucles & effets', hint: 'Une boucle, une texture ou un effet sonore.', group: 'Imaginer', suggestedCredits: STUDIO_TARIFFS.sounds, music: true },
  { id: 'style', label: 'Affiner un style', hint: 'Développer une direction musicale à réutiliser.', group: 'Imaginer', suggestedCredits: STUDIO_TARIFFS.style, music: false },
  { id: 'persona', label: 'Créer une Persona', hint: 'Retrouver l’identité musicale d’un de vos morceaux.', group: 'Imaginer', suggestedCredits: STUDIO_TARIFFS.persona, music: false },
  { id: 'stems', label: 'Voix / instrumental', hint: 'Séparer le chant et son accompagnement.', group: 'Exporter', suggestedCredits: STUDIO_TARIFFS.stems, music: false },
  { id: 'stems_multi', label: 'Toutes les pistes', hint: 'Récupérer les instruments séparément.', group: 'Exporter', suggestedCredits: STUDIO_TARIFFS.stems_multi, music: false },
  { id: 'stems_instrument', label: 'Isoler un instrument', hint: 'Extraire une piste instrumentale précise.', group: 'Exporter', suggestedCredits: STUDIO_TARIFFS.stems_instrument, music: false },
  { id: 'wav', label: 'Exporter en WAV', hint: 'Récupérer le fichier WAV fourni par Suno.', group: 'Exporter', suggestedCredits: STUDIO_TARIFFS.wav, music: false },
  { id: 'midi', label: 'Transcrire en MIDI', hint: 'Exporter les notes après une séparation de pistes.', group: 'Exporter', suggestedCredits: STUDIO_TARIFFS.midi, music: false },
  { id: 'cover', label: 'Pochettes', hint: 'Créer des propositions sans changer votre pochette actuelle.', group: 'Imaginer', suggestedCredits: STUDIO_TARIFFS.cover, music: false },
  { id: 'recovery', label: 'Récupérer un audio', hint: 'Demander un nouveau lien pour un ancien morceau Suno.', group: 'Exporter', suggestedCredits: STUDIO_TARIFFS.recovery, music: false },
] as const;
export type StudioTool = typeof STUDIO_TOOLS[number]['id'];
export type StudioJobState = 'submitting' | 'pending' | 'uncertain' | 'completed' | 'failed';
export type StudioAsset = { label: string; url: string; kind: 'audio' | 'image' | 'file'; providerAudioId?: string; trackId?: string; duration?: number; imageUrl?: string };
export type StudioResult = { assets: StudioAsset[]; text?: string; personaId?: string; midi?: MidiInstrument[]; warning?: string };
export type MidiInstrument = { name: string; notes: { pitch: number; start: number; end: number; velocity: number }[] };
export type StudioJobView = { id: string; action: StudioTool; status: StudioJobState; title: string; credits: number; refunded: boolean; createdAt: string; result: StudioResult; message?: string; sourceIds?: string[]; workspace?: string };
export type StudioToolInput = {
  action: StudioTool; sourceId?: string; secondSourceId?: string; stemJobId?: string;
  model?: string; title?: string; style?: string; lyrics?: string; fullLyrics?: string;
  negativeTags?: string; start?: number; end?: number; instrumental?: boolean;
  variety?: number; stemName?: string; prompt?: string; loop?: boolean; tempo?: number;
  key?: string; description?: string; personaJobId?: string; workspace?: string;
};
export const STUDIO_GROUPS = ['Transformer', 'Imaginer', 'Exporter'] as const;
export const STUDIO_KEYS = ['Any', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];
export const STUDIO_STEMS = ['Lead Vocal', 'Drum Kit', 'Kick', 'Snare', 'Bass', 'Backing Vocals', 'Piano', 'Electric Guitar', 'Percussion', 'String Section', 'Synth', 'Acoustic Guitar', 'Sound Effects', 'Synth Pad', 'Guitar', 'Brass Section', 'Organ', 'Electric Piano', 'Violin', 'Flute', 'Choir', 'Saxophone', 'Cello', 'Ukulele', '808', 'Hi-Hat'];
export function isStudioTool(value: unknown): value is StudioTool { return STUDIO_TOOLS.some(tool => tool.id === value); }
export function toolNeedsSource(action: StudioTool) { return !['sounds', 'style', 'midi'].includes(action); }
export class StudioInputError extends Error {}
export function parseStudioInput(value: unknown): StudioToolInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StudioInputError('Paramètres invalides.');
  const raw = value as Record<string, unknown>;
  if (!isStudioTool(raw.action)) throw new StudioInputError('Outil inconnu.');
  const out: StudioToolInput = { action: raw.action };
  for (const [key, max] of Object.entries({ sourceId: 255, secondSourceId: 255, stemJobId: 36, personaJobId: 36, model: 20, title: 80, style: 1000, lyrics: 5000, fullLyrics: 5000, negativeTags: 1000, stemName: 80, prompt: 500, key: 8, description: 1000, workspace: 120 })) {
    if (raw[key] == null) continue;
    if (typeof raw[key] !== 'string' || raw[key].length > max) throw new StudioInputError(`Champ ${key} invalide (maximum ${max}).`);
    (out as any)[key] = raw[key];
  }
  for (const key of ['start', 'end', 'tempo', 'variety'] as const) {
    if (raw[key] == null) continue;
    if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key]) || raw[key] < 0) throw new StudioInputError('Valeur numérique invalide.');
    out[key] = raw[key];
  }
  for (const key of ['instrumental', 'loop'] as const) {
    if (raw[key] == null) continue;
    if (typeof raw[key] !== 'boolean') throw new StudioInputError('Option invalide.');
    out[key] = raw[key];
  }
  if (out.variety != null && (!Number.isInteger(out.variety) || out.variety > 4)) throw new StudioInputError('La variété doit être comprise entre 0 et 4.');
  if (out.tempo != null && (!Number.isInteger(out.tempo) || out.tempo < 1 || out.tempo > 300)) throw new StudioInputError('Tempo attendu entre 1 et 300 BPM.');
  if (out.key && !STUDIO_KEYS.includes(out.key)) throw new StudioInputError('Tonalité inconnue.');
  if (toolNeedsSource(out.action) && !out.sourceId) throw new StudioInputError('Choisissez un morceau source.');
  if (out.action === 'mashup' && (!out.secondSourceId || out.secondSourceId === out.sourceId)) throw new StudioInputError('Choisissez deux morceaux différents.');
  if (out.action === 'midi' && !out.stemJobId) throw new StudioInputError('Séparez d’abord les pistes du morceau.');
  if (out.action === 'stems_instrument' && !STUDIO_STEMS.includes(out.stemName || '')) throw new StudioInputError('Choisissez un instrument.');
  if (['sounds', 'style'].includes(out.action) && !out.prompt?.trim()) throw new StudioInputError('Décrivez votre idée.');
  if (['replace', 'vocals', 'instrumental', 'persona'].includes(out.action) && !out.title?.trim()) throw new StudioInputError('Donnez un titre.');
  if (['replace', 'vocals', 'instrumental'].includes(out.action) && !out.style?.trim()) throw new StudioInputError('Précisez la direction musicale.');
  if (['replace', 'vocals'].includes(out.action) && !out.lyrics?.trim()) throw new StudioInputError('Ajoutez les paroles.');
  if (out.action === 'replace' && !out.fullLyrics?.trim()) throw new StudioInputError('Ajoutez aussi les paroles complètes.');
  if (out.action === 'persona' && !out.description?.trim()) throw new StudioInputError('Décrivez cette Persona.');
  return out;
}

/** No implicit price fallback: environment approval is an explicit release step. */
export function approvedToolPrices(env: Record<string, string | undefined>): Partial<Record<StudioTool, number>> {
  if (env.STUDIO_TOOLS_ENABLED !== 'true') return {};
  try {
    // Explicit legacy/custom approval wins; malformed approval never falls back.
    const raw = env.STUDIO_TOOLS_APPROVED_PRICES_JSON !== undefined
      ? JSON.parse(env.STUDIO_TOOLS_APPROVED_PRICES_JSON)
      : env.STUDIO_TOOLS_PRICING_POLICY === STUDIO_PRICING_POLICY ? accessibleStudioPrices() : {};
    return Object.fromEntries(STUDIO_TOOLS.filter(tool => Number.isSafeInteger(raw?.[tool.id]) && raw[tool.id] >= 0 && raw[tool.id] <= 1000).map(tool => [tool.id, raw[tool.id]]));
  } catch { return {}; }
}

export function studioToolOffer(id: StudioTool, prices: Partial<Record<StudioTool, number>>, ready: boolean) {
  const approved = prices[id];
  const enabled = ready && approved != null;
  return {
    id, enabled, credits: approved ?? null,
    displayCredits: approved ?? (studioTariffReady(id) ? STUDIO_TARIFFS[id] : null),
    unavailableReason: enabled ? null : approved != null ? 'unavailable' : studioTariffReady(id) ? 'not_enabled' : 'pricing_review',
  };
}
