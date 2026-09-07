export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export class InMemoryRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();
  private operations = 0;

  consume(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    if (!key || !Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
      throw new Error('Configuration de rate limit invalide');
    }

    this.operations += 1;
    if (this.operations % 250 === 0) this.removeExpired(now);

    const current = this.entries.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    entry.count += 1;
    this.entries.set(key, entry);

    const allowed = entry.count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - entry.count),
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      resetAt: entry.resetAt,
    };
  }

  reset() {
    this.entries.clear();
    this.operations = 0;
  }

  private removeExpired(now: number) {
    this.entries.forEach((entry, key) => {
      if (entry.resetAt <= now) this.entries.delete(key);
    });
  }
}

// Ce limiteur est volontairement local au processus Node. Il convient au
// deploiement Freebox mono-processus actuel, mais ne constitue pas une limite
// globale en environnement multi-worker ou multi-instance. Dans ce cas, il
// devra etre remplace par un compteur partage (Redis, base dediee, etc.).
declare global {
  // eslint-disable-next-line no-var
  var __synauraCriticalRouteRateLimiter: InMemoryRateLimiter | undefined;
}

const sharedLimiter = globalThis.__synauraCriticalRouteRateLimiter || new InMemoryRateLimiter();
globalThis.__synauraCriticalRouteRateLimiter = sharedLimiter;

export function consumeRateLimit(key: string, limit: number, windowMs: number, now?: number) {
  return sharedLimiter.consume(key, limit, windowMs, now);
}
