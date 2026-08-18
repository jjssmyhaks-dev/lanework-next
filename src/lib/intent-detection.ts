/**
 * Intent Detection — parses natural language queries into structured intents
 * for the copilot to dispatch to the right integration/action.
 */

import { INTEGRATION_SETUP } from "./integration-setup";

export interface DetectedIntent {
  action: string;
  integration?: string;
  params: Record<string, string>;
}

/**
 * Detect user intent from a natural language query.
 * Returns null when no specific intent can be determined.
 */
export function detectIntent(text: string): DetectedIntent | null {
  const t = text.toLowerCase();

  // Track shipment
  const trackMatch =
    t.match(/track\s+(?:shipment\s+)?([\w-]+)/i) ||
    t.match(/where\s+(?:is|are)\s+(?:my\s+)?(?:shipment\s+)?([\w-]+)/i) ||
    t.match(/status\s+(?:of\s+)?(?:shipment\s+)?([\w-]+)/i);
  if (trackMatch) {
    const trackingNumber = trackMatch[1].replace(/[#?!.,;:\s]/g, "");
    return {
      action: "track_shipment",
      integration: "shiprocket",
      params: { tracking_number: trackingNumber, awb: trackingNumber },
    };
  }

  // Inventory check
  if (t.includes("inventory") || t.includes("stock level") || t.includes("low stock") || t.includes("check inventory") || t.includes("what's in stock") || t.includes("quantity of")) {
    return { action: "sync_inventory", integration: "tally_prime", params: {} };
  }

  // Route optimization
  if (t.includes("optimize route") || t.includes("plan route") || t.includes("best route") || t.includes("delivery route") || t.includes("route for")) {
    return { action: "optimize_route", params: {} };
  }

  // Generate report
  if (t.includes("generate report") || t.includes("summary report") || t.includes("warehouse summary") || t.includes("task summary") || t.includes("performance report")) {
    return { action: "generate_report", params: {} };
  }

  // Connect integration
  const connectMatch = t.match(/(?:connect|setup|set up|configure)\s+(.+)/i);
  if (connectMatch) {
    const name = connectMatch[1].trim();
    const found = Object.values(INTEGRATION_SETUP).find(
      (i) => i.name.toLowerCase().includes(name) || i.id.toLowerCase().includes(name) || name.includes(i.name.toLowerCase())
    );
    if (found) return { action: "connect_integration", integration: found.id, params: {} };
  }

  // Specific actions per integration
  if (t.includes("sync tally") || t.includes("tally sync") || t.includes("tally inventory")) {
    return { action: "sync_inventory", integration: "tally_prime", params: {} };
  }
  if (t.includes("cod reconciliation") || t.includes("razorpay") || t.includes("payment")) {
    return { action: "reconcile", integration: "razorpay", params: {} };
  }
  if (t.includes("gstin") || t.includes("validate gst") || t.includes("gst validation")) {
    const gstinMatch = t.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z]\d[A-Z0-9]\b/i);
    return {
      action: "validate_gstin",
      integration: "gstn_eway_bill",
      params: gstinMatch ? { gstin: gstinMatch[0].toUpperCase() } : {},
    };
  }
  if (t.includes("shopify") || t.includes("sync orders") || t.includes("ecommerce") || t.includes("e-commerce")) {
    return { action: "sync_orders", integration: "shopify", params: {} };
  }
  if (t.includes("fleet") || t.includes("vehicle") || t.includes("track vehicle")) {
    return { action: "track_all", integration: "loconav", params: {} };
  }
  if (t.includes("export") && (t.includes("csv") || t.includes("shipments") || t.includes("inventory"))) {
    return { action: "export_csv", params: {} };
  }

  return null;
}
