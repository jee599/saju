/**
 * In-memory sliding-window rate limiter.
 * Keys: IP address (+ optional UUID cookie).
 * Limits: configurable per-endpoint, default 5 req/day.
 *
 * NOTE: On Vercel serverless, in-memory state is per-instance and ephemeral.
 * This provides basic abuse prevention. For strict enforcement, migrate to
 * Upstash Redis or Supabase-based rate limiting.
 */

type Entry = { timestamps: number[] };

const store = new Map<string, Entry>();

// Clean old entries every 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();

const cleanup = (windowMs: number) => {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
};

export type RateLimitConfig = {
  /** Max requests in the window */
  limit: number;
  /** Window size in milliseconds (default: 24h) */
  windowMs?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
};

/**
 * Extract client IP from request headers.
 * Vercel sets x-forwarded-for; fallback to x-real-ip.
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
};

/**
 * Check rate limit for a given key.
 */
export const checkRateLimit = (
  key: string,
  config: RateLimitConfig
): RateLimitResult => {
  const { limit, windowMs = 24 * 60 * 60 * 1000 } = config;
  const now = Date.now();
  const cutoff = now - windowMs;

  cleanup(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0]!;
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: oldest + windowMs,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    limit,
    resetAt: now + windowMs,
  };
};

/**
 * Build rate-limit response headers.
 */
export const rateLimitHeaders = (result: RateLimitResult): Record<string, string> => ({
  "X-RateLimit-Limit": String(result.limit),
  "X-RateLimit-Remaining": String(result.remaining),
  "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
});
