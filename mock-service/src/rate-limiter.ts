/**
 * Fixed-window rate limiter: 100 requests per 60-second window.
 *
 * Design decision: fixed window (not sliding) is intentional for a mock.
 * A sliding window would be more accurate in production (avoids burst
 * at window boundaries) but adds complexity that doesn't serve the
 * testing purpose here.
 */

const WINDOW_MS = 60_000; // 60 seconds
const MAX_REQUESTS = 100;

let windowStart = Date.now();
let requestCount = 0;

/**
 * Returns true if the request is allowed, false if rate limit exceeded.
 * Resets the counter when the current window expires.
 */
export function checkRateLimit(): boolean {
  const now = Date.now();

  if (now - windowStart >= WINDOW_MS) {
    // New window — reset counter
    windowStart = now;
    requestCount = 0;
  }

  if (requestCount >= MAX_REQUESTS) {
    return false;
  }

  requestCount++;
  return true;
}

/** Exposed for testing / debugging */
export function getRateLimitState(): { count: number; windowStart: number; windowMs: number } {
  return { count: requestCount, windowStart, windowMs: WINDOW_MS };
}
