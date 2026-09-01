/**
 * Tests for the Workflow Engine
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@neondatabase/serverless", () => ({
  neon: () => vi.fn(),
}));

vi.mock("@/lib/mcp", () => ({
  callMcpAction: vi.fn().mockResolvedValue({ success: true, mode: "simulated" }),
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

vi.mock("@/lib/agents/events", () => ({
  emitEvent: vi.fn().mockResolvedValue("event-id"),
  onEvent: vi.fn(),
}));

import { WORKFLOW_DEFINITIONS, getWorkflowForEvent, getAllWorkflows } from "@/lib/agents/workflows/index";

describe("Workflow Definitions", () => {
  it("should have 5 pre-built workflows", () => {
    expect(WORKFLOW_DEFINITIONS).toHaveLength(5);
  });

  it("should have unique IDs", () => {
    const ids = WORKFLOW_DEFINITIONS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should all be enabled by default", () => {
    for (const wf of WORKFLOW_DEFINITIONS) {
      expect(wf.enabled).toBe(true);
    }
  });

  it("should have steps for each workflow", () => {
    for (const wf of WORKFLOW_DEFINITIONS) {
      expect(wf.steps.length).toBeGreaterThan(0);
    }
  });

  it("should have valid step types", () => {
    const validTypes = ["mcp", "db", "event", "condition", "delay"];
    for (const wf of WORKFLOW_DEFINITIONS) {
      for (const step of wf.steps) {
        expect(validTypes).toContain(step.type);
      }
    }
  });
});

describe("getWorkflowForEvent", () => {
  it("should find delay alert workflow", () => {
    const wf = getWorkflowForEvent("shipment.delayed");
    expect(wf).toBeDefined();
    expect(wf?.id).toBe("wf-delay-alert");
  });

  it("should find auto-reorder workflow", () => {
    const wf = getWorkflowForEvent("stock.below_reorder");
    expect(wf).toBeDefined();
    expect(wf?.id).toBe("wf-auto-reorder");
  });

  it("should find new order workflow", () => {
    const wf = getWorkflowForEvent("order.new");
    expect(wf).toBeDefined();
    expect(wf?.id).toBe("wf-new-order");
  });

  it("should find compliance workflow", () => {
    const wf = getWorkflowForEvent("compliance.license_expiring");
    expect(wf).toBeDefined();
    expect(wf?.id).toBe("wf-compliance-check");
  });

  it("should find fleet maintenance workflow", () => {
    const wf = getWorkflowForEvent("fleet.maintenance_due");
    expect(wf).toBeDefined();
    expect(wf?.id).toBe("wf-fleet-maintenance");
  });

  it("should return undefined for unknown event type", () => {
    const wf = getWorkflowForEvent("unknown.event");
    expect(wf).toBeUndefined();
  });
});

describe("getAllWorkflows", () => {
  it("should return all workflows", () => {
    const all = getAllWorkflows();
    expect(all.length).toBe(5);
  });
});
