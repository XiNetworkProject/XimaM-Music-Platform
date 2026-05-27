const TEMPORARY_AI_MEDIA_HOSTS = [
  'musicfile.api.box',
  'tempfile.aiquickdraw.com',
  'musicfile.removeai.ai',
];

const TEMPORARY_AI_MEDIA_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function isHttpUrl(value?: string | null): boolean {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

export function isKnownTemporaryAIProviderUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith('.removeai.ai')) return true;
    return TEMPORARY_AI_MEDIA_HOSTS.some((blockedHost) => host === blockedHost || host.endsWith(`.${blockedHost}`));
  } catch {
    return true;
  }
}

export function isLikelyExpiredAIProviderUrl(url?: string | null, createdAt?: string | Date | null): boolean {
  if (!url) return true;
  if (!isKnownTemporaryAIProviderUrl(url)) return false;
  if (!createdAt) return true;
  const createdMs = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return true;
  const ageMs = Date.now() - createdMs;
  return ageMs < 0 || ageMs > TEMPORARY_AI_MEDIA_TTL_MS;
}

export function isUsableHttpMediaUrl(url?: string | null): boolean {
  return isHttpUrl(url) && !isLikelyExpiredAIProviderUrl(url);
}

export function isPlayableHttpMediaUrl(url?: string | null, createdAt?: string | Date | null): boolean {
  return isHttpUrl(url) && !isLikelyExpiredAIProviderUrl(url, createdAt);
}

export function pickFirstUsableHttpMediaUrl(...values: Array<unknown>): string {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (isUsableHttpMediaUrl(trimmed)) return trimmed;
  }
  return '';
}

export function pickFirstPlayableHttpMediaUrl(values: Array<unknown>, createdAt?: string | Date | null): string {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (isPlayableHttpMediaUrl(trimmed, createdAt)) return trimmed;
  }
  return '';
}
