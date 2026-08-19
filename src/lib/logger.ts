/**
 * Structured logger for Lanework.
 * Outputs JSON in production, human-readable in development.
 * Replaces console.error/console.log across the codebase.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  time: string;
  msg: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }
  // Dev: human-readable with colors
  const { level, time, msg, ...rest } = entry;
  const color =
    level === "error" ? "\x1b[31m" :
    level === "warn" ? "\x1b[33m" :
    level === "info" ? "\x1b[36m" : "\x1b[90m";
  const reset = "\x1b[0m";
  const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
  return `${color}[${time}] ${level.toUpperCase()}${reset} ${msg}${extra}`;
}

function log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    level,
    time: new Date().toISOString(),
    msg,
    ...data,
  };
  const formatted = formatEntry(entry);
  if (level === "error") console.error(formatted);
  else if (level === "warn") console.warn(formatted);
  else console.log(formatted);
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),

  /** Create a child logger with a fixed context prefix */
  child(context: Record<string, unknown>) {
    return {
      debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, { ...context, ...data }),
      info: (msg: string, data?: Record<string, unknown>) => log("info", msg, { ...context, ...data }),
      warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, { ...context, ...data }),
      error: (msg: string, data?: Record<string, unknown>) => log("error", msg, { ...context, ...data }),
    };
  },
};

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
    logger.info(`${label} completed`, { durationMs: duration, ...data });
  };
}
