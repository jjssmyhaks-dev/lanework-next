/**
 * Structured logger for Lanework — powered by Pino.
 * Outputs JSON in production, pretty-printed in development.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("Shipment created", { id, carrier });
 *   const child = logger.child({ module: "orchestrator" });
 *   child.error("Tool call failed", { error: err.message });
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),

  // Pretty-print in development, JSON in production
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),

  // Base context for all log entries
  base: {
    service: "lanework",
  },

  // Redact sensitive fields
  redact: {
    paths: ["password", "password_hash", "authorization", "cookie", "token", "secret", "api_key", "api_secret"],
    censor: "[REDACTED]",
  },
});

/**
 * Timing helper — returns a function that logs duration when called.
 *
 * ```ts
 * const end = logger.timer("shiprocket-api-call");
 * await fetch(url);
 * end({ carrier: "shiprocket" }); // logs: "shiprocket-api-call completed in 142ms"
 * ```
 */
export function timer(label: string): (data?: Record<string, unknown>) => void {
  const start = performance.now();
  return (data?: Record<string, unknown>) => {
    const duration = Math.round(performance.now() - start);
    logger.info({ durationMs: duration, ...data }, `${label} completed`);
  };
}
