import { createHash } from 'node:crypto';
import { consumeRateLimit, type RateLimitResult } from './rateLimit.ts';

type HeaderSource = Headers | Record<string, string | string[] | number | undefined> | undefined;
type RequestLike = { headers?: HeaderSource; url?: string };

export type LimitedJsonResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: Response };

function readHeader(source: HeaderSource, name: string) {
  if (!source) return '';
  if (typeof (source as Headers).get === 'function') {
    return (source as Headers).get(name)?.trim() || '';
  }
  const record = source as Record<string, string | string[] | number | undefined>;
  const value = record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()];
  return String(Array.isArray(value) ? value[0] : (value ?? '')).trim();
}

export function normalizeEmailForSecurity(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 320) : '';
}

export function hashRateLimitIdentifier(value: unknown) {
  const normalized = String(value || 'unknown').trim().toLowerCase().slice(0, 512) || 'unknown';
  return createHash('sha256').update(normalized).digest('hex');
}

export function getClientIp(request: RequestLike) {
  const realIp = readHeader(request.headers, 'x-real-ip');
  if (realIp) return realIp.slice(0, 64);
  const forwarded = readHeader(request.headers, 'x-forwarded-for').split(',', 1)[0]?.trim();
  return (forwarded || 'unknown').slice(0, 64);
}

export function consumeRequestRateLimit(
  request: RequestLike,
  scope: string,
  limit: number,
  windowMs: number,
  identifier?: unknown,
): RateLimitResult {
  const identity = identifier === undefined ? getClientIp(request) : identifier;
  return consumeRateLimit(`${scope}:${hashRateLimitIdentifier(identity)}`, limit, windowMs);
}

export function rateLimitResponse(result: RateLimitResult, message = 'Trop de requetes. Reessayez plus tard.') {
  return Response.json({ error: message }, {
    status: 429,
    headers: {
      'Retry-After': String(result.retryAfterSeconds),
      'Cache-Control': 'private, no-store',
    },
  });
}

export function enforceRequestRateLimit(
  request: RequestLike,
  scope: string,
  limit: number,
  windowMs: number,
  identifier?: unknown,
) {
  const result = consumeRequestRateLimit(request, scope, limit, windowMs, identifier);
  return result.allowed ? null : rateLimitResponse(result);
}

export async function readLimitedJson<T = Record<string, unknown>>(
  request: Request,
  maxBytes: number,
  allowEmpty = false,
): Promise<LimitedJsonResult<T>> {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, response: Response.json({ error: 'Corps de requete trop volumineux' }, { status: 413 }) };
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { ok: false, response: Response.json({ error: 'Corps de requete trop volumineux' }, { status: 413 }) };
  }
  if (allowEmpty && !raw.trim()) return { ok: true, value: {} as T };
  try {
    const value = JSON.parse(raw) as T;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
    return { ok: true, value };
  } catch {
    return { ok: false, response: Response.json({ error: 'Corps JSON invalide' }, { status: 400 }) };
  }
}

function configuredWebOrigins(request: RequestLike) {
  const values = [request.url, process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_SITE_URL]
    .filter((value): value is string => Boolean(value));
  for (const value of String(process.env.ALLOWED_WEB_ORIGINS || '').split(',')) {
    if (value.trim()) values.push(value.trim());
  }
  const origins = new Set<string>();
  for (const value of values) {
    try { origins.add(new URL(value).origin); } catch { /* Ignore invalid configuration. */ }
  }
  return origins;
}

export function isTrustedMutationOrigin(request: RequestLike) {
  const origin = readHeader(request.headers, 'origin');
  const fetchSite = readHeader(request.headers, 'sec-fetch-site').toLowerCase();
  // Les clients natifs et les appels serveur n'envoient generalement pas Origin.
  // Les navigateurs cross-site modernes envoient Origin et/ou Sec-Fetch-Site.
  if (!origin) return fetchSite !== 'cross-site';
  try {
    return configuredWebOrigins(request).has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function rejectUntrustedMutationOrigin(request: RequestLike) {
  return isTrustedMutationOrigin(request)
    ? null
    : Response.json({ error: 'Origine de requete refusee' }, { status: 403 });
}

export function isSafeOpaqueIdentifier(value: unknown, min = 8, max = 160): value is string {
  return typeof value === 'string'
    && value.length >= min
    && value.length <= max
    && /^[A-Za-z0-9_-]+$/.test(value);
}
