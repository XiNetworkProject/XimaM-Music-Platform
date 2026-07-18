import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'synaura.recommendation.session.v2';
const SEEN_KEY_PREFIX = 'synaura.recommendation.seen.v1';
const SESSION_TTL_MS = 18 * 60 * 60 * 1000;
const MAX_SEEN_PER_KIND = 240;
let sessionPromise: Promise<string> | null = null;
let seenPromise: Promise<RecommendationSeenState> | null = null;

export type RecommendationContentKind = 'track' | 'post' | 'clip';
type RecommendationSeenState = Record<RecommendationContentKind, string[]>;

function emptySeenState(): RecommendationSeenState {
  return { track: [], post: [], clip: [] };
}

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getRecommendationSessionId() {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { id?: string; createdAt?: number };
        if (saved.id && Number(saved.createdAt || 0) > Date.now() - SESSION_TTL_MS) return saved.id;
      }
    } catch {}
    const id = createSessionId();
    seenPromise = null;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ id, createdAt: Date.now() })).catch(() => {});
    return id;
  })();
  return sessionPromise;
}

async function loadSeenState() {
  if (seenPromise) return seenPromise;
  seenPromise = (async () => {
    const sessionId = await getRecommendationSessionId();
    try {
      const raw = await AsyncStorage.getItem(`${SEEN_KEY_PREFIX}:${sessionId}`);
      if (!raw) return emptySeenState();
      const parsed = JSON.parse(raw) as Partial<RecommendationSeenState>;
      return {
        track: Array.isArray(parsed.track) ? parsed.track.filter(Boolean).slice(-MAX_SEEN_PER_KIND) : [],
        post: Array.isArray(parsed.post) ? parsed.post.filter(Boolean).slice(-MAX_SEEN_PER_KIND) : [],
        clip: Array.isArray(parsed.clip) ? parsed.clip.filter(Boolean).slice(-MAX_SEEN_PER_KIND) : [],
      };
    } catch {
      return emptySeenState();
    }
  })();
  return seenPromise;
}

export async function getRecommendationSeenIds(kind: RecommendationContentKind) {
  const state = await loadSeenState();
  return [...state[kind]];
}

export async function rememberRecommendationImpressions(
  impressions: Array<{ id: string; kind: RecommendationContentKind }>,
) {
  if (!impressions.length) return;
  const sessionId = await getRecommendationSessionId();
  const state = await loadSeenState();
  let changed = false;
  for (const impression of impressions) {
    const id = String(impression.id || '');
    if (!id || state[impression.kind].includes(id)) continue;
    state[impression.kind].push(id);
    state[impression.kind] = state[impression.kind].slice(-MAX_SEEN_PER_KIND);
    changed = true;
  }
  if (!changed) return;
  await AsyncStorage.setItem(`${SEEN_KEY_PREFIX}:${sessionId}`, JSON.stringify(state)).catch(() => {});
}
