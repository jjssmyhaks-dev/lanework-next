/**
 * Circuit Breaker Tests — verifies the state machine transitions:
 * CLOSED → OPEN → HALF_OPEN → CLOSED
 * CLOSED → OPEN → HALF_OPEN → OPEN
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  checkCircuit,
  recordSuccess,
  recordFailure,
  getCircuitStatus,
  resetCircuit,
  withCircuitBreaker,
} from "@/lib/agents/circuit-breaker";

const TEST_INTEGRATION = "test-integration";
const CONFIG = {
  failureThreshold: 3,
  recoveryTimeMs: 100, // Fast for testing
  halfOpenSuccessThreshold: 2,
};

describe("Circuit Breaker", () => {
  beforeEach(() => {
    // Reset the circuit before each test
    resetCircuit(TEST_INTEGRATION);
  });

  it("starts in CLOSED state", () => {
    const check = checkCircuit(TEST_INTEGRATION, CONFIG);
    expect(check.allowed).toBe(true);
    expect(check.state).toBe("closed");
  });

  it("stays CLOSED below failure threshold", () => {
    recordFailure(TEST_INTEGRATION, CONFIG);
    recordFailure(TEST_INTEGRATION, CONFIG);
    const check = checkCircuit(TEST_INTEGRATION, CONFIG);
    expect(check.state).toBe("closed");
    expect(check.allowed).toBe(true);
  });

  it("transitions to OPEN after failure threshold", () => {
    recordFailure(TEST_INTEGRATION, CONFIG);
    recordFailure(TEST_INTEGRATION, CONFIG);
    recordFailure(TEST_INTEGRATION, CONFIG);
    const check = checkCircuit(TEST_INTEGRATION, CONFIG);
    expect(check.state).toBe("open");
    expect(check.allowed).toBe(false);
  });

  it("rejects requests when OPEN", () => {
    for (let i = 0; i < 3; i++) recordFailure(TEST_INTEGRATION, CONFIG);
    const check = checkCircuit(TEST_INTEGRATION, CONFIG);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Circuit open");
  });

  it("transitions to HALF_OPEN after recovery time", async () => {
    for (let i = 0; i < 3; i++) recordFailure(TEST_INTEGRATION, CONFIG);
    // Wait for recovery
    await new Promise((r) => setTimeout(r, 150));
    const check = checkCircuit(TEST_INTEGRATION, CONFIG);
    expect(check.state).toBe("half_open");
    expect(check.allowed).toBe(true);
  });

  it("transitions to CLOSED after enough successes in HALF_OPEN", async () => {
    for (let i = 0; i < 3; i++) recordFailure(TEST_INTEGRATION, CONFIG);
    await new Promise((r) => setTimeout(r, 150));
    // Trigger open → half_open transition
    checkCircuit(TEST_INTEGRATION, CONFIG);
    // Now in half_open, record successes
    recordSuccess(TEST_INTEGRATION, CONFIG);
    recordSuccess(TEST_INTEGRATION, CONFIG);
    const check = checkCircuit(TEST_INTEGRATION, CONFIG);
    expect(check.state).toBe("closed");
  });

  it("transitions back to OPEN on failure during HALF_OPEN", async () => {
    for (let i = 0; i < 3; i++) recordFailure(TEST_INTEGRATION, CONFIG);
    await new Promise((r) => setTimeout(r, 150));
    // Trigger open → half_open transition
    checkCircuit(TEST_INTEGRATION, CONFIG);
    // Now in half_open, record failure
    recordFailure(TEST_INTEGRATION, CONFIG);
    const check = checkCircuit(TEST_INTEGRATION, CONFIG);
    expect(check.state).toBe("open");
  });

  it("resets failure count on success in CLOSED", () => {
    recordFailure(TEST_INTEGRATION, CONFIG);
    recordFailure(TEST_INTEGRATION, CONFIG);
    recordSuccess(TEST_INTEGRATION, CONFIG);
    const status = getCircuitStatus(TEST_INTEGRATION);
    expect(status.failureCount).toBe(0);
  });

  it("withCircuitBreaker blocks when circuit is open", async () => {
    for (let i = 0; i < 3; i++) recordFailure(TEST_INTEGRATION, CONFIG);
    const result = await withCircuitBreaker(
      TEST_INTEGRATION,
      async () => ({ success: true }),
      CONFIG
    );
    expect((result as any).success).toBe(false);
    expect((result as any).mode).toBe("circuit_open");
  });

  it("withCircuitBreaker executes when circuit is closed", async () => {
    const result = await withCircuitBreaker(
      TEST_INTEGRATION,
      async () => ({ success: true, data: "ok" }),
      CONFIG
    );
    expect(result).toEqual({ success: true, data: "ok" });
  });

  it("getCircuitStatus returns correct info", () => {
    recordFailure(TEST_INTEGRATION, CONFIG);
    const status = getCircuitStatus(TEST_INTEGRATION);
    expect(status.integration).toBe(TEST_INTEGRATION);
    expect(status.failureCount).toBe(1);
    expect(status.state).toBe("closed");
  });

  it("resetCircuit forces closed state", () => {
    for (let i = 0; i < 3; i++) recordFailure(TEST_INTEGRATION, CONFIG);
    resetCircuit(TEST_INTEGRATION);
    const check = checkCircuit(TEST_INTEGRATION, CONFIG);
    expect(check.state).toBe("closed");
    expect(check.allowed).toBe(true);
  });
});
