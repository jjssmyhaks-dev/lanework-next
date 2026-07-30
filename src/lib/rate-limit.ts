/**
 * Rate limiting middleware for Next.js API routes
 * Uses in-memory store (Vercel serverless-compatible).
 * For production: swap to Redis or Upstash for distributed rate limiting.
 */

const WINDOW_MS = 60_000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 30; // per IP

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 300_000).unref?.();

export interface RateLimitOptions {
  /** Max requests allowed in the time window (default 30) */
  maxRequests?: number;
  /** Time window in ms (default 60s) */
  windowMs?: number;
  /** Identifier for the rate limit group (e.g., "ai", "integrations") */
  group?: string;
}

export function rateLimit(request: Request, options: RateLimitOptions = {}): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const { maxRequests = 30, windowMs = WINDOW_MS, group = "default" } = options;

  // Get client IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const key = `${group}:${ip}`;

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  existing.count++;
  if (existing.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt };
}

/** Express-like middleware for route handlers */
export function withRateLimit(options: RateLimitOptions = {}) {
  return (request: Request) => {
    const result = rateLimit(request, options);
    return result;
  };
}

/**
 * Stricter limit for AI/LLM endpoints — expensive calls
 */
export const aiRateLimit = {
  maxRequests: 10,
  windowMs: 60_000,
  group: "ai",
} as const;

/**
 * Standard limit for integration actions
 */
export const integrationRateLimit = {
  maxRequests: 30,
  windowMs: 60_000,
  group: "integrations",
} as const;
