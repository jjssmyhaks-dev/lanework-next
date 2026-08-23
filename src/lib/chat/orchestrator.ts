/**
 * Chat Orchestrator — the brain of the chat-first interface.
 *
 * Receives a user message, determines which MCP tools to call,
 * executes them in parallel where possible, and returns a structured
 * response with tool-call details and mode indicators.
 */

import { callMcpAction, listMcpCoverage } from "@/lib/mcp";
import { getKBAgentContext } from "@/lib/knowledge";

// ── Types ──

export interface ToolCallRecord {
  integration: string;
  action: string;
  input: Record<string, any>;
  output: any;
  mode: "live" | "simulated" | "db-fallback" | "error";
  durationMs: number;
  errorMessage?: string;
}

export interface OrchestratorResult {
  reply: string;
  toolCalls: ToolCallRecord[];
  intent: string;
  requiresAuth: boolean;
}

// ── Intent Detection ──

interface IntentMatch {
  intent: string;
  integration?: string;
  action?: string;
  params: Record<string, any>;
  priority: number; // higher = checked first
}

const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  intent: string;
  integration?: string;
  action?: string;
  extract?: (match: RegExpMatchArray, text: string) => Record<string, any>;
  priority: number;
}> = [
  // ── Tracking ──
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

  // ── Shipping Rates ──
  {
    pattern: /(?:shipping\s+)?rates?\s+(?:from|between)\s+(\d{6})\s+(?:to|and)\s+(\d{6})\s*(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:kg|kgs?)?/i,
    intent: "compare_rates",
    integration: "shiprocket",
    action: "compare_rates",
    extract: (m) => ({ pickup_pincode: m[1], delivery_pincode: m[2], weight: parseFloat(m[3]) }),
    priority: 8,
  },

  // ── Cancel Shipment ──
  {
    pattern: /cancel\s+(?:shipment\s+)?([\w-]+)/i,
    intent: "cancel_shipment",
    integration: "shiprocket",
    action: "cancel_shipment",
    extract: (m) => ({ awb: m[1] }),
    priority: 9,
  },

  // ── Inventory ──
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

  // ── Route Optimization ──
  {
    pattern: /(?:optimize|plan|best)\s+(?:the\s+)?route/i,
    intent: "optimize_route",
    integration: "mapmyindia",
    action: "optimize_route",
    extract: () => ({}),
    priority: 6,
  },

  // ── GST / E-Way Bill ──
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

  // ── Weather ──
  {
    pattern: /(?:what(?:'s| is) the )?weather\s+(?:in|at|for)\s+(.+)/i,
    intent: "weather",
    integration: "weather",
    action: "current_weather",
    extract: (_m, text) => {
      // Extract city name and geocode approximately
      const city = text.match(/weather\s+(?:in|at|for)\s+(.+)/i)?.[1]?.trim() || "";
      return { city, _needsGeocode: true };
    },
    priority: 6,
  },
  {
    pattern: /weather\s+(?:along|for)\s+(?:the\s+)?route/i,
    intent: "route_weather",
    integration: "weather",
    action: "route_weather",
    extract: () => ({}),
    priority: 6,
  },

  // ── E-commerce ──
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

  // ── Fleet ──
  {
    pattern: /(?:track|where(?:'s| is))\s+(?:the\s+)?(?:vehicle|truck|fleet)/i,
    intent: "track_fleet",
    integration: "loconav",
    action: "track_all",
    extract: () => ({}),
    priority: 6,
  },

  // ── Reports ──
  {
    pattern: /(?:generate|create|show)\s+(?:a\s+)?(?:summary\s+)?report/i,
    intent: "generate_report",
    extract: () => ({}),
    priority: 5,
  },

  // ── CSV Export ──
  {
    pattern: /export\s+(?:as\s+)?csv/i,
    intent: "export_csv",
    extract: () => ({}),
    priority: 5,
  },

  // ── Compliance ──
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

function detectIntents(text: string): IntentMatch[] {
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
  // Sort by priority descending, take top 3 max
  return matches.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

// ── Indian City Geocoding (approximate) ──

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  indore: { lat: 22.7196, lng: 75.8577 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  cochin: { lat: 9.9312, lng: 76.2673 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  surat: { lat: 21.1702, lng: 72.8311 },
  vadodara: { lat: 22.3072, lng: 73.1812 },
  mysore: { lat: 12.2958, lng: 76.6394 },
  patna: { lat: 25.6093, lng: 85.1376 },
  raipur: { lat: 21.2514, lng: 81.6296 },
  guwahati: { lat: 26.1445, lng: 91.7362 },
  amritsar: { lat: 31.634, lng: 74.8723 },
  varanasi: { lat: 25.3176, lng: 82.9739 },
  dehradun: { lat: 30.3165, lng: 78.0322 },
  goa: { lat: 15.2993, lng: 74.124 },
};

// ── Reply Generation ──

function generateReply(intent: string, toolCalls: ToolCallRecord[]): string {
  if (toolCalls.length === 0) {
    return "I can help with that! Could you provide more details? For example, a tracking number, location, or specific item.";
  }

  const tc = toolCalls[0]; // primary tool call
  const modeNote =
    tc.mode === "live"
      ? ""
      : tc.mode === "db-fallback"
        ? " _(using cached data — live API unavailable)_"
        : tc.mode === "error"
          ? " _(API error — showing fallback data)_"
          : " _(demo mode — configure API keys for live data)_";

  switch (intent) {
    case "track_shipment": {
      const d = tc.output;
      if (!d || d.status === "unknown") {
        return `I couldn't find shipment **${tc.input.awb || ""}**. ${modeNote}\n\nDouble-check the AWB number and try again.`;
      }
      const scans = d.scans?.length
        ? `\n\n**Recent scans:**\n${d.scans.slice(0, 5).map((s: any) => `• ${s.status} — ${s.location || "unknown"} (${s.time || "N/A"})`).join("\n")}`
        : "";
      return `📦 **Shipment ${d.awb || tc.input.awb}**\n\n• **Status:** ${d.status}\n• **Location:** ${d.location || "N/A"}\n• **Last update:** ${d.lastUpdate || "N/A"}${scans}${modeNote}`;
    }
    case "compare_rates": {
      const d = tc.output;
      const rates = d?.rates;
      if (!rates || rates.length === 0) {
        return `No shipping rates found for this route. ${modeNote}`;
      }
      const rateList = rates
        .slice(0, 5)
        .map((r: any, i: number) => `${i + 1}. **${r.courier}** — ₹${r.rate} (${r.estimatedDays} days)${r.isRecommended ? " ⭐" : ""}`)
        .join("\n");
      return `📊 **Shipping Rates** (${tc.input.pickup_pincode} → ${tc.input.delivery_pincode}, ${tc.input.weight}kg)\n\n${rateList}${modeNote}`;
    }
    case "cancel_shipment": {
      return `✅ Shipment **${tc.input.awb}** has been cancelled.${modeNote}`;
    }
    case "sync_inventory": {
      const d = tc.output;
      const items = d?.items || [];
      if (items.length === 0) return `No inventory items found. ${modeNote}`;
      const summary = items.slice(0, 10).map((i: any) => `• **${i.sku}** — ${i.name}: ${i.qty} units`).join("\n");
      return `📦 **Inventory** (${d?.synced || items.length} items)\n\n${summary}${items.length > 10 ? `\n\n_...and ${items.length - 10} more items_` : ""}${modeNote}`;
    }
    case "check_stock": {
      const d = tc.output;
      if (!d || d.name === "Not found") return `SKU **${tc.input.sku}** not found in inventory. ${modeNote}`;
      return `📊 **${d.sku}** — ${d.name}\n\n• **Qty:** ${d.qty}\n• **Reorder point:** ${d.reorderPoint}\n• **Needs reorder:** ${d.needsReorder ? "⚠️ Yes" : "No"}${modeNote}`;
    }
    case "validate_gstin": {
      const d = tc.output;
      if (!d) return `Could not validate GSTIN. ${modeNote}`;
      return `🧾 **GSTIN ${d.gstin}**\n\n• **Valid:** ${d.valid ? "✅ Yes" : "❌ No"}\n• **Legal name:** ${d.legalName || "N/A"}\n• **State code:** ${d.stateCode || "N/A"}${modeNote}`;
    }
    case "weather": {
      const d = tc.output;
      if (!d) return `Could not fetch weather data. ${modeNote}`;
      const alerts = d.alerts?.length ? `\n\n⚠️ **Alerts:**\n${d.alerts.map((a: string) => `• ${a}`).join("\n")}` : "";
      return `🌤️ **Weather in ${d.location || tc.input.city || "India"}**\n\n• **Temp:** ${d.temp}°C (feels like ${d.feelsLike}°C)\n• **Conditions:** ${d.conditions}\n• **Wind:** ${d.windSpeed} km/h\n• **Humidity:** ${d.humidity}%\n• **Rain:** ${d.rainMm}mm${alerts}${modeNote}`;
    }
    case "route_weather": {
      const d = tc.output;
      if (!d) return `Could not fetch route weather. ${modeNote}`;
      const stops = d.weatherAlongRoute?.map((w: any) => `• **${w.label}**: ${w.conditions}, ${w.temp}°C — Risk: ${w.risk} ${w.recommendation}`).join("\n") || "";
      return `🗺️ **Route Weather** — Overall risk: **${d.overallRisk}**\n\n${stops}\n\n${d.recommendedAction}${modeNote}`;
    }
    case "sync_orders": {
      const d = tc.output;
      return `🛒 **${d?.platform || "E-commerce"} Order Sync**\n\n• Synced: ${d?.synced || 0} orders\n• Mode: ${d?.mode || "unknown"}${modeNote}`;
    }
    case "track_fleet": {
      const d = tc.output;
      if (!d) return `No fleet data available. ${modeNote}`;
      return `🚛 **Fleet Status**\n\n• Vehicles: ${d.totalVehicles || 0}\n• Moving: ${d.moving || 0}\n• Idle: ${d.idle || 0}${modeNote}`;
    }
    case "generate_report": {
      return `📋 **Report Generation**\n\nI can generate reports for:\n• Shipment status summary\n• Inventory stock levels\n• COD reconciliation\n• Fleet utilization\n\nPlease specify which report you'd like, or I can generate an overview.${modeNote}`;
    }
    case "export_csv": {
      return `📥 **CSV Export**\n\nDownload your data:\n• [Shipments](/api/export/csv?entity=shipments)\n• [Inventory](/api/export/csv?entity=inventory)\n• [Orders](/api/export/csv?entity=orders)${modeNote}`;
    }
    case "check_license": {
      const d = tc.output;
      if (!d) return `Could not verify license. ${modeNote}`;
      return `🪪 **Driver License ${tc.input.license_number}**\n\n• **Valid:** ${d.valid ? "✅ Yes" : "❌ No"}\n• **Name:** ${d.name || "N/A"}\n• **Expiry:** ${d.expiry || "N/A"}${modeNote}`;
    }
    case "check_registration": {
      const d = tc.output;
      if (!d) return `Could not verify registration. ${modeNote}`;
      return `🚗 **Vehicle RC ${tc.input.registration_number}**\n\n• **Valid:** ${d.valid ? "✅ Yes" : "❌ No"}\n• **Owner:** ${d.owner || "N/A"}\n• **Fitness:** ${d.fitness || "N/A"}${modeNote}`;
    }
    case "generate_ewb": {
      const d = tc.output;
      if (!d) return `Could not generate e-way bill. ${modeNote}`;
      return `🧾 **E-Way Bill Generated**\n\n• **EWB No:** ${d.ewbNo || "N/A"}\n• **Status:** ${d.status || "N/A"}\n• **Valid until:** ${d.validUntil || "N/A"}${modeNote}`;
    }
    default:
      return tc.output
        ? `Here's what I found:\n\n\`\`\`json\n${JSON.stringify(tc.output, null, 2).slice(0, 1000)}\n\`\`\`${modeNote}`
        : `I processed your request. ${modeNote}`;
  }
}

// ── Main Orchestrator ──

export async function orchestrate(
  userMessage: string,
  userId: string
): Promise<OrchestratorResult> {
  const intents = detectIntents(userMessage);
  const toolCalls: ToolCallRecord[] = [];

  if (intents.length === 0) {
    // No specific intent detected — use knowledge base for context
    const kbContext = await getKBAgentContext(userMessage);
    const toolHint = kbContext.toolRecommendations.length > 0
      ? `\n\n💡 _I can help with: ${kbContext.toolRecommendations.map((r) => r.tool.replace(/_/g, " ")).join(", ")}_`
      : "";
    const entityHint = kbContext.mentionedEntities.length > 0
      ? `\n\n_Related to: ${kbContext.mentionedEntities.join(", ")}_`
      : "";
    return {
      reply: `I can help with that! Could you provide more details? For example, a tracking number, location, or specific item.${toolHint}${entityHint}`,
      toolCalls: [],
      intent: "general",
      requiresAuth: false,
    };
  }

  // Execute tool calls (up to 3, in parallel where possible)
  const primary = intents[0];
  const executionPromises = intents.map(async (intent) => {
    if (!intent.integration || !intent.action) {
      return null;
    }

    const start = Date.now();
    try {
      const result = await callMcpAction(intent.integration, intent.action, intent.params);
      const durationMs = Date.now() - start;

      if (!result) {
        return {
          integration: intent.integration,
          action: intent.action,
          input: intent.params,
          output: null,
          mode: "error" as const,
          durationMs,
          errorMessage: "No handler for this integration/action",
        };
      }

      return {
        integration: intent.integration,
        action: intent.action,
        input: intent.params,
        output: result,
        mode: (result.mode || "simulated") as ToolCallRecord["mode"],
        durationMs,
      };
    } catch (e: any) {
      return {
        integration: intent.integration,
        action: intent.action,
        input: intent.params,
        output: null,
        mode: "error" as const,
        durationMs: Date.now() - start,
        errorMessage: e.message,
      };
    }
  });

  const results = await Promise.all(executionPromises);
  for (const r of results) {
    if (r) toolCalls.push(r);
  }

  const reply = generateReply(primary.intent, toolCalls);

  return {
    reply,
    toolCalls,
    intent: primary.intent,
    requiresAuth: false,
  };
}
