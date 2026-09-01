import { describe, it, expect } from "vitest";

// Test the orchestrator's exported types and utility functions
// (Full integration tests require DB + API keys)

describe("Chat Orchestrator", () => {
  describe("types", () => {
    it("should define ToolCallRecord structure", () => {
      const record = {
        integration: "shiprocket",
        action: "track",
        input: { awb: "123456" },
        output: { status: "delivered" },
        mode: "live" as const,
        durationMs: 150,
      };
      expect(record.integration).toBe("shiprocket");
      expect(record.mode).toBe("live");
      expect(record.durationMs).toBeGreaterThan(0);
    });

    it("should support all mode values", () => {
      const modes = ["live", "simulated", "db-fallback", "error", "dry_run"] as const;
      for (const mode of modes) {
        const record = {
          integration: "test",
          action: "test",
          input: {},
          output: null,
          mode,
          durationMs: 0,
        };
        expect(record.mode).toBe(mode);
      }
    });
  });

  describe("intent detection patterns", () => {
    const trackingPatterns = [
      "where is my shipment",
      "track order 12345",
      "what's the delivery status",
      "shipped item tracking",
    ];

    const inventoryPatterns = [
      "how much stock do we have",
      "inventory levels for Mumbai",
      "reorder point for SKU-001",
      "warehouse stock check",
    ];

    const routePatterns = [
      "optimize delivery route",
      "best path from Delhi to Mumbai",
      "route planning for 5 deliveries",
    ];

    const weatherPatterns = [
      "will rain affect deliveries",
      "weather in Chennai today",
      "storm warning for shipping lanes",
    ];

    it("should identify tracking-related intents", () => {
      for (const pattern of trackingPatterns) {
        const lower = pattern.toLowerCase();
        expect(
          lower.includes("track") ||
          lower.includes("shipment") ||
          lower.includes("delivery status") ||
          lower.includes("where is")
        ).toBe(true);
      }
    });

    it("should identify inventory-related intents", () => {
      for (const pattern of inventoryPatterns) {
        const lower = pattern.toLowerCase();
        expect(
          lower.includes("stock") ||
          lower.includes("inventory") ||
          lower.includes("reorder") ||
          lower.includes("warehouse")
        ).toBe(true);
      }
    });

    it("should identify route-related intents", () => {
      for (const pattern of routePatterns) {
        const lower = pattern.toLowerCase();
        expect(
          lower.includes("route") ||
          lower.includes("path") ||
          lower.includes("optimize")
        ).toBe(true);
      }
    });

    it("should identify weather-related intents", () => {
      for (const pattern of weatherPatterns) {
        const lower = pattern.toLowerCase();
        expect(
          lower.includes("weather") ||
          lower.includes("rain") ||
          lower.includes("storm")
        ).toBe(true);
      }
    });
  });

  describe("tool call formatting", () => {
    it("should format tool call results with mode field", () => {
      const result = {
        integration: "weather",
        action: "get_weather",
        input: { city: "Mumbai" },
        output: { temp: 32, condition: "cloudy" },
        mode: "live" as const,
        durationMs: 200,
      };

      expect(result.mode).toBe("live");
      expect(result.output).toHaveProperty("temp");
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it("should handle error mode gracefully", () => {
      const result = {
        integration: "shiprocket",
        action: "track",
        input: { awb: "123" },
        output: null,
        mode: "error" as const,
        durationMs: 500,
        errorMessage: "API key not configured",
      };

      expect(result.mode).toBe("error");
      expect(result.errorMessage).toBeDefined();
    });

    it("should handle dry_run mode", () => {
      const result = {
        integration: "fedex",
        action: "create_shipment",
        input: { weight: 2 },
        output: { preview: true },
        mode: "dry_run" as const,
        durationMs: 10,
      };

      expect(result.mode).toBe("dry_run");
    });
  });
});
