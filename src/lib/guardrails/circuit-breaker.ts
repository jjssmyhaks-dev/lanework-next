/**
 * Circuit Breaker — prevents cascading failures when external APIs are down.
 *
 * States:
 * - CLOSED: Normal operation, calls pass through
 * - OPEN: API is failing, calls are blocked for cooldown period
 * - HALF_OPEN: Cooldown expired, allowing one test call
 *
 * Configuration per integration:
 * - failureThreshold: failures before opening circuit (default: 5)
 * - cooldownMs: time before trying again (default: 5 min)
 * - successThreshold: successes in half-open to close circuit (default: 2)
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "circuit-breaker" });

type CircuitState = "closed" | "open" | "half_open";

interface CircuitEntry {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureAt: number;
  openedAt: number;
}

interface CircuitConfig {
  failureThreshold: number;
  cooldownMs: number;
  successThreshold: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  cooldownMs: 5 * 60 * 1000, // 5 minutes
  successThreshold: 2,
};

// ── Per-integration circuit state ──

const circuits = new Map<string, CircuitEntry>();
const configs = new Map<string, CircuitConfig>();

function getConfig(integration: string): CircuitConfig {
  return configs.get(integration) || DEFAULT_CONFIG;
}

function getEntry(integration: string): CircuitEntry {
  if (!circuits.has(integration)) {
    circuits.set(integration, {
      state: "closed",
      failures: 0,
      successes: 0,
      lastFailureAt: 0,
      openedAt: 0,
    });
  }
  return circuits.get(integration)!;
}

// ── Configure a specific integration ──

export function configureCircuitBreaker(integration: string, config: Partial<CircuitConfig>): void {
  configs.set(integration, { ...DEFAULT_CONFIG, ...config });
  log.info({ integration, config: configs.get(integration) }, "Circuit breaker configured");
}

// ── Check if a call is allowed ──

export function isAllowed(integration: string): boolean {
  const entry = getEntry(integration);
  const config = getConfig(integration);

  switch (entry.state) {
    case "closed":
      return true;

    case "open": {
      const elapsed = Date.now() - entry.openedAt;
      if (elapsed >= config.cooldownMs) {
        entry.state = "half_open";
        entry.successes = 0;
        log.info({ integration }, "Circuit half-open — allowing test call");
        return true;
      }
      return false;
    }

    case "half_open":
      return true; // Allow one test call
  }
}

// ── Record a success ──

export function recordSuccess(integration: string): void {
  const entry = getEntry(integration);
  const config = getConfig(integration);

  switch (entry.state) {
    case "closed":
      entry.failures = 0; // Reset failure count on success
      break;

    case "half_open":
      entry.successes++;
      if (entry.successes >= config.successThreshold) {
        entry.state = "closed";
        entry.failures = 0;
        entry.successes = 0;
        log.info({ integration }, "Circuit closed — API recovered");
      }
      break;
  }
}

// ── Record a failure ──

export function recordFailure(integration: string): void {
  const entry = getEntry(integration);
  const config = getConfig(integration);

  entry.failures++;
  entry.lastFailureAt = Date.now();

  switch (entry.state) {
    case "closed":
      if (entry.failures >= config.failureThreshold) {
        entry.state = "open";
        entry.openedAt = Date.now();
        log.warn({ integration, failures: entry.failures }, "Circuit OPENED — API failing, blocking calls");
      }
      break;

    case "half_open":
      // Test call failed — reopen
      entry.state = "open";
      entry.openedAt = Date.now();
      log.warn({ integration }, "Circuit reopened — test call failed");
      break;
  }
}

// ── Get circuit status (for dashboard) ──

export function getCircuitStatus(): Array<{
  integration: string;
  state: CircuitState;
  failures: number;
  lastFailureAt: number | null;
  cooldownRemainingMs: number | null;
}> {
  const status: Array<{
    integration: string;
    state: CircuitState;
    failures: number;
    lastFailureAt: number | null;
    cooldownRemainingMs: number | null;
  }> = [];

  for (const [integration, entry] of circuits) {
    const config = getConfig(integration);
    let cooldownRemaining = null;

    if (entry.state === "open") {
      const elapsed = Date.now() - entry.openedAt;
      cooldownRemaining = Math.max(0, config.cooldownMs - elapsed);
    }

    status.push({
      integration,
      state: entry.state,
      failures: entry.failures,
      lastFailureAt: entry.lastFailureAt || null,
      cooldownRemainingMs: cooldownRemaining,
    });
  }

  return status;
}

// ── Reset a circuit (manual override) ──

export function resetCircuit(integration: string): void {
  circuits.delete(integration);
  log.info({ integration }, "Circuit manually reset");
}

// ── Decorator for MCP calls ──

export async function withCircuitBreaker<T>(
  integration: string,
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  if (!isAllowed(integration)) {
    const entry = getEntry(integration);
    log.warn({ integration, failures: entry.failures }, "Circuit open — call blocked");

    if (fallback) {
      return fallback();
    }
    throw new Error(`Circuit breaker open for ${integration} — API is temporarily unavailable`);
  }

  try {
    const result = await fn();
    recordSuccess(integration);
    return result;
  } catch (error) {
    recordFailure(integration);

    if (fallback) {
      return fallback();
    }
    throw error;
  }
}
