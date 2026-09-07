import type { RateLimitResult } from './rateLimit.ts';

type RateLimitConsumer = (key: string, limit: number, windowMs: number) => RateLimitResult;

type PresentationActor = {
  id: string;
  email: string | null;
  authorized: boolean;
};

type MeteoPresentationDependencies = {
  getActor: () => Promise<PresentationActor | null>;
  configuredRecipients?: string;
  consumeRateLimit: RateLimitConsumer;
  sendPresentation: (recipients: string[]) => Promise<void>;
  reportFailure?: (event: 'authorization_lookup_failed' | 'send_failed') => void;
};

type SunoStatusDependencies = {
  getUserId: () => Promise<string | null>;
  ownsTask: (userId: string, taskId: string) => Promise<boolean>;
  consumeRateLimit: RateLimitConsumer;
  fetchStatus: (taskId: string) => Promise<unknown>;
  reportFailure?: (event: 'authentication_failed' | 'ownership_lookup_failed' | 'upstream_failed') => void;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUNO_TASK_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const METEO_LIMIT = 3;
const METEO_WINDOW_MS = 60 * 60 * 1000;
const SUNO_USER_LIMIT = 30;
const SUNO_TASK_LIMIT = 12;
const SUNO_WINDOW_MS = 60 * 1000;

function json(body: Record<string, unknown>, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function rateLimited(result: RateLimitResult) {
  return json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    429,
    { 'Retry-After': String(result.retryAfterSeconds) },
  );
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function parseEmailAllowlist(value?: string): string[] {
  return Array.from(new Set(
    String(value || '')
      .split(/[;,]/)
      .map((entry) => normalizeEmail(entry))
      .filter((entry): entry is string => Boolean(entry)),
  ));
}

export function normalizeSunoTaskId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const taskId = value.trim();
  return SUNO_TASK_ID_PATTERN.test(taskId) ? taskId : null;
}

function safeText(value: unknown, maxLength = 64): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function safePublicUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function sanitizeSunoStatusPayload(payload: unknown) {
  const root = payload && typeof payload === 'object' ? payload as Record<string, any> : {};
  const outerData = root.data && typeof root.data === 'object' ? root.data as Record<string, any> : {};
  const trackData = Array.isArray(outerData.data) ? outerData.data : [];
  const audioUrls = trackData
    .map((item) => safePublicUrl(item?.audio_url))
    .filter((url): url is string => Boolean(url));

  return {
    status: safeText(outerData.status ?? root.status) || 'pending',
    audioUrls,
    callbackType: safeText(outerData.callbackType ?? root.callbackType) || 'pending',
  };
}

async function readOptionalJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 2048) return null;
  const text = await request.text();
  if (!text.trim()) return {};
  if (text.length > 2048) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export async function handleMeteoPresentationRequest(
  request: Request,
  dependencies: MeteoPresentationDependencies,
): Promise<Response> {
  let actor: PresentationActor | null;
  try {
    actor = await dependencies.getActor();
  } catch {
    dependencies.reportFailure?.('authorization_lookup_failed');
    return json({ error: 'Service indisponible' }, 503);
  }

  if (!actor?.id) return json({ error: 'Non authentifié' }, 401);
  if (!actor.authorized) return json({ error: 'Accès refusé' }, 403);

  const body = await readOptionalJsonObject(request);
  if (!body || Object.keys(body).some((key) => key !== 'to')) {
    return json({ error: 'Requête invalide' }, 400);
  }

  const configured = parseEmailAllowlist(dependencies.configuredRecipients);
  const actorEmail = normalizeEmail(actor.email);
  const allowed = Array.from(new Set([...configured, ...(actorEmail ? [actorEmail] : [])]));
  const requestedRaw = body.to;
  const requested = requestedRaw === undefined ? null : normalizeEmail(requestedRaw);

  if (requestedRaw !== undefined && !requested) return json({ error: 'Destination invalide' }, 400);
  if (requested && !allowed.includes(requested)) return json({ error: 'Destination non autorisée' }, 403);

  const recipients = requested ? [requested] : actorEmail ? [actorEmail] : configured.slice(0, 1);
  if (!recipients.length) return json({ error: 'Service indisponible' }, 503);

  const limit = dependencies.consumeRateLimit(`meteo-presentation:${actor.id}`, METEO_LIMIT, METEO_WINDOW_MS);
  if (!limit.allowed) return rateLimited(limit);

  try {
    await dependencies.sendPresentation(recipients);
    return json({ success: true, message: 'Email envoyé' });
  } catch {
    dependencies.reportFailure?.('send_failed');
    return json({ error: 'Envoi impossible' }, 500);
  }
}

export async function handleSunoStatusRequest(
  taskIdValue: unknown,
  dependencies: SunoStatusDependencies,
): Promise<Response> {
  let userId: string | null;
  try {
    userId = await dependencies.getUserId();
  } catch {
    dependencies.reportFailure?.('authentication_failed');
    return json({ error: 'Service indisponible' }, 503);
  }
  if (!userId) return json({ error: 'Non authentifié' }, 401);

  const taskId = normalizeSunoTaskId(taskIdValue);
  if (!taskId) return json({ error: 'Task ID invalide' }, 400);

  const userLimit = dependencies.consumeRateLimit(`suno-status-user:${userId}`, SUNO_USER_LIMIT, SUNO_WINDOW_MS);
  if (!userLimit.allowed) return rateLimited(userLimit);

  let owned = false;
  try {
    owned = await dependencies.ownsTask(userId, taskId);
  } catch {
    dependencies.reportFailure?.('ownership_lookup_failed');
    return json({ error: 'Service indisponible' }, 503);
  }
  if (!owned) return json({ error: 'Accès refusé' }, 403);

  const taskLimit = dependencies.consumeRateLimit(`suno-status-task:${userId}:${taskId}`, SUNO_TASK_LIMIT, SUNO_WINDOW_MS);
  if (!taskLimit.allowed) return rateLimited(taskLimit);

  try {
    const payload = await dependencies.fetchStatus(taskId);
    return json({ taskId, ...sanitizeSunoStatusPayload(payload) });
  } catch {
    dependencies.reportFailure?.('upstream_failed');
    return json({ error: 'Service de génération indisponible' }, 502);
  }
}
