import type { AudioErrorKind, AudioErrorObservation } from './AudioCore';

const CATEGORIES = new Set<AudioErrorKind>([
  'network', 'media-unsupported', 'missing-file', 'decode', 'timeout',
  'autoplay-blocked', 'aborted', 'stale', 'unknown',
]);
const CONTEXTS = new Set<AudioErrorObservation['context']>(['global', 'voice-message', 'preview', 'ui', 'studio', 'other']);
const EVENTS = new Set<AudioErrorObservation['event']>([
  'invalid-track', 'load-timeout', 'play-rejection', 'retry-timeout', 'media-error', 'secondary-media-error',
]);

export interface SanitizedAudioErrorEvent {
  category: AudioErrorKind;
  trackId: string | null;
  route: string;
  device: string;
  generation: number;
  context: AudioErrorObservation['context'];
  event: AudioErrorObservation['event'];
}

function boundedText(value: unknown, max: number) {
  return typeof value === 'string' ? value.replace(/[\r\n\t]/g, ' ').trim().slice(0, max) : '';
}

export function sanitizeAudioErrorEvent(value: unknown): SanitizedAudioErrorEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const category = boundedText(input.category, 32) as AudioErrorKind;
  const context = boundedText(input.context, 32) as AudioErrorObservation['context'];
  const event = boundedText(input.event, 48) as AudioErrorObservation['event'];
  const route = boundedText(input.route, 160);
  const device = boundedText(input.device, 40);
  const rawTrackId = boundedText(input.trackId, 128);
  const generation = Number(input.generation);
  if (!CATEGORIES.has(category) || !CONTEXTS.has(context) || !EVENTS.has(event)) return null;
  if (!route.startsWith('/') || route.includes('?') || route.includes('#') || !device || !Number.isSafeInteger(generation) || generation < 0) return null;
  return { category, trackId: rawTrackId || null, route, device, generation, context, event };
}
