import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3000";

describe("API smoke tests (integration)", () => {
  // List of endpoints to smoke-test
  const endpoints = [
    { method: "GET", path: "/api/ai" },
    { method: "GET", path: "/api/dashboard/stats" },
    { method: "GET", path: "/api/integrations" },
    { method: "POST", path: "/api/integrations/shiprocket/action", body: { action: "track_shipment", payload: { awb: "TEST123" } } },
  ];

  const skipIfNotRunning = process.env.CI || process.env.SKIP_INTEGRATION;

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

  it("rate limit returns 429 after many requests", { skip: !!skipIfNotRunning }, async () => {
    const responses: number[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${BASE}/api/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copilot", message: "test" }),
      });
      responses.push(res.status);
    }
    // At least one should be 429
    expect(responses.some((s) => s === 429)).toBe(true);
  });
});
