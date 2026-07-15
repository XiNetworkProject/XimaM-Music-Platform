const STORAGE_KEY = 'synaura_reco_session_id_v2';
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
let memorySessionId: string | null = null;

function createdAt(sessionId: string) {
  const parsed = Number(sessionId.split('-')[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getRecommendationSessionId() {
  const now = Date.now();
  if (memorySessionId && now - createdAt(memorySessionId) < SESSION_TTL_MS) return memorySessionId;
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && now - createdAt(existing) < SESSION_TTL_MS) {
      memorySessionId = existing;
      return existing;
    }
    const next = createSessionId();
    window.localStorage.setItem(STORAGE_KEY, next);
    memorySessionId = next;
    return next;
  } catch {
    memorySessionId = createSessionId();
    return memorySessionId;
  }
}
