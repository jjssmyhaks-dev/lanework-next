import { describe, it, expect } from "vitest";
import { detectIntent, DetectedIntent } from "../src/lib/intent-detection";

describe("Intent Detection", () => {
  // ── Track Shipment ──
  describe("track shipment", () => {
    it("detects 'track shipment SH-123'", () => {
      const result = detectIntent("track shipment SH-123");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("track_shipment");
      expect(result!.integration).toBe("shiprocket");
      expect(result!.params.awb).toBe("SH123");
    });

    it("detects 'where is my shipment #SH-2024-001'", () => {
      const result = detectIntent("where is my shipment #SH-2024-001");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("track_shipment");
      expect(result!.params.awb).toBe("SH-2024-001");
    });

    it("detects 'status of shipment ABC123'", () => {
      const result = detectIntent("status of shipment ABC123");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("track_shipment");
      expect(result!.params.awb).toBe("ABC123");
    });
  });

  // ── Inventory ──
  describe("inventory", () => {
    it("detects 'check inventory'", () => {
      const result = detectIntent("check inventory");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("sync_inventory");
      expect(result!.integration).toBe("tally_prime");
    });

    it("detects 'show me low stock items'", () => {
      const result = detectIntent("show me low stock items");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("sync_inventory");
    });

    it("detects 'what's in stock'", () => {
      const result = detectIntent("what's in stock");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("sync_inventory");
    });
  });

  // ── Routes ──
  describe("route optimization", () => {
    it("detects 'optimize route for today's deliveries'", () => {
      const result = detectIntent("optimize route for today's deliveries");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("optimize_route");
    });

    it("detects 'plan route Mumbai to Delhi'", () => {
      const result = detectIntent("plan route Mumbai to Delhi");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("optimize_route");
    });
  });

  // ── Reports ──
  describe("reports", () => {
    it("detects 'generate report'", () => {
      const result = detectIntent("generate report");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("generate_report");
    });

    it("detects 'warehouse summary'", () => {
      const result = detectIntent("warehouse summary");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("generate_report");
    });
  });

  // ── Connect Integration ──
  describe("connect integration", () => {
    it("detects 'connect shiprocket'", () => {
      const result = detectIntent("connect shiprocket");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("connect_integration");
      expect(result!.integration).toBe("shiprocket");
    });

    it("detects 'setup razorpay'", () => {
      const result = detectIntent("setup razorpay");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("connect_integration");
      expect(result!.integration).toBe("razorpay");
    });
  });

  // ── GST / E-Way Bill ──
  describe("GST validation", () => {
    it("detects 'validate GSTIN 27AABCG2196N1Z1'", () => {
      const result = detectIntent("validate GSTIN 27AABCG2196N1Z1");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("validate_gstin");
      expect(result!.integration).toBe("gstn_eway_bill");
      expect(result!.params.gstin).toBe("27AABCG2196N1Z1");
    });

    it("detects 'gstin validation' without specific GSTIN", () => {
      const result = detectIntent("gstin validation");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("validate_gstin");
      expect(result!.params.gstin).toBeUndefined();
    });
  });

  // ── Shopify / E-commerce ──
  describe("ecommerce", () => {
    it("detects 'sync orders from shopify'", () => {
      const result = detectIntent("sync orders from shopify");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("sync_orders");
      expect(result!.integration).toBe("shopify");
    });

    it("detects 'ecommerce sync'", () => {
      const result = detectIntent("ecommerce sync");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("sync_orders");
    });
  });

  // ── Fleet ──
  describe("fleet", () => {
    it("detects 'track all vehicles'", () => {
      const result = detectIntent("track all vehicles");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("track_all");
      expect(result!.integration).toBe("loconav");
    });

    it("detects 'fleet status'", () => {
      const result = detectIntent("fleet status");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("track_all");
    });
  });

  // ── Razorpay / Payments ──
  describe("payments", () => {
    it("detects 'cod reconciliation'", () => {
      const result = detectIntent("cod reconciliation");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("reconcile");
      expect(result!.integration).toBe("razorpay");
    });
  });

  // ── Export ──
  describe("export", () => {
    it("detects 'export shipments as csv'", () => {
      const result = detectIntent("export shipments as csv");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("export_csv");
    });
  });

  // ── No Match ──
  describe("no match", () => {
    it("returns null for gibberish", () => {
      expect(detectIntent("hello world")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(detectIntent("")).toBeNull();
    });

    it("returns null for ambiguous query", () => {
      expect(detectIntent("tell me something interesting")).toBeNull();
    });
  });
});
