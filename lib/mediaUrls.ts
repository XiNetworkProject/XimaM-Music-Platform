const DEFAULT_MEDIA_BASE_URL = 'https://media.synaura.fr';
const LEGACY_CLOUDINARY_HOST = 'res.cloudinary.com';
const LEGACY_BUNNY_HOST = 'synaura-cdn.b-cdn.net';
const CLOUDINARY_RESOURCE_TYPES = new Set(['image', 'video', 'raw']);
const CLOUDINARY_DELIVERY_TYPES = new Set(['upload', 'private', 'authenticated']);
const CLOUDINARY_TRANSFORM_KEYS = new Set([
  'a', 'ac', 'af', 'ar', 'b', 'bl', 'bo', 'br', 'c', 'co', 'cs', 'd', 'dl', 'dn', 'dpr', 'du',
  'e', 'eo', 'f', 'fl', 'fn', 'fps', 'g', 'h', 'if', 'ki', 'l', 'o', 'p', 'pg', 'q', 'r', 'so',
  'sp', 't', 'u', 'vc', 'vs', 'w', 'x', 'y', 'z',
]);

export const MEDIA_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  process.env.MEDIA_BASE_URL ||
  DEFAULT_MEDIA_BASE_URL
).replace(/\/+$/, '');

function isLegacyMediaHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === LEGACY_CLOUDINARY_HOST || host === LEGACY_BUNNY_HOST || host.endsWith('.b-cdn.net');
}

function isCloudinaryTransformationSegment(segment: string) {
  let decoded = segment;
  try { decoded = decodeURIComponent(segment); } catch { /* conserver la valeur encodee */ }
  if (/^s--[^/]+--$/i.test(decoded) || /^\$[^_]+_.+/.test(decoded)) return true;
  if (/^if_(?:else|end)$/i.test(decoded)) return true;
  const parts = decoded.split(',').filter(Boolean);
  return parts.length > 0 && parts.every((part) => {
    const separator = part.indexOf('_');
    if (separator <= 0) return false;
    return CLOUDINARY_TRANSFORM_KEYS.has(part.slice(0, separator).toLowerCase());
  });
}

function migratedCloudinaryPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length < 4) return null;
  const resourceType = segments[1]?.toLowerCase();
  const deliveryType = segments[2]?.toLowerCase();
  if (!CLOUDINARY_RESOURCE_TYPES.has(resourceType) || !CLOUDINARY_DELIVERY_TYPES.has(deliveryType)) return null;

  const remainder = segments.slice(3);
  const versionIndex = remainder.findIndex((segment) => /^v\d+$/i.test(segment));
  let publicIdSegments: string[];
  if (versionIndex >= 0) {
    publicIdSegments = remainder.slice(versionIndex + 1);
  } else {
    let firstPublicIdSegment = 0;
    while (
      firstPublicIdSegment < remainder.length &&
      isCloudinaryTransformationSegment(remainder[firstPublicIdSegment]!)
    ) {
      firstPublicIdSegment += 1;
    }
    publicIdSegments = remainder.slice(firstPublicIdSegment);
  }
  if (!publicIdSegments.length) return null;
  return `${resourceType}/${publicIdSegments.join('/')}`;
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
    const migratedPath = migratedCloudinaryPath(parsed.pathname);
    if (!migratedPath) return input;
    return `${MEDIA_BASE_URL}/cloudinary/${migratedPath}${parsed.search || ''}`;
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
    return null;
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
