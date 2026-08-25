/**
 * Circuit Breaker — prevents cascading MCP integration failures.
 *
 * States:
 * - CLOSED: normal operation, requests pass through
 * - OPEN: integration is down, requests fail fast
 * - HALF_OPEN: testing if integration recovered
 *
 * Transitions:
 * - CLOSED → OPEN: after `failureThreshold` consecutive failures
 * - OPEN → HALF_OPEN: after `recoveryTimeMs`
 * - HALF_OPEN → CLOSED: after `halfOpenSuccessThreshold` successes
 * - HALF_OPEN → OPEN: on any failure
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "circuit-breaker" });

// ── Types ──

export type CircuitState = "closed" | "open" | "half_open";

interface CircuitBreakerConfig {
  failureThreshold: number;       // consecutive failures before opening
  recoveryTimeMs: number;         // ms before trying again
  halfOpenSuccessThreshold: number; // successes to close from half-open
}

interface CircuitBreakerState {
  integration: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: number | null;
  lastStateChange: number;
}

// ── Default Config ──

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  recoveryTimeMs: 60_000,        // 60 seconds
  halfOpenSuccessThreshold: 2,
};

// ── In-Memory State ──

const circuits = new Map<string, CircuitBreakerState>();

// ── Core Functions ──

function getState(integration: string): CircuitBreakerState {
  const existing = circuits.get(integration);
  if (existing) return existing;

  const initial: CircuitBreakerState = {
    integration,
    state: "closed",
    failureCount: 0,
    successCount: 0,
    lastFailureAt: null,
    lastStateChange: Date.now(),
  };
  circuits.set(integration, initial);
  return initial;
}

function transition(integration: string, newState: CircuitState, reason: string): void {
  const circuit = getState(integration);
  const oldState = circuit.state;
  circuit.state = newState;
  circuit.lastStateChange = Date.now();

  if (newState === "open") {
    circuit.failureCount++;
    circuit.lastFailureAt = Date.now();
    circuit.successCount = 0;
  } else if (newState === "closed") {
    circuit.failureCount = 0;
    circuit.successCount = 0;
  } else if (newState === "half_open") {
    circuit.successCount = 0;
  }

  log.info({ integration, from: oldState, to: newState, reason }, "Circuit state transition");
}

/**
 * Check if a request should be allowed through the circuit breaker.
 * Returns { allowed, reason }.
 */
export function checkCircuit(integration: string, config?: Partial<CircuitBreakerConfig>): {
  allowed: boolean;
  state: CircuitState;
  reason: string;
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const circuit = getState(integration);

  switch (circuit.state) {
    case "closed":
      return { allowed: true, state: "closed", reason: "Normal operation" };

    case "open": {
      const elapsed = Date.now() - circuit.lastStateChange;
      if (elapsed >= cfg.recoveryTimeMs) {
        transition(integration, "half_open", `Recovery time elapsed (${elapsed}ms >= ${cfg.recoveryTimeMs}ms)`);
        return { allowed: true, state: "half_open", reason: "Recovery window — testing" };
      }
      return {
        allowed: false,
        state: "open",
        reason: `Circuit open — ${Math.ceil((cfg.recoveryTimeMs - elapsed) / 1000)}s until retry`,
      };
    }

    case "half_open":
      // Allow through for testing
      return { allowed: true, state: "half_open", reason: "Half-open — testing recovery" };
  }
}

/**
 * Record a success — moves toward closing the circuit.
 */
export function recordSuccess(integration: string, config?: Partial<CircuitBreakerConfig>): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const circuit = getState(integration);

  if (circuit.state === "half_open") {
    circuit.successCount++;
    if (circuit.successCount >= cfg.halfOpenSuccessThreshold) {
      transition(integration, "closed", `${circuit.successCount}/${cfg.halfOpenSuccessThreshold} half-open successes`);
    }
  } else if (circuit.state === "closed") {
    circuit.failureCount = 0; // Reset consecutive failure count
  }
}

/**
 * Record a failure — may open the circuit.
 */
export function recordFailure(integration: string, config?: Partial<CircuitBreakerConfig>): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const circuit = getState(integration);

  if (circuit.state === "half_open") {
    transition(integration, "open", "Failure during half-open recovery");
    return;
  }

  circuit.failureCount++;
  circuit.lastFailureAt = Date.now();

  if (circuit.failureCount >= cfg.failureThreshold) {
    transition(integration, "open", `${circuit.failureCount}/${cfg.failureThreshold} consecutive failures`);
  }
}

/**
 * Get the current state of a circuit breaker.
 */
export function getCircuitStatus(integration: string): CircuitBreakerState & {
  config: CircuitBreakerConfig;
  timeUntilRetryMs: number | null;
} {
  const circuit = getState(integration);
  const config = DEFAULT_CONFIG;

  let timeUntilRetryMs: number | null = null;
  if (circuit.state === "open" && circuit.lastFailureAt) {
    const elapsed = Date.now() - circuit.lastFailureAt;
    timeUntilRetryMs = Math.max(0, config.recoveryTimeMs - elapsed);
  }

  return { ...circuit, config, timeUntilRetryMs };
}

/**
 * Get all circuit breaker statuses.
 */
export function getAllCircuitStatuses(): ReturnType<typeof getCircuitStatus>[] {
  const statuses: ReturnType<typeof getCircuitStatus>[] = [];
  for (const integration of circuits.keys()) {
    statuses.push(getCircuitStatus(integration));
  }
  return statuses;
}

/**
 * Force-reset a circuit breaker to closed state.
 */
export function resetCircuit(integration: string): void {
  const circuit = getState(integration);
  transition(integration, "closed", "Manual reset");
  log.info({ integration }, "Circuit manually reset");
}

/**
 * Wrap a function with circuit breaker protection.
 * Returns the result if allowed, or throws if circuit is open.
 */
export async function withCircuitBreaker<T>(
  integration: string,
  fn: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const check = checkCircuit(integration, config);
  if (!check.allowed) {
    log.warn({ integration, state: check.state, reason: check.reason }, "Circuit breaker blocked request");
    return {
      success: false,
      mode: "circuit_open",
      message: `${integration} is temporarily unavailable (${check.reason}). Try again shortly.`,
    } as unknown as T;
  }

  try {
    const result = await fn();
    recordSuccess(integration, config);
    return result;
  } catch (error) {
    recordFailure(integration, config);
    throw error;
  }
}
