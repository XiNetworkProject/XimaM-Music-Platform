export type ShareCardFormatId = 'story' | 'square' | 'banner';

export type ShareCardFormat = {
  id: ShareCardFormatId;
  label: string;
  ratioLabel: string;
  width: number;
  height: number;
};

export const SHARE_CARD_FORMATS: ShareCardFormat[] = [
  { id: 'story', label: 'Story', ratioLabel: '9:16', width: 1080, height: 1920 },
  { id: 'square', label: 'Carre', ratioLabel: '1:1', width: 1080, height: 1080 },
  { id: 'banner', label: 'Banniere', ratioLabel: '16:9', width: 1600, height: 900 },
];

export function getShareCardFormat(formatId?: string | null): ShareCardFormat {
  return SHARE_CARD_FORMATS.find((format) => format.id === formatId) || SHARE_CARD_FORMATS[1];
}

export function sanitizeShareCardText(value: unknown, maxLength = 96) {
  if (typeof value !== 'string') return '';
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}...` : clean;
}

export function formatShareCardDuration(seconds?: number | null) {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)));
  if (!safe) return '';
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

export function makeDecorativeWaveform(seed: string, count = 42) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return Array.from({ length: count }, (_, index) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const noise = state / 4294967295;
    const wave = Math.sin(index * 0.58 + (hash % 29)) * 0.5 + 0.5;
    const height = 0.18 + wave * 0.48 + noise * 0.34;
    return Math.max(0.14, Math.min(1, height));
  });
}

export function sampleShareWaveform(peaks: unknown, count = 42) {
  if (!Array.isArray(peaks) || peaks.length === 0) return [];
  const safePeaks = peaks
    .map((value) => Math.abs(Number(value)))
    .filter((value) => Number.isFinite(value));
  if (!safePeaks.length) return [];

  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index / count) * safePeaks.length);
    const end = Math.max(start + 1, Math.floor(((index + 1) / count) * safePeaks.length));
    let max = 0;
    for (let peakIndex = start; peakIndex < end; peakIndex += 1) {
      max = Math.max(max, safePeaks[peakIndex] || 0);
    }
    return Math.max(0.12, Math.min(1, max));
  });
}

export function shareCardFilename(title: string, formatId: ShareCardFormatId) {
  const slug = (title || 'synaura')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'synaura';
  return `synaura-${slug}-${formatId}.png`;
}

export function buildShareCardPath(trackId: string, input?: { format?: ShareCardFormatId; text?: string }) {
  const params = new URLSearchParams();
  if (input?.format) params.set('format', input.format);
  const text = sanitizeShareCardText(input?.text);
  if (text) params.set('text', text);
  const query = params.toString();
  return `/api/share-card/${encodeURIComponent(trackId)}${query ? `?${query}` : ''}`;
}
