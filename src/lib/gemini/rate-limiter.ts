/**
 * Process-local rate limiter for the AI scoring endpoint. Resets on server
 * restart, which is fine for the MVP free tier — upgrade to Redis in v0.2.
 */
const requests: number[] = [];

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
}

export const DEFAULT_LIMIT_PER_MINUTE = 10;

export function checkRateLimit(maxPerMinute: number = DEFAULT_LIMIT_PER_MINUTE): RateLimitResult {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;

  while (requests.length > 0 && requests[0] < oneMinuteAgo) {
    requests.shift();
  }

  if (requests.length >= maxPerMinute) {
    const oldestInWindow = requests[0];
    const retryAfter = Math.max(1, Math.ceil((oldestInWindow + 60_000 - now) / 1000));
    return { allowed: false, retryAfter, remaining: 0 };
  }

  requests.push(now);
  return { allowed: true, remaining: maxPerMinute - requests.length };
}

/** For diagnostics / the usage API. */
export function currentRequestCount(): number {
  const oneMinuteAgo = Date.now() - 60_000;
  return requests.filter((t) => t >= oneMinuteAgo).length;
}
