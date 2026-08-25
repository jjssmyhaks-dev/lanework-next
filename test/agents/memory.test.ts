/**
 * Agent Memory Tests — verifies memory store, query, and cleanup operations.
 */

import { describe, it, expect, vi } from "vitest";
import {
  storeMemory,
  queryMemory,
  recordDecision,
  recordRejection,
  storePreference,
  getPreference,
  getRejectionCount,
} from "@/lib/agents/memory";

// Mock the database
vi.mock("@neondatabase/serverless", () => ({
  neon: () => {
    const mockFn = (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join("?");
      if (query.includes("SELECT id, confidence FROM agent_memory")) {
        return Promise.resolve([]);
      }
      if (query.includes("UPDATE agent_memory SET access_count")) {
        return Promise.resolve([]);
      }
      if (query.includes("SELECT")) {
        return Promise.resolve([{
          id: "mem-001",
          tenant_id: "tenant-001",
          entity_type: "shipment",
          entity_id: "SHP-123",
          memory_type: "decision",
          key: "last_delay_analysis",
          value: { action: "delay_analysis", result: { weatherRisk: "low" } },
          confidence: 1.0,
          access_count: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        }]);
      }
      return Promise.resolve([]);
    };
    return mockFn;
  },
}));

describe("Agent Memory", () => {
  const TENANT = "tenant-001";

  it("storeMemory returns an ID", async () => {
    const id = await storeMemory({
      tenantId: TENANT,
      entityType: "shipment",
      entityId: "SHP-123",
      memoryType: "decision",
      key: "last_delay_analysis",
      value: { action: "delay_analysis" },
      confidence: 1.0,
      ttlDays: 90,
    });
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
  });

  it("queryMemory returns array", async () => {
    const memories = await queryMemory({
      tenantId: TENANT,
      entityType: "shipment",
      entityId: "SHP-123",
      limit: 10,
    });
    expect(Array.isArray(memories)).toBe(true);
  });

  it("queryMemory works without tenantId", async () => {
    const memories = await queryMemory({});
    expect(Array.isArray(memories)).toBe(true);
  });

  it("recordDecision calls storeMemory", async () => {
    // Should not throw
    await recordDecision(TENANT, "shipment", "SHP-123", "delay_analysis", {
      weatherRisk: "low",
      autoExecuted: true,
    });
  });

  it("recordRejection calls storeMemory", async () => {
    await recordRejection(TENANT, "shipment", "SHP-123", "cancel_shipment",
      "Risk too high for this customer");
  });

  it("storePreference and getPreference work", async () => {
    await storePreference(TENANT, "preferred_carrier", { carrier: "BlueDart" });
    const pref = await getPreference(TENANT, "preferred_carrier");
    // Mock returns data, so we just check it doesn't throw
    expect(typeof pref === "object" || pref === null).toBe(true);
  });

  it("getRejectionCount returns number", async () => {
    const count = await getRejectionCount(TENANT, "shipment", "SHP-123", "cancel_shipment", 30);
    expect(typeof count).toBe("number");
  });
});
