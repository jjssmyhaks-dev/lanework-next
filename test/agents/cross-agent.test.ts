import { describe, it, expect, vi } from "vitest";
import { isCapabilityAvailableForPlan, isActionSupported, getCapabilityMatrix } from "@/lib/agents/capabilities";

vi.mock("@neondatabase/serverless", () => ({
  neon: () => (strings: TemplateStringsArray) => Promise.resolve([]),
}));

describe("Agent Capabilities", () => {
  it("isCapabilityAvailableForPlan returns available for matching plan", () => {
    const r = isCapabilityAvailableForPlan("shipment-tracking", "free");
    expect(r.available).toBe(true);
  });

  it("isCapabilityAvailableForPlan returns unavailable for lower plan", () => {
    const r = isCapabilityAvailableForPlan("e-way-bill", "free");
    expect(r.available).toBe(false);
    expect(r.reason).toContain("growth");
  });

  it("isCapabilityAvailableForPlan returns unknown capability", () => {
    const r = isCapabilityAvailableForPlan("nonexistent", "enterprise");
    expect(r.available).toBe(false);
    expect(r.reason).toContain("Unknown");
  });

  it("isActionSupported returns correct results", () => {
    const r1 = isActionSupported("track_shipment");
    expect(r1.supported).toBe(true);
    expect(r1.capability).toBe("shipment-tracking");

    const r2 = isActionSupported("nonexistent_action");
    expect(r2.supported).toBe(false);
  });

  it("getCapabilityMatrix returns all capabilities", () => {
    const matrix = getCapabilityMatrix();
    expect(matrix.length).toBeGreaterThanOrEqual(8);
    expect(matrix[0]).toHaveProperty("name");
    expect(matrix[0]).toHaveProperty("integrations");
    expect(matrix[0]).toHaveProperty("planRequired");
  });
});
