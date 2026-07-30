import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  function makeRequest(ip: string, extras: Record<string, string> = {}): Request {
    return new Request("http://localhost:3000/api/ai", {
      headers: { "x-forwarded-for": ip, ...extras },
    });
  }

  it("allows requests within limit", () => {
    const req = makeRequest("10.0.0.1");
    for (let i = 0; i < 10; i++) {
      const result = rateLimit(req, { maxRequests: 10, windowMs: 60_000, group: "test" });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9 - i);
    }
  });

  it("blocks after exceeding limit", () => {
    const req = makeRequest("10.0.0.2");
    for (let i = 0; i < 5; i++) {
      rateLimit(req, { maxRequests: 5, windowMs: 60_000, group: "test2" });
    }
    const blocked = rateLimit(req, { maxRequests: 5, windowMs: 60_000, group: "test2" });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("separates limits by group", () => {
    const req = makeRequest("10.0.0.3");
    // Exhaust group A
    for (let i = 0; i < 3; i++) {
      rateLimit(req, { maxRequests: 3, windowMs: 60_000, group: "group-a" });
    }
    const blockedA = rateLimit(req, { maxRequests: 3, windowMs: 60_000, group: "group-a" });
    expect(blockedA.allowed).toBe(false);

    // Group B should still be allowed
    const allowedB = rateLimit(req, { maxRequests: 3, windowMs: 60_000, group: "group-b" });
    expect(allowedB.allowed).toBe(true);
  });

  it("returns resetAt timestamp in the future", () => {
    const req = makeRequest("10.0.0.4");
    const result = rateLimit(req, { maxRequests: 5, windowMs: 60_000, group: "test3" });
    expect(result.resetAt).toBeGreaterThan(Date.now());
    expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  it("handles missing x-forwarded-for gracefully", () => {
    const req = new Request("http://localhost:3000/api/ai");
    const result = rateLimit(req, { maxRequests: 5 });
    expect(result.allowed).toBe(true);
  });
});
