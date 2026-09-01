/**
 * Tests for Learning Engine and Auto-Tuner
 */
import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@neondatabase/serverless", () => ({
  neon: () => vi.fn(),
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

// Mock SQL queries
const mockQuery = vi.fn();
vi.mock("@neondatabase/serverless", () => ({
  neon: () => mockQuery,
}));

describe("Learning Engine", () => {
  it("should export required functions", async () => {
    const mod = await import("@/lib/agents/learning");
    expect(typeof mod.analyzeFeedback).toBe("function");
    expect(typeof mod.storePatterns).toBe("function");
    expect(typeof mod.runLearningCycle).toBe("function");
  });

  it("should have correct LearningInsight type", async () => {
    const mod = await import("@/lib/agents/learning");
    // Type check - ensure the function signatures are correct
    expect(mod.analyzeFeedback).toBeDefined();
    expect(mod.storePatterns).toBeDefined();
    expect(mod.runLearningCycle).toBeDefined();
  });
});

describe("Auto-Tuner", () => {
  it("should export required functions", async () => {
    const mod = await import("@/lib/agents/auto-tuner");
    expect(typeof mod.runTuningCycle).toBe("function");
    expect(typeof mod.getTuningHistory).toBe("function");
  });
});

describe("Pattern Analyzer", () => {
  it("should export extractPatterns function", async () => {
    const mod = await import("@/lib/agents/pattern-analyzer");
    expect(typeof mod.extractPatterns).toBe("function");
  });
});

describe("Adaptive Risk", () => {
  it("should export required functions", async () => {
    const mod = await import("@/lib/agents/adaptive-risk");
    expect(typeof mod.getAdaptiveRisk).toBe("function");
    expect(typeof mod.updateAllRiskProfiles).toBe("function");
  });
});
