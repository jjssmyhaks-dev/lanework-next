import { describe, it, expect, vi } from "vitest";

vi.mock("@neondatabase/serverless", () => ({
  neon: () => (strings: TemplateStringsArray) => {
    const q = strings.join("?");
    if (q.includes("agent_audit_log") && q.includes("success = false")) {
      return Promise.resolve([{
        agent_type: "shipment_tracking",
        action: "track_shipment",
        input_data: { awb: "SH-123" },
        error_message: "Connection timeout",
        timestamp: new Date(),
      }]);
    }
    if (q.includes("agent_feedback") && q.includes("thumbs_down")) {
      return Promise.resolve([{
        agent_type: "shipment_tracking",
        rating: "thumbs_down",
        comment: "Wrong status shown",
        context: { awb: "SH-456" },
        created_at: new Date(),
      }]);
    }
    if (q.includes("agent_approvals") && q.includes("rejected")) {
      return Promise.resolve([{
        agent_type: "shipment_tracking",
        action_type: "cancel_shipment",
        action_description: "Cancel shipment",
        risk_score: 8,
        decision_reason: "Risk too high",
        created_at: new Date(),
      }]);
    }
    if (q.includes("INSERT INTO agent_eval_cases")) return Promise.resolve([]);
    if (q.includes("agent_eval_cases")) return Promise.resolve([]);
    return Promise.resolve([]);
  },
}));

describe("Eval Auto-Generation", () => {
  it("generateAndStoreEvalCases returns result object", async () => {
    const { generateAndStoreEvalCases } = await import("@/lib/agents/eval-autogen");
    const result = await generateAndStoreEvalCases(7, 10);
    expect(result).toHaveProperty("generated");
    expect(result).toHaveProperty("stored");
    expect(result).toHaveProperty("sources");
    expect(result.sources).toHaveProperty("production_failure");
    expect(result.sources).toHaveProperty("user_correction");
    expect(result.sources).toHaveProperty("rejected_approval");
  });

  it("getGeneratedEvalCases returns array", async () => {
    const { getGeneratedEvalCases } = await import("@/lib/agents/eval-autogen");
    const cases = await getGeneratedEvalCases(10);
    expect(Array.isArray(cases)).toBe(true);
  });
});
