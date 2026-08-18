import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

describe("API smoke tests (integration)", () => {
  const skipIfNotRunning = process.env.CI || process.env.SKIP_INTEGRATION;

  beforeAll(async () => {
    if (skipIfNotRunning) return;
    // Fail fast with a clear message if the dev server isn't up
    try {
      await fetch(`${BASE}/api/integrations`, { signal: AbortSignal.timeout(3000) });
    } catch {
      throw new Error(`Dev server not running at ${BASE}. Start it with 'npm run dev' or set TEST_BASE_URL.`);
    }
  });

  // List of endpoints to smoke-test
  const endpoints = [
    { method: "GET", path: "/api/ai" },
    { method: "GET", path: "/api/dashboard/stats" },
    { method: "GET", path: "/api/integrations" },
    { method: "GET", path: "/api/inventory" },
    { method: "GET", path: "/api/shipment" },
    { method: "GET", path: "/api/customer" },
    { method: "GET", path: "/api/routes" },
    { method: "GET", path: "/api/warehouse" },
    { method: "GET", path: "/api/fleet/vehicles" },
    { method: "GET", path: "/api/fleet/drivers" },
    { method: "GET", path: "/api/export/csv?entity=shipments" },
    { method: "POST", path: "/api/integrations/shiprocket/action", body: { action: "track_shipment", payload: { awb: "TEST123" } } },
  ];

  for (const ep of endpoints) {
    it(`${ep.method} ${ep.path}`, { skip: !!skipIfNotRunning }, async () => {
      const opts: RequestInit = { method: ep.method };
      if (ep.body) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(ep.body);
      }
      const res = await fetch(`${BASE}${ep.path}`, opts);
      expect(res.status).toBeLessThan(500); // no server errors
    });
  }

  it("POST /api/shipment creates a shipment (live columns)", { skip: !!skipIfNotRunning }, async () => {
    const res = await fetch(`${BASE}/api/shipment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber: `SMOKE-${Date.now()}`, carrier: "BlueDart", origin: "Mumbai", destination: "Delhi", eta: "2026-12-31" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeTruthy();
    expect(typeof data.origin).toBe("string");
    expect(data.eta).toBeTruthy();
  });

  it("POST /api/customer creates a customer (live columns)", { skip: !!skipIfNotRunning }, async () => {
    const res = await fetch(`${BASE}/api/customer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Smoke Customer ${Date.now()}`, email: "smoke@test.com" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBeTruthy();
  });

  it("POST /api/routes creates a route (live columns)", { skip: !!skipIfNotRunning }, async () => {
    const res = await fetch(`${BASE}/api/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Smoke Route ${Date.now()}`, origin: "A", destination: "B", stops: 3, distanceKm: 12, estimatedMinutes: 40 }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBeTruthy();
    expect(data.origin).toBe("A");
    expect(data.distance_km).toBe(12);
  });

  it("POST /api/import/csv imports an order row (orders table columns)", { skip: !!skipIfNotRunning }, async () => {
    const res = await fetch(`${BASE}/api/import/csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: "order", rows: [{ order_number: `SMOKE-ORD-${Date.now()}`, status: "pending", total_amount: 250 }] }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.imported).toBe(1);
    expect(data.errors).toHaveLength(0);
  });

  it("integration actions that previously 500'd are graceful", { skip: !!skipIfNotRunning }, async () => {
    for (const [integration, action] of [
      ["loconav", "maintenance_check"],
      ["gstn_eway_bill", "view_ewb"],
      ["loconav", "driver_report"],
      ["whatsapp", "view_log"],
    ]) {
      const res = await fetch(`${BASE}/api/integrations/${integration}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      expect(res.status, `${integration}/${action}`).toBe(200);
      const data = await res.json();
      expect(data.success, `${integration}/${action}: ${JSON.stringify(data)}`).toBe(true);
    }
  });

  it("[id] routes return 404 for non-UUID ids (no 500)", { skip: !!skipIfNotRunning }, async () => {
    for (const path of ["/api/shipment/not-a-uuid", "/api/customer/not-a-uuid", "/api/routes/not-a-uuid", "/api/warehouse/not-a-uuid", "/api/fleet/vehicles/not-a-uuid", "/api/fleet/drivers/not-a-uuid"]) {
      const res = await fetch(`${BASE}${path}`);
      expect(res.status, path).toBe(404);
    }
  });

  it("POST /api/search returns 200", { skip: !!skipIfNotRunning }, async () => {
    const res = await fetch(`${BASE}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test" }),
    });
    expect(res.status).toBe(200);
  });

  it("rate limit returns 429 after many requests", { skip: !!skipIfNotRunning }, async () => {
    const responses: number[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${BASE}/api/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reasoning", data: { agentId: "copilot", taskType: "user_query", context: "test" } }),
      });
      responses.push(res.status);
    }
    // At least one should be 429
    expect(responses.some((s) => s === 429)).toBe(true);
  });
});
