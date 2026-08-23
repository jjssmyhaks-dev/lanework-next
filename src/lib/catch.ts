/**
 * Safe catch utility — replaces empty catch {} blocks with proper logging.
 *
 * Usage:
 *   import { safeCatch } from "@/lib/catch";
 *   try { ... } catch (e) { safeCatch("operation-name", e); }
 *
 * Logs the error with context via Pino in production,
 * console.error in development, and never throws.
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "safe-catch" });

/**
 * Log an error safely — never throws, always logs.
 * Use this to replace empty catch {} blocks.
 */
export function safeCatch(context: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // In production, use structured Pino logging
  if (process.env.NODE_ENV === "production") {
    log.warn({ context, error: msg, stack }, `Caught: ${context}`);
  } else {
    console.warn(`[${context}]`, msg);
  }
}

/**
 * Log and return a default value — useful for optional operations.
 *
 * Usage:
 *   const data = await safeCatchDefault("fetch-items", fetchItems(), []);
 */
export async function safeCatchDefault<T>(
  context: string,
  promise: Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    safeCatch(context, e);
    return defaultValue;
  }
}
