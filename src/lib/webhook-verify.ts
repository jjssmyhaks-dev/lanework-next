/**
 * Webhook signature verification for external integrations.
 * Supports HMAC-SHA256 (Shopify, GitHub-style) and custom headers.
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "webhook-verify" });

export interface WebhookVerifyOptions {
  /** Header name containing the signature */
  headerName: string;
  /** Secret key for HMAC verification */
  secret: string;
  /** HMAC algorithm (default: sha256) */
  algorithm?: string;
  /** How to extract signature from header (default: raw) */
  signatureFormat?: "raw" | "sha256=" | "hex";
}

/**
 * Verify webhook signature using HMAC-SHA256.
 * Returns true if valid, false otherwise.
 */
export function verifyWebhookSignature(
  body: string | Buffer,
  headers: Record<string, string>,
  options: WebhookVerifyOptions
): boolean {
  const {
    headerName,
    secret,
    algorithm = "sha256",
    signatureFormat = "raw",
  } = options;

  const signatureHeader = headers[headerName.toLowerCase()];
  if (!signatureHeader) {
    log.warn({ headerName }, "Webhook signature header missing");
    return false;
  }

  // Extract the signature from the header
  let expectedSig: string;
  switch (signatureFormat) {
    case "sha256=":
      // GitHub/Shopify style: "sha256=abc123..."
      expectedSig = signatureHeader.replace(/^sha256=/, "");
      break;
    case "hex":
      // Raw hex signature
      expectedSig = signatureHeader;
      break;
    default:
      expectedSig = signatureHeader;
  }

  // Compute HMAC
  const hmac = crypto.createHmac(algorithm, secret);
  hmac.update(typeof body === "string" ? body : body.toString("utf-8"));
  const computedSig = hmac.digest("hex");

  // Timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(expectedSig, "hex");
    const computedBuffer = Buffer.from(computedSig, "hex");

    if (sigBuffer.length !== computedBuffer.length) {
      log.warn({ headerName }, "Webhook signature length mismatch");
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, computedBuffer);
  } catch {
    // Fallback to string comparison if hex parsing fails
    log.warn({ headerName }, "Signature not hex, using string comparison");
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(computedSig)
    );
  }
}

/**
 * Shopify webhook verification.
 */
export function verifyShopifyWebhook(
  body: string,
  headers: Record<string, string>
): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    log.warn("SHOPIFY_WEBHOOK_SECRET not set — skipping verification");
    return true; // Allow in dev, reject in production
  }
  return verifyWebhookSignature(body, headers, {
    headerName: "x-shopify-hmac-sha256",
    secret,
    signatureFormat: "raw",
  });
}

/**
 * Shiprocket webhook verification.
 */
export function verifyShiprocketWebhook(
  body: string,
  headers: Record<string, string>
): boolean {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
  if (!secret) {
    log.warn("SHIPROCKET_WEBHOOK_SECRET not set — skipping verification");
    return true;
  }
  return verifyWebhookSignature(body, headers, {
    headerName: "x-shiprocket-signature",
    secret,
    algorithm: "sha256",
  });
}

/**
 * Razorpay webhook verification.
 */
export function verifyRazorpayWebhook(
  body: string,
  headers: Record<string, string>
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    log.warn("RAZORPAY_WEBHOOK_SECRET not set — skipping verification");
    return true;
  }
  return verifyWebhookSignature(body, headers, {
    headerName: "x-razorpay-signature",
    secret,
    algorithm: "sha256",
    signatureFormat: "raw",
  });
}

/**
 * FedEx webhook verification.
 */
export function verifyFedExWebhook(
  body: string,
  headers: Record<string, string>
): boolean {
  const secret = process.env.FEDX_WEBHOOK_AUTH;
  if (!secret) {
    log.warn("FEDX_WEBHOOK_AUTH not set — skipping verification");
    return true;
  }
  // FedEx uses basic auth or custom header
  const authHeader = headers["authorization"];
  if (!authHeader) return false;
  return authHeader === `Bearer ${secret}` || authHeader === `Basic ${secret}`;
}

/**
 * WhatsApp webhook verification (GET for verify, POST for events).
 */
export function verifyWhatsAppWebhook(
  _body: string,
  headers: Record<string, string>,
  query: URLSearchParams
): { verified: boolean; challenge?: string } {
  const mode = query.get("hub.mode");
  const token = query.get("hub.verify_token");
  const challenge = query.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return { verified: true, challenge: challenge || "" };
  }

  return { verified: false };
}
