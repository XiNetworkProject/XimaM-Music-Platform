const DEFAULT_MEDIA_BASE_URL = 'https://media.synaura.fr';
const LEGACY_CLOUDINARY_HOST = 'res.cloudinary.com';
const LEGACY_BUNNY_HOST = 'synaura-cdn.b-cdn.net';

export const MEDIA_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  process.env.MEDIA_BASE_URL ||
  DEFAULT_MEDIA_BASE_URL
).replace(/\/+$/, '');

function isLegacyMediaHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === LEGACY_CLOUDINARY_HOST || host === LEGACY_BUNNY_HOST || host.endsWith('.b-cdn.net');
}

export function isLegacyCloudinaryUrl(value?: string | null) {
  if (!value) return false;
  try {
    return new URL(value).hostname.toLowerCase() === LEGACY_CLOUDINARY_HOST;
  } catch {
    return false;
  }
}

export function toPublicMediaUrl(value?: string | null): string | null {
  const input = String(value || '').trim();
  if (!input || input.startsWith('/')) return input || null;
  try {
    const parsed = new URL(input);
    if (!isLegacyMediaHost(parsed.hostname)) return input;
    return `${MEDIA_BASE_URL}/cloudinary${parsed.pathname}${parsed.search || ''}`;
  } catch {
    return input;
  }
}

export function toLegacyMediaFallback(value?: string | null): string | null {
  const input = String(value || '').trim();
  if (!input) return null;
  try {
    const parsed = new URL(input);
    if (parsed.hostname.toLowerCase() === LEGACY_CLOUDINARY_HOST) return input;
    if (isLegacyMediaHost(parsed.hostname)) return `https://${LEGACY_CLOUDINARY_HOST}${parsed.pathname}${parsed.search || ''}`;
    const mediaBase = new URL(MEDIA_BASE_URL);
    if (parsed.hostname.toLowerCase() !== mediaBase.hostname.toLowerCase() || !parsed.pathname.startsWith('/cloudinary/')) return null;
    const legacyPath = parsed.pathname.slice('/cloudinary'.length);
    return `https://${LEGACY_CLOUDINARY_HOST}${legacyPath}${parsed.search || ''}`;
  } catch {
    return null;
  }
}

export function mediaUrlCandidates(value?: string | null): string[] {
  const primary = toPublicMediaUrl(value);
  const fallback = toLegacyMediaFallback(value || primary);
  return Array.from(new Set([primary, fallback].filter((entry): entry is string => Boolean(entry))));
}

export function sameMediaUrl(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  const rightCandidates = new Set(mediaUrlCandidates(right));
  return mediaUrlCandidates(left).some((candidate) => rightCandidates.has(candidate));
}

