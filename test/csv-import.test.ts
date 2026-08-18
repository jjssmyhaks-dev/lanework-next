import { describe, it, expect } from "vitest";
import { parseCSV } from "@/app/api/import/csv/route";
import { localFallback, runAIModel } from "@/lib/ai";

describe("parseCSV", () => {
  it("parses headers and rows into objects", () => {
    const csv = "tracking_number,carrier,status\nLX-001,BlueDart,in_transit\nLX-002,Delhivery,delivered";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ tracking_number: "LX-001", carrier: "BlueDart", status: "in_transit" });
    expect(rows[1].carrier).toBe("Delhivery");
  });

  it("normalises header names to snake_case", () => {
    const csv = "Tracking Number,Customer Name,Total Amount\nLX-1,Alice,100";
    const rows = parseCSV(csv);
    expect(rows[0]).toHaveProperty("tracking_number");
    expect(rows[0]).toHaveProperty("customer_name");
    expect(rows[0]).toHaveProperty("total_amount");
    expect(rows[0].total_amount).toBe("100");
  });

  it("strips surrounding quotes from values", () => {
    const csv = "name,address\n\"Acme, Inc\",\"Mumbai, MH\"";
    const rows = parseCSV(csv);
    expect(rows[0].name).toBe("Acme, Inc");
    expect(rows[0].address).toBe("Mumbai, MH");
  });

  it("returns empty array for header-only or blank input", () => {
    expect(parseCSV("a,b,c")).toEqual([]);
    expect(parseCSV("")).toEqual([]);
    expect(parseCSV("   ")).toEqual([]);
  });

  it("handles CRLF line endings", () => {
    const csv = "sku,name\r\nSKU-1,Widget\r\nSKU-2,Gadget\r\n";
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1].sku).toBe("SKU-2");
  });
});

describe("localFallback (AI fallback)", () => {
  it("responds to shipment tracking queries", () => {
    const out = localFallback("Track shipment LX-2026-001 status");
    expect(out.toLowerCase()).toContain("status");
    expect(out.toLowerCase()).toContain("in transit");
  });

  it("responds to inventory queries", () => {
    const out = localFallback("Show me low-stock inventory items");
    expect(out.toLowerCase()).toContain("inventory");
  });

  it("responds to route optimization queries", () => {
    const out = localFallback("Optimize my delivery routes");
    expect(out.toLowerCase()).toContain("route");
  });

  it("responds to greetings", () => {
    const out = localFallback("hello");
    expect(out.toLowerCase()).toContain("lanework");
  });

  it("falls back gracefully when the Cloudflare credentials are missing", async () => {
    const savedKey = process.env.CLOUDFLARE_AI_API_KEY;
    const savedAccount = process.env.CLOUDFLARE_AI_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_AI_API_KEY;
    delete process.env.CLOUDFLARE_AI_ACCOUNT_ID;
    try {
      const out = await runAIModel("@cf/meta/llama-3-8b-instruct", "hello");
      expect(typeof out).toBe("string");
      expect(out.length).toBeGreaterThan(0);
    } finally {
      if (savedKey) process.env.CLOUDFLARE_AI_API_KEY = savedKey;
      if (savedAccount) process.env.CLOUDFLARE_AI_ACCOUNT_ID = savedAccount;
    }
  });
});
