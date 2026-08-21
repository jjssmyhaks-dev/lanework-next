/**
 * In-memory TTL cache for API responses and DB queries
 * Helps with scalability by reducing redundant DB hits
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<any>>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 300_000);

/** Get a cached value */
export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

/** Set a cached value with TTL in seconds */
export function cacheSet<T>(key: string, value: T, ttlSeconds: number = 30): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/** Delete a cached value */
export function cacheDelete(key: string): void {
  store.delete(key);
}

/** Delete all keys matching a prefix */
export function cacheDeletePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Cache-aside pattern: get or compute */
export async function cacheWrap<T>(
  key: string,
  compute: () => Promise<T>,
  ttlSeconds: number = 30
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await compute();
  cacheSet(key, value, ttlSeconds);
  return value;
}

/** Get cache stats */
export function cacheStats(): { size: number; keys: string[] } {
  return {
    size: store.size,
    keys: Array.from(store.keys()).slice(0, 50),
  };
}

/** Clear entire cache */
export function cacheClear(): void {
  store.clear();
}

/** Scoped cache keys by tenant */
export function tenantCache(tenantId: string, key: string): string {
  return `${tenantId}:${key}`;
}
