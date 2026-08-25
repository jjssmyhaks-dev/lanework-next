/**
 * Dead Letter Queue Tests — verifies DLQ operations:
 * push, get, stats, discard (skip retry as it re-emits events)
 */

import { describe, it, expect, vi } from "vitest";
import {
  pushToDeadLetter,
  getDeadLetters,
  getDLQStats,
  discardDeadLetter,
} from "@/lib/agents/dlq";

// Mock the database
vi.mock("@neondatabase/serverless", () => ({
  neon: () => {
    const mockFn = (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join("?");
      // Return mock data based on query pattern
      if (query.includes("SELECT id, attempts FROM agent_dead_letters")) {
        return Promise.resolve([]);
      }
      if (query.includes("SELECT")) {
        return Promise.resolve([{
          total: 5, pending: 3, retrying: 1, discarded: 0, recovered: 1, avg_attempts: 1.5,
          created_at: new Date().toISOString(),
        }]);
      }
      return Promise.resolve([]);
    };
    return mockFn;
  },
}));

describe("Dead Letter Queue", () => {
  it("pushToDeadLetter returns an ID", async () => {
    const id = await pushToDeadLetter({
      eventId: "evt-001",
      eventType: "shipment.delayed",
      source: "poller",
      data: { trackingNumber: "SH-123" },
      error: "Connection timeout",
      attempts: 1,
    });
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
  });

  it("getDeadLetters returns array", async () => {
    const letters = await getDeadLetters({ limit: 10 });
    expect(Array.isArray(letters)).toBe(true);
  });

  it("getDLQStats returns stats object", async () => {
    const stats = await getDLQStats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("pending");
    expect(stats).toHaveProperty("avgAttempts");
  });

  it("discardDeadLetter returns boolean", async () => {
    const success = await discardDeadLetter("test-id");
    expect(typeof success).toBe("boolean");
  });
});
