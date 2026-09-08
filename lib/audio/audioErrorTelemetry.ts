import type { AudioErrorObservation } from './AudioCore';

const DEDUPE_WINDOW_MS = 60_000;
const MAX_DEDUPE_KEYS = 50;
const reportedAt = new Map<string, number>();

function genericDeviceLabel() {
  const agent = navigator.userAgent.toLowerCase();
  const browser = agent.includes('edg/') ? 'edge' : agent.includes('firefox/') ? 'firefox' : agent.includes('chrome/') ? 'chromium' : agent.includes('safari/') ? 'safari' : 'other';
  const device = /android|iphone|ipad|mobile/.test(agent) ? 'mobile' : 'desktop';
  return `${browser}-${device}`;
}

export function reportAudioError(observation: AudioErrorObservation) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  const route = window.location.pathname.slice(0, 160) || '/';
  const payload = {
    category: observation.error.kind,
    trackId: observation.error.trackId?.slice(0, 128) || null,
    route,
    device: genericDeviceLabel(),
    generation: observation.error.generation,
    context: observation.context,
    event: observation.event,
  };
  const key = [payload.category, payload.trackId, payload.route, payload.context, payload.event].join('|');
  const now = Date.now();
  if (now - (reportedAt.get(key) || 0) < DEDUPE_WINDOW_MS) return;
  reportedAt.set(key, now);
  if (reportedAt.size > MAX_DEDUPE_KEYS) {
    const oldest = Array.from(reportedAt.entries()).sort((a, b) => a[1] - b[1]).slice(0, reportedAt.size - MAX_DEDUPE_KEYS);
    oldest.forEach(([entry]) => reportedAt.delete(entry));
  }
  fetch('/api/observability/audio-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
