/**
 * Structured Request Logger
 * Logs API requests with timing, status, and context
 */

interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

export function logRequest(entry: Omit<LogEntry, "timestamp">) {
  const full: LogEntry = { ...entry, timestamp: new Date().toISOString() };
  logs.unshift(full);
  if (logs.length > MAX_LOGS) logs.pop();

  // Console output in dev
  if (process.env.NODE_ENV !== "production") {
    const color = entry.status >= 500 ? "\x1b[31m" : entry.status >= 400 ? "\x1b[33m" : "\x1b[32m";
    console.log(
      `${color}${entry.status}\x1b[0m ${entry.method} ${entry.path} ${entry.durationMs}ms${entry.userId ? ` [${entry.userId}]` : ""}`
    );
  }
}

/** Create a request timer */
export function createTimer() {
  const start = Date.now();
  return {
    end: (status: number, meta?: Partial<LogEntry>) => {
      logRequest({
        method: meta?.method || "GET",
        path: meta?.path || "/unknown",
        status,
        durationMs: Date.now() - start,
        userId: meta?.userId,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        error: meta?.error,
      });
    },
  };
}

/** Get recent logs */
export function getRecentLogs(limit: number = 50): LogEntry[] {
  return logs.slice(0, limit);
}

/** Get error logs */
export function getErrorLogs(limit: number = 20): LogEntry[] {
  return logs.filter(l => l.status >= 400).slice(0, limit);
}

/** Get stats */
export function getLogStats(): {
  totalRequests: number;
  errorRate: number;
  avgDurationMs: number;
  slowestRequests: LogEntry[];
} {
  const total = logs.length;
  const errors = logs.filter(l => l.status >= 400).length;
  const avgDuration = total > 0 ? logs.reduce((sum, l) => sum + l.durationMs, 0) / total : 0;
  const slowest = [...logs].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5);

  return {
    totalRequests: total,
    errorRate: total > 0 ? Math.round((errors / total) * 100) : 0,
    avgDurationMs: Math.round(avgDuration),
    slowestRequests: slowest,
  };
}
