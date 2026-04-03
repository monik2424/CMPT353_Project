/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Stores counters in a module-level Map so they persist across requests
 * within the same Node.js process (sufficient for single-container Docker use).
 *
 * Usage:
 *   if (isRateLimited(`login:${ip}`, 5, 60_000)) {
 *     return NextResponse.json({ error: '...' }, { status: 429 });
 *   }
 */

interface Window {
  count: number;
  windowStart: number; // ms timestamp
}

const store = new Map<string, Window>();

/**
 * Returns true if the caller should be blocked (rate limit exceeded).
 *
 * @param key       Unique identifier, e.g. "login:1.2.3.4" or "post:42"
 * @param limit     Maximum allowed requests in the window
 * @param windowMs  Window duration in milliseconds (default 60 s)
 */
export function isRateLimited(key: string, limit: number, windowMs = 60_000): boolean {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > limit;
}

/** Extract the best available client IP from a Next.js Request. */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
