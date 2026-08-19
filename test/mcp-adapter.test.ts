import { describe, it, expect, vi, beforeEach } from "vitest";
import { callMcpAction, listMcpCoverage } from "../src/lib/mcp/index";

// Mock the MCP server classes to avoid real DB/API calls
vi.mock("../mcp-servers/shiprocket/index", () => ({
  ShiprocketMCP: class {
    async init() {}
    async trackShipment(awb: string) {
      return { mode: "simulated", tracking_number: awb, status: "in_transit" };
    }
  },
}));

vi.mock("../mcp-servers/tally/index", () => ({
  TallyMCP: class {
    async init() {}
    async syncInventory() {
      return { mode: "simulated", items: [] };
    }
  },
}));

vi.mock("../mcp-servers/ewaybill/index", () => ({
  EwayBillMCP: class {
    async init() {}
    async validateGstin(gstin: string) {
      return { mode: "simulated", gstin, format_valid: true };
    }
  },
}));

vi.mock("../mcp-servers/mapmyindia/index", () => ({
  MapmyIndiaMCP: class {
    async init() {}
    async geocode(address: string) {
      return { mode: "simulated", address, lat: 28.6, lng: 77.2 };
    }
  },
}));

vi.mock("../mcp-servers/fleet/index", () => ({
  FleetMCP: class {
    async init() {}
    async getFleetStatus() {
      return { mode: "simulated", vehicles: [] };
    }
  },
}));

vi.mock("../mcp-servers/shopify/index", () => ({
  ShopifyMCP: class {
    async init() {}
    async syncOrdersShopify(limit: number) {
      return { mode: "simulated", synced: 0 };
    }
    async syncOrdersWooCommerce(limit: number) {
      return { mode: "simulated", synced: 0 };
    }
  },
}));

vi.mock("../mcp-servers/googlesheets/index", () => ({
  GoogleSheetsMCP: class {
    async init() {}
    async syncToDb(p: any) {
      return { mode: "simulated", synced: 0 };
    }
  },
}));

vi.mock("../mcp-servers/erp/index", () => ({
  ErpMCP: class {
    async init() {}
    async syncOrders(dateFrom?: string) {
      return { mode: "simulated", synced: 0 };
    }
  },
}));

vi.mock("../mcp-servers/compliance/index", () => ({
  ComplianceMCP: class {
    async init() {}
    async checkDriverLicense(license: string) {
      return { mode: "simulated", license, valid: true };
    }
  },
}));

vi.mock("../mcp-servers/email/index", () => ({
  EmailMCP: class {
    async init() {}
    async sendTrackingUpdate(p: any) {
      return { mode: "simulated", sent: true };
    }
  },
}));

vi.mock("../mcp-servers/fedex/index", () => ({
  FedexMCP: class {
    async init() {}
    async trackFedex(trackingNumber: string) {
      return { mode: "simulated", trackingNumber };
    }
  },
}));

vi.mock("../mcp-servers/weather/index", () => ({
  WeatherMCP: class {
    async init() {}
    async currentWeather(lat: number, lng: number) {
      return { mode: "simulated", temp: 28 };
    }
  },
}));

vi.mock("../mcp-servers/wms/index", () => ({
  WmsMCP: class {
    async init() {}
    async checkInventory(p: any) {
      return { mode: "simulated", items: [] };
    }
  },
}));

vi.mock("../mcp-servers/scanner/index", () => ({
  ScannerMCP: class {
    async init() {}
    async checkSku(barcode: string) {
      return { mode: "simulated", barcode, found: false };
    }
  },
}));

vi.mock("../mcp-servers/dockscheduler/index", () => ({
  DockSchedulerMCP: class {
    async init() {}
    async bookDock(p: any) {
      return { mode: "simulated", booked: true };
    }
  },
}));

describe("MCP Adapter — callMcpAction", () => {
  it("returns null for unknown integration type", async () => {
    const result = await callMcpAction("unknown_integration", "some_action", {});
    expect(result).toBeNull();
  });

  it("returns null for unknown action on known integration", async () => {
    const result = await callMcpAction("shiprocket", "nonexistent_action", {});
    expect(result).toBeNull();
  });

  it("dispatches shiprocket track_shipment action", async () => {
    const result = await callMcpAction("shiprocket", "track_shipment", { awb: "TEST123" });
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.mode).toBe("simulated");
    expect(result!.tracking_number).toBe("TEST123");
  });

  it("dispatches tally sync_inventory action", async () => {
    const result = await callMcpAction("tally_prime", "sync_inventory", {});
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.mode).toBe("simulated");
  });

  it("dispatches gstn_eway_bill validate_gstin action", async () => {
    const result = await callMcpAction("gstn_eway_bill", "validate_gstin", { gstin: "27AABCG2196N1Z1" });
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.gstin).toBe("27AABCG2196N1Z1");
  });

  it("dispatches mapmyindia geocode action", async () => {
    const result = await callMcpAction("mapmyindia", "geocode", { address: "Delhi" });
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.address).toBe("Delhi");
  });

  it("dispatches loconav track_all action", async () => {
    const result = await callMcpAction("loconav", "track_all", {});
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
  });

  it("dispatches shopify sync_orders action", async () => {
    const result = await callMcpAction("shopify", "sync_orders", {});
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
  });

  it("dispatches compliance check_license action", async () => {
    const result = await callMcpAction("compliance", "check_license", { license_number: "DL1234567890" });
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.license).toBe("DL1234567890");
  });

  it("returns graceful simulated result when MCP init fails", async () => {
    // Override the mock to throw on init
    const { ShiprocketMCP } = await import("../mcp-servers/shiprocket/index");
    const originalInit = ShiprocketMCP.prototype.init;
    ShiprocketMCP.prototype.init = async () => { throw new Error("DB connection failed"); };
    
    const result = await callMcpAction("shiprocket", "track_shipment", { awb: "TEST" });
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.mode).toBe("simulated");
    expect(result!.message).toContain("temporarily unavailable");
    
    // Restore
    ShiprocketMCP.prototype.init = originalInit;
  });

  it("returns source field for all MCP calls", async () => {
    const result = await callMcpAction("shiprocket", "track_shipment", { awb: "X" });
    expect(result!.source).toBe("mcp:shiprocket");
  });
});

describe("MCP Adapter — listMcpCoverage", () => {
  it("returns coverage map with all 15 integrations", () => {
    const coverage = listMcpCoverage();
    expect(coverage).toHaveProperty("shiprocket");
    expect(coverage).toHaveProperty("tally_prime");
    expect(coverage).toHaveProperty("gstn_eway_bill");
    expect(coverage).toHaveProperty("mapmyindia");
    expect(coverage).toHaveProperty("loconav");
    expect(coverage).toHaveProperty("fleetx");
    expect(coverage).toHaveProperty("shopify");
    expect(coverage).toHaveProperty("woocommerce");
    expect(coverage).toHaveProperty("google_sheets");
    expect(coverage).toHaveProperty("sap_b1");
    expect(coverage).toHaveProperty("erp");
    expect(coverage).toHaveProperty("compliance");
    expect(coverage).toHaveProperty("email");
    expect(coverage).toHaveProperty("fedex");
    expect(coverage).toHaveProperty("weather");
    expect(coverage).toHaveProperty("wms");
    expect(coverage).toHaveProperty("scanner");
    expect(coverage).toHaveProperty("dockscheduler");
  });

  it("shiprocket has track_shipment and create_shipment actions", () => {
    const coverage = listMcpCoverage();
    expect(coverage.shiprocket).toContain("track_shipment");
    expect(coverage.shiprocket).toContain("create_shipment");
    expect(coverage.shiprocket).toContain("cancel_shipment");
  });

  it("each integration has at least one action", () => {
    const coverage = listMcpCoverage();
    for (const [type, actions] of Object.entries(coverage)) {
      expect(actions.length).toBeGreaterThanOrEqual(1);
    }
  });
});
