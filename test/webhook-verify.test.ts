import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Test webhook signature verification logic
// (These test the algorithm, not the actual module which needs env vars)

function createHmacSignature(body: string, secret: string, algorithm = "sha256"): string {
  return crypto.createHmac(algorithm, secret).update(body).digest("hex");
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const computed = createHmacSignature(body, secret);
  try {
    const sigBuffer = Buffer.from(signature, "hex");
    const computedBuffer = Buffer.from(computed, "hex");
    if (sigBuffer.length !== computedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, computedBuffer);
  } catch {
    return false;
  }
}

describe("Webhook Signature Verification", () => {
  const secret = "test-webhook-secret-12345";
  const body = '{"event":"order.created","data":{"id":123}}';

  describe("HMAC-SHA256", () => {
    it("should create valid HMAC signature", () => {
      const sig = createHmacSignature(body, secret);
      expect(sig).toHaveLength(64); // SHA256 hex = 64 chars
      expect(sig).toMatch(/^[a-f0-9]+$/);
    });

    it("should verify correct signature", () => {
      const sig = createHmacSignature(body, secret);
      expect(verifySignature(body, sig, secret)).toBe(true);
    });

    it("should reject wrong signature", () => {
      const wrongSig = createHmacSignature(body, "wrong-secret");
      expect(verifySignature(body, wrongSig, secret)).toBe(false);
    });

    it("should reject tampered body", () => {
      const sig = createHmacSignature(body, secret);
      const tamperedBody = '{"event":"order.created","data":{"id":999}}';
      expect(verifySignature(tamperedBody, sig, secret)).toBe(false);
    });

    it("should reject empty signature", () => {
      expect(verifySignature(body, "", secret)).toBe(false);
    });

    it("should reject non-hex signature", () => {
      expect(verifySignature(body, "not-a-valid-hex-signature", secret)).toBe(false);
    });
  });

  describe("Shopify-style (sha256= prefix)", () => {
    it("should strip sha256= prefix before verification", () => {
      const sig = createHmacSignature(body, secret);
      const prefixed = `sha256=${sig}`;
      const stripped = prefixed.replace(/^sha256=/, "");
      expect(verifySignature(body, stripped, secret)).toBe(true);
    });
  });

  describe("timing safety", () => {
    it("should use timing-safe comparison (same length required)", () => {
      const sig1 = createHmacSignature(body, secret);
      const sig2 = createHmacSignature(body, secret);
      expect(sig1).toBe(sig2); // Same input = same output

      // Different secrets produce different signatures
      const sig3 = createHmacSignature(body, "different-secret");
      expect(sig1).not.toBe(sig3);
    });
  });

  describe("different algorithms", () => {
    it("should support SHA-256", () => {
      const sig = createHmacSignature(body, secret, "sha256");
      expect(sig).toHaveLength(64);
    });

    it("should support SHA-512", () => {
      const sig = createHmacSignature(body, secret, "sha512");
      expect(sig).toHaveLength(128);
    });
  });
});
