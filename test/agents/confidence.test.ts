import { describe, it, expect, vi } from "vitest";
import { calculateRawConfidence } from "@/lib/agents/confidence";

vi.mock("@neondatabase/serverless", () => ({
  neon: () => (strings: TemplateStringsArray) => {
    const q = strings.join("?");
    if (q.includes("SELECT")) return Promise.resolve([{ total: 10, with_outcome: 8, correct: 6, avg_confidence: 0.7 }]);
    if (q.includes("GROUP BY action_type")) return Promise.resolve([
      { action_type: "track_shipment", sample_size: 20, avg_confidence: 0.8, actual_accuracy: 0.75, error: 0.05 },
    ]);
    return Promise.resolve([]);
  },
}));

describe("Confidence Calibration", () => {
  it("calculateRawConfidence returns value between 0 and 1", () => {
    const c = calculateRawConfidence({
      actionType: "track_shipment",
      riskScore: 2,
      contextDataPoints: 10,
      hasMcpSupport: true,
      previousSuccessRate: 0.9,
    });
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(1);
  });

  it("low risk → higher confidence", () => {
    const lowRisk = calculateRawConfidence({ actionType: "x", riskScore: 1, contextDataPoints: 5, hasMcpSupport: true });
    const highRisk = calculateRawConfidence({ actionType: "x", riskScore: 8, contextDataPoints: 5, hasMcpSupport: true });
    expect(lowRisk).toBeGreaterThan(highRisk);
  });

  it("more data points → higher confidence", () => {
    const more = calculateRawConfidence({ actionType: "x", riskScore: 5, contextDataPoints: 15, hasMcpSupport: false });
    const less = calculateRawConfidence({ actionType: "x", riskScore: 5, contextDataPoints: 1, hasMcpSupport: false });
    expect(more).toBeGreaterThan(less);
  });

  it("MCP support → higher confidence", () => {
    const withMcp = calculateRawConfidence({ actionType: "x", riskScore: 5, contextDataPoints: 5, hasMcpSupport: true });
    const withoutMcp = calculateRawConfidence({ actionType: "x", riskScore: 5, contextDataPoints: 5, hasMcpSupport: false });
    expect(withMcp).toBeGreaterThan(withoutMcp);
  });

  it("previous success rate influences confidence", () => {
    const high = calculateRawConfidence({ actionType: "x", riskScore: 5, contextDataPoints: 5, hasMcpSupport: false, previousSuccessRate: 0.95 });
    const low = calculateRawConfidence({ actionType: "x", riskScore: 5, contextDataPoints: 5, hasMcpSupport: false, previousSuccessRate: 0.3 });
    expect(high).toBeGreaterThan(low);
  });
});
