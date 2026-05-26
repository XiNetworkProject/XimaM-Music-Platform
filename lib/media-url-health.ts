const TEMPORARY_AI_MEDIA_HOSTS = [
  'musicfile.api.box',
  'tempfile.aiquickdraw.com',
  'musicfile.removeai.ai',
];

export function isHttpUrl(value?: string | null): boolean {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

export function isLikelyExpiredAIProviderUrl(url?: string | null): boolean {
  if (!url) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith('.removeai.ai')) return true;
    return TEMPORARY_AI_MEDIA_HOSTS.some((blockedHost) => host === blockedHost || host.endsWith(`.${blockedHost}`));
  } catch {
    return true;
  }
}

export function isUsableHttpMediaUrl(url?: string | null): boolean {
  return isHttpUrl(url) && !isLikelyExpiredAIProviderUrl(url);
}

export function pickFirstUsableHttpMediaUrl(...values: Array<unknown>): string {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (isUsableHttpMediaUrl(trimmed)) return trimmed;
  }
  return '';
}
