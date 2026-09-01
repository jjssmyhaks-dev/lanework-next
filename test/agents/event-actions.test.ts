/**
 * Tests for Event Actions — handler registration and reasoning chain
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies
vi.mock("@neondatabase/serverless", () => ({
  neon: () => vi.fn(),
}));

vi.mock("@/lib/mcp", () => ({
  callMcpAction: vi.fn().mockResolvedValue({ success: true, mode: "simulated", overallRisk: "low" }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@/lib/agents/events", () => {
  const handlers = new Map();
  return {
    onEvent: vi.fn((type: string, handler: any) => {
      if (!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(handler);
    }),
    emitEvent: vi.fn().mockResolvedValue("event-id"),
    getRegisteredHandlers: () => handlers,
  };
});

vi.mock("@/lib/agents/trust", () => ({
  evaluateAction: vi.fn().mockResolvedValue({
    allowed: true,
    trustLevel: "auto_low_risk",
    risk: { score: 2, factors: { financialImpact: 1, reversibility: 9, customerImpact: 1 }, requiresApproval: false, reason: "Low risk" },
    reason: "Low risk",
  }),
}));

vi.mock("@/lib/agents/audit-trail", () => ({
  auditLog: vi.fn().mockResolvedValue("audit-id"),
}));

vi.mock("@/lib/agents/memory", () => ({
  recordDecision: vi.fn().mockResolvedValue(undefined),
  recordRejection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/agents/confidence", () => ({
  recordPrediction: vi.fn().mockResolvedValue(undefined),
  calculateRawConfidence: vi.fn().mockReturnValue(0.8),
}));

describe("Event Actions", () => {
  it("should export registerEventHandlers function", async () => {
    const mod = await import("@/lib/agents/event-actions");
    expect(typeof mod.registerEventHandlers).toBe("function");
  });

  it("should register handlers when called", async () => {
    const { registerEventHandlers } = await import("@/lib/agents/event-actions");
    const { onEvent } = await import("@/lib/agents/events");

    registerEventHandlers();

    // Should have registered handlers for multiple event types
    expect(onEvent).toHaveBeenCalled();
    const calls = (onEvent as any).mock.calls;
    const eventTypes = calls.map((c: any[]) => c[0]);
    expect(eventTypes).toContain("shipment.delayed");
    expect(eventTypes).toContain("stock.below_reorder");
    expect(eventTypes).toContain("stock.out_of_stock");
    expect(eventTypes).toContain("fleet.maintenance_due");
    expect(eventTypes).toContain("compliance.license_expiring");
    expect(eventTypes).toContain("delivery.completed");
    expect(eventTypes).toContain("daily.report");
  });
});
