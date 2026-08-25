import { describe, it, expect, vi } from "vitest";
import { getEscalationStats } from "@/lib/agents/approval-escalation";

vi.mock("@neondatabase/serverless", () => ({
  neon: () => (strings: TemplateStringsArray) => {
    const q = strings.join("?");
    if (q.includes("SELECT")) {
      return Promise.resolve([{
        pending_count: 5,
        escalated_count: 2,
        avg_wait_minutes: 120,
        oldest_wait_minutes: 480,
      }]);
    }
    return Promise.resolve([]);
  },
}));

describe("Approval Escalation", () => {
  it("getEscalationStats returns stats object", async () => {
    const stats = await getEscalationStats();
    expect(stats).toHaveProperty("pendingCount");
    expect(stats).toHaveProperty("escalatedCount");
    expect(stats).toHaveProperty("avgWaitTimeMinutes");
    expect(stats).toHaveProperty("oldestPendingMinutes");
  });

  it("getEscalationStats returns correct types", async () => {
    const stats = await getEscalationStats();
    expect(typeof stats.pendingCount).toBe("number");
    expect(typeof stats.escalatedCount).toBe("number");
    expect(typeof stats.avgWaitTimeMinutes).toBe("number");
  });
});
