import { describe, it, expect, beforeEach } from "vitest";
import {
  checkAgentLimit,
  acquireToken,
  releaseToken,
  getAgentLimitStatus,
} from "@/lib/agents/agent-limiter";

describe("Agent Rate Limiter", () => {
  it("checkAgentLimit returns allowed for fresh agent", () => {
    const check = checkAgentLimit("shipment-poller");
    expect(check.allowed).toBe(true);
    expect(check.maxTokens).toBe(20);
    expect(check.maxConcurrent).toBe(3);
  });

  it("acquireToken succeeds for available agent", () => {
    const acquired = acquireToken("fleet-poller");
    expect(typeof acquired).toBe("boolean");
    releaseToken("fleet-poller");
  });

  it("releaseToken decrements concurrent count", () => {
    acquireToken("inventory-poller");
    const before = checkAgentLimit("inventory-poller");
    const concurrentBefore = before.concurrent;
    releaseToken("inventory-poller");
    const after = checkAgentLimit("inventory-poller");
    expect(after.concurrent).toBeLessThanOrEqual(concurrentBefore);
  });

  it("getAgentLimitStatus returns all agents", () => {
    const status = getAgentLimitStatus();
    expect(Array.isArray(status)).toBe(true);
    expect(status.length).toBeGreaterThanOrEqual(6);
    expect(status[0]).toHaveProperty("agentType");
    expect(status[0]).toHaveProperty("tokens");
    expect(status[0]).toHaveProperty("maxTokens");
    expect(status[0]).toHaveProperty("concurrent");
    expect(status[0]).toHaveProperty("maxConcurrent");
  });

  it("unknown agent uses default limits", () => {
    const check = checkAgentLimit("unknown-poller");
    expect(check.allowed).toBe(true);
    expect(check.maxTokens).toBe(10);
    expect(check.maxConcurrent).toBe(2);
  });

  it("concurrent limit blocks when max reached", () => {
    const agent = "compliance-poller";
    // Fill up concurrent slots
    acquireToken(agent);
    acquireToken(agent);
    const check = checkAgentLimit(agent);
    expect(check.concurrent).toBeGreaterThanOrEqual(1);
    releaseToken(agent);
    releaseToken(agent);
  });
});
