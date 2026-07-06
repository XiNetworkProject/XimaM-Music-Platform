import { v4 as uuidv4 } from 'uuid';

type EventPayload = {
  event_type: string;
  position_ms?: number;
  duration_ms?: number;
  progress_pct?: number;
  source?: string;
  referrer?: string;
  platform?: string;
  country?: string;
  session_id?: string;
  artist_id?: string;
  is_ai_track?: boolean;
  extra?: any;
};

function getSessionId(): string {
  try {
    const key = 'synaura_session_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = uuidv4();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return uuidv4();
  }
}

export async function sendTrackEvents(trackId: string, events: EventPayload | EventPayload[]) {
  const payload = Array.isArray(events) ? events : [events];
  const sessionId = getSessionId();
  const body = payload.map((e) => ({ ...e, session_id: e.session_id || sessionId, platform: e.platform || 'web' }));

  try {
    await fetch(`/api/tracks/${encodeURIComponent(trackId)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: body }),
      keepalive: true,
    });
  } catch {}
}

export type ClipFunnelStep = 'clip_use_sound_started' | 'clip_composer_opened' | 'clip_draft_created' | 'clip_published';

/**
 * Mesure produit du funnel "Utiliser ce son" -> Clip publié. Réutilise l'event_type
 * 'remix' déjà accepté par /api/tracks/[id]/events (track_event_type est un enum
 * Postgres : ajouter de vraies valeurs demanderait une migration) et encode l'étape
 * dans extra.kind. Pas de compteur public, best-effort (échec silencieux).
 */
export async function recordClipFunnelEvent(trackId: string, kind: ClipFunnelStep, extra?: Record<string, unknown>) {
  if (!trackId) return;
  await sendTrackEvents(trackId, { event_type: 'remix', source: 'clip', extra: { kind, ...extra } });
}


