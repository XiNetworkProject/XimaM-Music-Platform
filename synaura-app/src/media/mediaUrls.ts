const DEFAULT_MEDIA_BASE_URL = 'https://media.synaura.fr';
const LEGACY_MEDIA_HOST = 'res.cloudinary.com';

export const MEDIA_BASE_URL = (process.env.EXPO_PUBLIC_MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL).replace(/\/+$/, '');

function isLegacyHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === LEGACY_MEDIA_HOST || host.endsWith('.b-cdn.net');
}

export function toPublicMediaUrl(value?: string | null) {
  const input = String(value || '').trim();
  if (!input || input.startsWith('/')) return input || null;
  try {
    const parsed = new URL(input);
    if (!isLegacyHost(parsed.hostname)) return input;
    return `${MEDIA_BASE_URL}/cloudinary${parsed.pathname}${parsed.search || ''}`;
  } catch {
    return input;
  }
}

export function toLegacyMediaFallback(value?: string | null) {
  const input = String(value || '').trim();
  if (!input) return null;
  try {
    const parsed = new URL(input);
    if (parsed.hostname.toLowerCase() === LEGACY_MEDIA_HOST) return input;
    if (isLegacyHost(parsed.hostname)) return `https://${LEGACY_MEDIA_HOST}${parsed.pathname}${parsed.search || ''}`;
    const mediaBase = new URL(MEDIA_BASE_URL);
    if (parsed.hostname.toLowerCase() !== mediaBase.hostname.toLowerCase() || !parsed.pathname.startsWith('/cloudinary/')) return null;
    return `https://${LEGACY_MEDIA_HOST}${parsed.pathname.slice('/cloudinary'.length)}${parsed.search || ''}`;
  } catch {
    return null;
  }
}

