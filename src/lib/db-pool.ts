/**
 * Database connection pool monitoring
 * Neon serverless handles pooling — this tracks usage patterns
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

interface PoolStats {
  activeQueries: number;
  totalQueries: number;
  lastError?: string;
  lastErrorTime?: string;
  uptime: number;
}

const stats: PoolStats = {
  activeQueries: 0,
  totalQueries: 0,
  uptime: Date.now(),
};

/** Wrap a query to track stats */
export async function trackedQuery<T extends any[]>(
  queryFn: () => Promise<T>
): Promise<T> {
  stats.activeQueries++;
  stats.totalQueries++;
  try {
    const result = await queryFn();
    return result;
  } catch (error: any) {
    stats.lastError = error?.message || "Unknown error";
    stats.lastErrorTime = new Date().toISOString();
    throw error;
  } finally {
    stats.activeQueries--;
  }
}

/** Get pool stats */
export function getPoolStats(): PoolStats {
  return { ...stats };
}

/** Health check — verify DB connectivity */
export async function dbHealthCheck(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await sql`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error: any) {
    return { ok: false, latencyMs: Date.now() - start, error: error?.message };
  }
}
