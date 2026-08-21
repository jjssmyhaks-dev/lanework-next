/**
 * Webhook Signature Verification — validates incoming webhooks
 * to prevent spoofing and unauthorized actions.
 *
 * Supported providers:
 * - Shiprocket: HMAC-SHA256 with API password
 * - Shopify: HMAC-SHA256 with shared secret
 * - FedEx: Basic auth or HMAC
 */

import { createHmac, timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "webhook-verify" });

export interface VerifyResult {
  valid: boolean;
  provider: string;
  reason?: string;
}

// ── Timing-safe comparison ──

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ── Shiprocket ──

export function verifyShiprocket(body: string, signature: string | null): VerifyResult {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured — skip verification (dev mode)
    log.warn("Shiprocket webhook secret not configured — skipping verification");
    return { valid: true, provider: "shiprocket", reason: "no_secret_configured" };
  }

  if (!signature) {
    return { valid: false, provider: "shiprocket", reason: "missing_signature" };
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const valid = safeCompare(signature, expected);

  if (!valid) {
    log.warn("Shiprocket webhook signature mismatch");
  }

  return { valid, provider: "shiprocket", reason: valid ? undefined : "signature_mismatch" };
}

// ── Shopify ──

export function verifyShopify(body: string, hmacHeader: string | null): VerifyResult {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    log.warn("Shopify webhook secret not configured — skipping verification");
    return { valid: true, provider: "shopify", reason: "no_secret_configured" };
  }

  if (!hmacHeader) {
    return { valid: false, provider: "shopify", reason: "missing_hmac" };
  }

  const expected = createHmac("sha256", secret).update(body, "utf8").digest("base64");
  const valid = safeCompare(hmacHeader, expected);

  if (!valid) {
    log.warn("Shopify webhook HMAC mismatch");
  }

  return { valid, provider: "shopify", reason: valid ? undefined : "hmac_mismatch" };
}

// ── FedEx ──

export function verifyFedex(authorizationHeader: string | null): VerifyResult {
  const expectedToken = process.env.FEDX_WEBHOOK_AUTH;
  if (!expectedToken) {
    log.warn("FedEx webhook auth not configured — skipping verification");
    return { valid: true, provider: "fedex", reason: "no_secret_configured" };
  }

  if (!authorizationHeader) {
    return { valid: false, provider: "fedex", reason: "missing_auth_header" };
  }

  // FedEx uses Basic auth or Bearer token
  const token = authorizationHeader.replace(/^Bearer\s+/i, "").replace(/^Basic\s+/i, "");
  const valid = safeCompare(token, expectedToken);

  if (!valid) {
    log.warn("FedEx webhook auth mismatch");
  }

  return { valid, provider: "fedex", reason: valid ? undefined : "auth_mismatch" };
}

// ── Generic HMAC verification ──

export function verifyHmac(body: string, signature: string, secret: string, algorithm: string = "sha256"): boolean {
  const expected = createHmac(algorithm, secret).update(body).digest("hex");
  return safeCompare(signature, expected);
}

// ── IP allowlist (optional) ──

const ALLOWED_IPS = new Set(
  (process.env.WEBHOOK_ALLOWED_IPS || "").split(",").filter(Boolean).map((ip) => ip.trim())
);

export function verifyIp(ip: string): boolean {
  if (ALLOWED_IPS.size === 0) return true; // No allowlist configured
  return ALLOWED_IPS.has(ip);
}
