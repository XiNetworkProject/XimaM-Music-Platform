import { StudioInputError, type StudioToolInput, type StudioTool, type StudioResult } from './tools.ts';
import { safeFeedbackText } from './feedback.ts';

export type StudioSource = { id: string; audioId: string; taskId: string; audioUrl: string; duration: number; model: string; title: string; metadata?: Record<string, any>; workspace?: string };
const generationPoll = '/api/v1/generate/record-info';
export const STUDIO_ENDPOINTS: Record<StudioTool, { create: string; poll?: string }> = {
  extend: { create: '/api/v1/generate/upload-extend', poll: generationPoll },
  replace: { create: '/api/v1/generate/replace-section', poll: generationPoll },
  vocals: { create: '/api/v1/generate/add-vocals', poll: generationPoll },
  instrumental: { create: '/api/v1/generate/add-instrumental', poll: generationPoll },
  mashup: { create: '/api/v1/generate/mashup', poll: generationPoll },
  sounds: { create: '/api/v1/generate/sounds', poll: generationPoll },
  style: { create: '/api/v1/style/generate' }, persona: { create: '/api/v1/generate/generate-persona' },
  stems: { create: '/api/v1/vocal-removal/generate', poll: '/api/v1/vocal-removal/record-info' },
  stems_multi: { create: '/api/v1/vocal-removal/generate', poll: '/api/v1/vocal-removal/record-info' },
  stems_instrument: { create: '/api/v1/vocal-removal/generate', poll: '/api/v1/vocal-removal/record-info' },
  wav: { create: '/api/v1/wav/generate', poll: '/api/v1/wav/record-info' },
  midi: { create: '/api/v1/midi/generate', poll: '/api/v1/midi/record-info' },
  cover: { create: '/api/v1/suno/cover/generate', poll: '/api/v1/suno/cover/record-info' },
  recovery: { create: '/api/v1/suno/recovery', poll: '/api/v1/suno/recovery/record-info' },
};
// Only provider/durable Synaura media, never a user-supplied arbitrary URL.
export function studioMediaUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 4096) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return '';
    const hosts = ['synaura.fr', 'suno.ai', 'suno.com', 'aiquickdraw.com', 'musicfile.kie.ai', 'musicfile.api.box', 'musicfile.removeai.ai', 'tempfile.redpandaai.co', 'res.cloudinary.com'];
    return hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : '';
  } catch { return ''; }
}
export function buildStudioPayload(input: StudioToolInput, model: string, callback: string, source?: StudioSource, second?: StudioSource, stemTaskId?: string, personaId?: string) {
  const i = input;
  const sourceIds = () => {
    if (!source?.audioId || !source.taskId) throw new StudioInputError('Ce morceau ne possède pas les identifiants Suno nécessaires.');
    return { taskId: source.taskId, audioId: source.audioId };
  };
  const sourceUrl = () => {
    const url = studioMediaUrl(source?.audioUrl);
    if (!url) throw new StudioInputError('Le fichier source n’est pas disponible pour cet outil.');
    return url;
  };
  const range = (minimum: number) => {
    if (i.start == null || i.end == null || i.end - i.start < minimum || !source || i.end > source.duration || i.start >= source.duration) throw new StudioInputError(`Choisissez un passage valide d’au moins ${minimum} seconde(s).`);
  };
  const creative = { model, callBackUrl: callback, title: i.title || source?.title || 'Nouvelle version', style: i.style || '', lyrics: i.lyrics || '', negativeTags: i.negativeTags || '', variety: i.variety ?? 1, ...(personaId ? { personaId, personaModel: 'style_persona' } : {}) };
  switch (i.action) {
    case 'extend':
      if (!source || source.duration > 480 || i.start == null || i.start <= 0 || i.start >= source.duration) throw new StudioInputError('Le point de reprise doit être dans le morceau (source de 8 minutes maximum).');
      return { ...creative, uploadUrl: sourceUrl(), continueAt: i.start, instrumental: !!i.instrumental, ...(i.instrumental ? { lyrics: undefined } : {}) };
    case 'replace': {
      range(10);
      // URL mode supports legacy sources with a current V6 model; never mixes source modes.
      const { style, ...rest } = creative;
      return { ...rest, uploadUrl: sourceUrl(), prompt: i.lyrics, tags: style, infillStartS: i.start, infillEndS: i.end, fullLyrics: i.fullLyrics };
    }
    case 'vocals': return { ...creative, uploadUrl: sourceUrl(), prompt: i.lyrics };
    case 'instrumental': { const { style, ...rest } = creative; return { ...rest, uploadUrl: sourceUrl(), tags: style }; }
    case 'mashup': {
      const url = studioMediaUrl(second?.audioUrl);
      if (!url || second?.id === source?.id) throw new StudioInputError('Le second morceau est indisponible.');
      return { ...creative, uploadUrlList: [sourceUrl(), url] };
    }
    case 'sounds': return { model, callBackUrl: callback, prompt: i.prompt, soundLoop: !!i.loop, soundKey: i.key || 'Any', ...(i.tempo ? { soundTempo: i.tempo } : {}) };
    case 'style': return { content: i.prompt };
    case 'persona': range(1); return { ...sourceIds(), name: i.title, description: i.description, vocalStart: i.start, vocalEnd: i.end };
    case 'stems': case 'stems_multi': case 'stems_instrument': return { ...sourceIds(), callBackUrl: callback, type: i.action === 'stems' ? 'separate_vocal' : i.action === 'stems_multi' ? 'split_stem' : 'split_stem_advanced', ...(i.action === 'stems_instrument' ? { stemName: i.stemName } : {}) };
    case 'wav': return { ...sourceIds(), callBackUrl: callback };
    case 'midi': if (!stemTaskId) throw new StudioInputError('Séparation de pistes introuvable.'); return { taskId: stemTaskId, callBackUrl: callback };
    case 'cover': return { taskId: sourceIds().taskId, callBackUrl: callback };
    case 'recovery': return { sunoTaskId: sourceIds().taskId, callBackUrl: callback };
  }
}
export class StudioProviderRejected extends Error {}
export async function studioProviderRequest(path: string, payload?: object, fetcher: typeof fetch = fetch) {
  if (!process.env.SUNO_API_KEY) throw new Error('Provider not configured');
  const response = await fetcher(`${process.env.SUNO_API_BASE || 'https://api.sunoapi.org'}${path}`, {
    method: payload ? 'POST' : 'GET', headers: { Authorization: `Bearer ${process.env.SUNO_API_KEY}`, 'Content-Type': 'application/json' },
    ...(payload ? { body: JSON.stringify(payload) } : {}), cache: 'no-store', signal: AbortSignal.timeout(payload ? 25_000 : 10_000), redirect: 'error',
  });
  let body: any;
  try { body = await response.json(); } catch { throw new Error('Ambiguous provider response'); }
  const code = Number(body?.code ?? response.status);
  // 5xx or transport errors may have accepted a task: never blindly retry/refund.
  if (response.status >= 500 || code >= 500) throw new Error('Ambiguous provider response');
  if (!response.ok || ![200, 201].includes(code)) throw new StudioProviderRejected(safeFeedbackText(body?.msg || body?.message) || 'Demande refusée par le fournisseur, sans motif précisé.');
  return body;
}
export type StudioProviderOutcome = { state: 'pending' | 'completed' | 'failed'; result: StudioResult };
/** Record-info only; callbacks trigger an authenticated read instead of trusting their result. */
export function normalizeStudioResult(action: StudioTool, raw: any): StudioProviderOutcome {
  const data = raw?.data || {};
  const flag = data.status ?? data.successFlag;
  const result: StudioResult = { assets: [] };
  const failed = typeof flag === 'string' && /FAILED|ERROR/.test(flag) || (action === 'midi' && [2, 3].includes(flag)) || (action === 'cover' && flag === 3);
  const reason = safeFeedbackText(data.errorMessage || data.failReason || data.msg);
  if (failed) return { state: 'failed', result: { ...result, warning: reason || 'Le fournisseur a signalé un échec sans préciser la cause.' } };
  const add = (label: string, value: unknown, kind: 'audio' | 'image' | 'file' = 'audio', extra = {}) => {
    const url = studioMediaUrl(value);
    if (url && !result.assets.some(asset => asset.url === url)) result.assets.push({ label: label.slice(0, 255), url, kind, ...extra });
  };
  if (action === 'persona') {
    if (typeof data.personaId !== 'string' || !data.personaId) return { state: 'pending', result };
    result.personaId = data.personaId.slice(0, 255); result.text = String(data.description || '').slice(0, 1000);
    return { state: 'completed', result };
  }
  if (action === 'style') {
    if (String(flag) === '2') return { state: 'failed', result: { ...result, warning: reason || 'L’enrichissement du style a échoué, sans motif fourni.' } };
    if (String(flag) !== '1' || typeof data.result !== 'string') return { state: 'pending', result };
    result.text = data.result.slice(0, 1000); return { state: 'completed', result };
  }
  if (action === 'recovery') {
    if (Number(raw?.code) === 201) return { state: 'pending', result };
    for (const item of Array.isArray(data) ? data : []) if (item.status === 'success') add(item.title || 'Audio récupéré', item.audio_url, 'audio', { providerAudioId: item.id });
    return { state: result.assets.length ? 'completed' : Array.isArray(data) && data.length && data.every(item => item.status === 'failed') ? 'failed' : 'pending', result };
  }
  if (flag !== 'SUCCESS' && flag !== 1) return { state: 'pending', result };
  const response = data.response || {};
  if (action === 'wav') add('WAV', response.audioWavUrl);
  else if (action.startsWith('stems')) {
    for (const item of response.originData || []) add(item.stem_type_group_name || 'Piste', item.audio_url, 'audio', { providerAudioId: item.id });
    for (const [key, value] of Object.entries(response)) if (/Url$/.test(key) && key !== 'originUrl') add(key.replace(/Url$/, '').replace(/([A-Z])/g, ' $1'), value);
  } else if (action === 'cover') for (const [index, url] of (response.images || []).entries()) add(`Pochette ${index + 1}`, url, 'image');
  else if (action === 'midi') {
    result.midi = (Array.isArray(data.midiData?.instruments) ? data.midiData.instruments : []).slice(0, 128).map((instrument: any) => ({
      name: String(instrument.name || 'Instrument').slice(0, 80),
      notes: (Array.isArray(instrument.notes) ? instrument.notes : []).slice(0, 50_000).filter((note: any) => Number.isInteger(note.pitch) && note.pitch >= 0 && note.pitch <= 127 && Number.isFinite(note.start) && Number.isFinite(note.end) && note.start >= 0 && note.end > note.start && note.end <= 3600 && Number.isFinite(note.velocity) && note.velocity >= 0 && note.velocity <= 1).map(({ pitch, start, end, velocity }: any) => ({ pitch, start, end, velocity })),
    }));
  } else {
    for (const item of response.sunoData || []) add(item.title || 'Nouvelle version', item.audio_url || item.audioUrl, 'audio', { providerAudioId: item.id, imageUrl: studioMediaUrl(item.image_url || item.imageUrl), duration: Math.max(0, Math.min(3600, Number(item.duration) || 0)) });
  }
  const complete = result.assets.length > 0 || !!result.midi?.some(instrument => instrument.notes.length);
  return { state: complete ? 'completed' : 'pending', result };
}
