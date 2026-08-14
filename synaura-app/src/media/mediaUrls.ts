const DEFAULT_MEDIA_BASE_URL = 'https://media.synaura.fr';
const LEGACY_MEDIA_HOST = 'res.cloudinary.com';
const CLOUDINARY_RESOURCE_TYPES = new Set(['image', 'video', 'raw']);
const CLOUDINARY_DELIVERY_TYPES = new Set(['upload', 'private', 'authenticated']);
const CLOUDINARY_TRANSFORM_KEYS = new Set([
  'a', 'ac', 'af', 'ar', 'b', 'bl', 'bo', 'br', 'c', 'co', 'cs', 'd', 'dl', 'dn', 'dpr', 'du',
  'e', 'eo', 'f', 'fl', 'fn', 'fps', 'g', 'h', 'if', 'ki', 'l', 'o', 'p', 'pg', 'q', 'r', 'so',
  'sp', 't', 'u', 'vc', 'vs', 'w', 'x', 'y', 'z',
]);

export const MEDIA_BASE_URL = (process.env.EXPO_PUBLIC_MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL).replace(/\/+$/, '');

function isLegacyHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === LEGACY_MEDIA_HOST || host.endsWith('.b-cdn.net');
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

export function toPublicMediaUrl(value?: string | null) {
  const input = String(value || '').trim();
  if (!input || input.startsWith('/')) return input || null;
  try {
    const parsed = new URL(input);
    if (!isLegacyHost(parsed.hostname)) return input;
    const migratedPath = migratedCloudinaryPath(parsed.pathname);
    if (!migratedPath) return input;
    return `${MEDIA_BASE_URL}/cloudinary/${migratedPath}${parsed.search || ''}`;
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
    return null;
  } catch {
    return null;
  }
}
