/**
 * Intent Detection — pattern-based intent matching for the chat orchestrator.
 * Used as fallback when Vercel AI SDK is unavailable.
 */

export interface IntentMatch {
  intent: string;
  integration?: string;
  action?: string;
  params: Record<string, any>;
  priority: number;
}

const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  intent: string;
  integration?: string;
  action?: string;
  extract?: (match: RegExpMatchArray, text: string) => Record<string, any>;
  priority: number;
}> = [
  // Tracking
  {
    pattern: /track(?:\s+shipment)?\s+([\w-]+)/i,
    intent: "track_shipment",
    integration: "shiprocket",
    action: "track_shipment",
    extract: (m) => ({ awb: m[1].replace(/[#?!.,;:\s]/g, "") }),
    priority: 10,
  },
  {
    pattern: /where\s+(?:is|are)\s+(?:my\s+)?(?:shipment\s+)?([\w-]+)/i,
    intent: "track_shipment",
    integration: "shiprocket",
    action: "track_shipment",
    extract: (m) => ({ awb: m[1].replace(/[#?!.,;:\s]/g, "") }),
    priority: 10,
  },
  {
    pattern: /status\s+(?:of\s+)?(?:shipment\s+)?([\w-]+)/i,
    intent: "track_shipment",
    integration: "shiprocket",
    action: "track_shipment",
    extract: (m) => ({ awb: m[1].replace(/[#?!.,;:\s]/g, "") }),
    priority: 9,
  },

  // Shipping Rates
  {
    pattern: /(?:shipping\s+)?rates?\s+(?:from|between)\s+(\d{6})\s+(?:to|and)\s+(\d{6})\s*(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:kg|kgs?)?/i,
    intent: "compare_rates",
    integration: "shiprocket",
    action: "compare_rates",
    extract: (m) => ({ pickup_pincode: m[1], delivery_pincode: m[2], weight: parseFloat(m[3]) }),
    priority: 8,
  },

  // Cancel
  {
    pattern: /cancel\s+(?:shipment\s+)?([\w-]+)/i,
    intent: "cancel_shipment",
    integration: "shiprocket",
    action: "cancel_shipment",
    extract: (m) => ({ awb: m[1] }),
    priority: 9,
  },

  // Inventory
  {
    pattern: /(?:check|show|sync)\s+(?:my\s+)?(?:the\s+)?inventory/i,
    intent: "sync_inventory",
    integration: "tally_prime",
    action: "sync_inventory",
    extract: () => ({}),
    priority: 7,
  },
  {
    pattern: /low[\s-]?stock/i,
    intent: "check_low_stock",
    integration: "tally_prime",
    action: "check_stock",
    extract: () => ({}),
    priority: 7,
  },
  {
    pattern: /(?:check|what(?:'s| is))\s+(?:the\s+)?stock\s+(?:of|for|level)\s+(\S+)/i,
    intent: "check_stock",
    integration: "tally_prime",
    action: "check_stock",
    extract: (m) => ({ sku: m[1] }),
    priority: 7,
  },

  // Route
  {
    pattern: /(?:optimize|plan|best)\s+(?:the\s+)?route/i,
    intent: "optimize_route",
    integration: "mapmyindia",
    action: "optimize_route",
    extract: () => ({}),
    priority: 6,
  },

  // GST
  {
    pattern: /validate\s+(?:GSTIN|gstin)\s+([\dA-Z]{15})/i,
    intent: "validate_gstin",
    integration: "gstn_eway_bill",
    action: "validate_gstin",
    extract: (m) => ({ gstin: m[1].toUpperCase() }),
    priority: 8,
  },
  {
    pattern: /generate\s+(?:an?\s+)?e[\s-]?way\s+bill/i,
    intent: "generate_ewb",
    integration: "gstn_eway_bill",
    action: "generate_ewb",
    extract: () => ({}),
    priority: 7,
  },

  // Weather
  {
    pattern: /(?:what(?:'s| is) the )?weather\s+(?:in|at|for)\s+(.+)/i,
    intent: "weather",
    integration: "weather",
    action: "current_weather",
    extract: (_m, text) => {
      const city = text.match(/weather\s+(?:in|at|for)\s+(.+)/i)?.[1]?.trim() || "";
      return { city, _needsGeocode: true };
    },
    priority: 6,
  },

  // E-commerce
  {
    pattern: /(?:sync|pull|fetch)\s+(?:orders?\s+)?(?:from\s+)?shopify/i,
    intent: "sync_orders",
    integration: "shopify",
    action: "sync_orders",
    extract: () => ({}),
    priority: 7,
  },
  {
    pattern: /(?:sync|pull|fetch)\s+(?:orders?\s+)?(?:from\s+)?woo(?:commerce)?/i,
    intent: "sync_orders",
    integration: "woocommerce",
    action: "sync_orders",
    extract: () => ({}),
    priority: 7,
  },

  // Fleet
  {
    pattern: /(?:track|where(?:'s| is))\s+(?:the\s+)?(?:vehicle|truck|fleet)/i,
    intent: "track_fleet",
    integration: "loconav",
    action: "track_all",
    extract: () => ({}),
    priority: 6,
  },

  // Compliance
  {
    pattern: /(?:check|verify)\s+(?:driver\s+)?license\s+(\S+)/i,
    intent: "check_license",
    integration: "compliance",
    action: "check_license",
    extract: (m) => ({ license_number: m[1] }),
    priority: 6,
  },
  {
    pattern: /(?:check|verify)\s+(?:vehicle\s+)?(?:RC|registration)\s+(\S+)/i,
    intent: "check_registration",
    integration: "compliance",
    action: "check_registration",
    extract: (m) => ({ registration_number: m[1] }),
    priority: 6,
  },
];

export function detectIntents(text: string): IntentMatch[] {
  const matches: IntentMatch[] = [];
  for (const pat of INTENT_PATTERNS) {
    const m = text.match(pat.pattern);
    if (m) {
      matches.push({
        intent: pat.intent,
        integration: pat.integration,
        action: pat.action,
        params: pat.extract ? pat.extract(m, text) : {},
        priority: pat.priority,
      });
    }
  }
  return matches.sort((a, b) => b.priority - a.priority).slice(0, 3);
}
