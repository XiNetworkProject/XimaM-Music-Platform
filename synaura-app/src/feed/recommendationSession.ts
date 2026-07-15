import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'synaura.recommendation.session.v2';
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
let sessionPromise: Promise<string> | null = null;

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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ id, createdAt: Date.now() })).catch(() => {});
    return id;
  })();
  return sessionPromise;
}
