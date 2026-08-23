/**
 * Knowledge Base Store
 *
 * Central registry for all knowledge entries. Provides search,
 * retrieval, and context generation for AI agents.
 *
 * Usage:
 *   import { searchKB, getKBAgentContext, listKBEntries } from "@/lib/knowledge/store";
 *
 *   // Search for relevant knowledge
 *   const results = searchKB({ query: "track shipment delhivery", limit: 5 });
 *
 *   // Get agent context for a chat message
 *   const context = await getKBAgentContext("where is my shipment 123456");
 *
 *   // List all entries in a category
 *   const tools = listKBEntries({ category: "mcp_tool" });
 */

import type {
  KBEntry,
  KBCategory,
  KBSubCategory,
  SearchOptions,
  SearchResult,
  AgentContext,
} from "./types";
import { searchKnowledgeBase, tokenize } from "./search";
import { MCP_ENTRIES } from "./mcp-entries";
import { DOMAIN_ENTRIES } from "./domain-entries";
import {
  buildKnowledgeGraph,
  buildAgentDiscovery,
} from "./ontology";

// ── Entry Registry ──

const ALL_ENTRIES: KBEntry[] = [...MCP_ENTRIES, ...DOMAIN_ENTRIES];

// Tag-based intent → MCP tool mapping for agent context
const INTENT_TOOL_MAP: Record<string, Array<{ server: string; tool: string; confidence: number }>> = {
  track: [{ server: "shiprocket", tool: "track_shipment", confidence: 0.95 }],
  where: [{ server: "shiprocket", tool: "track_shipment", confidence: 0.9 }],
  status: [{ server: "shiprocket", tool: "track_shipment", confidence: 0.85 }],
  ship: [{ server: "shiprocket", tool: "create_shipment", confidence: 0.9 }],
  book: [{ server: "shiprocket", tool: "create_shipment", confidence: 0.85 }],
  rate: [{ server: "shiprocket", tool: "get_rates", confidence: 0.9 }],
  price: [{ server: "shiprocket", tool: "get_rates", confidence: 0.8 }],
  cancel: [{ server: "shiprocket", tool: "cancel_shipment", confidence: 0.9 }],
  stock: [{ server: "tally", tool: "check_stock", confidence: 0.85 }],
  inventory: [{ server: "tally", tool: "sync_inventory", confidence: 0.8 }],
  reorder: [{ server: "tally", tool: "check_stock", confidence: 0.75 }],
  route: [{ server: "mapmyindia", tool: "optimize_route", confidence: 0.85 }],
  optimize: [{ server: "mapmyindia", tool: "optimize_route", confidence: 0.8 }],
  weather: [{ server: "weather", tool: "current_weather", confidence: 0.9 }],
  rain: [{ server: "weather", tool: "current_weather", confidence: 0.8 }],
  vehicle: [{ server: "fleet", tool: "track_vehicle", confidence: 0.85 }],
  fleet: [{ server: "fleet", tool: "get_fleet_status", confidence: 0.9 }],
  gstin: [{ server: "ewaybill", tool: "validate_gstin", confidence: 0.95 }],
  eway: [{ server: "ewaybill", tool: "generate_ewaybill", confidence: 0.9 }],
  "e-way": [{ server: "ewaybill", tool: "generate_ewaybill", confidence: 0.9 }],
  shopify: [{ server: "shopify", tool: "sync_orders", confidence: 0.9 }],
  woo: [{ server: "shopify", tool: "sync_orders_woo", confidence: 0.9 }],
  license: [{ server: "compliance", tool: "check_license", confidence: 0.9 }],
  rc: [{ server: "compliance", tool: "check_registration", confidence: 0.85 }],
  barcode: [{ server: "scanner", tool: "verify_pick", confidence: 0.9 }],
  scan: [{ server: "scanner", tool: "receive_item", confidence: 0.85 }],
  dock: [{ server: "dockscheduler", tool: "book_dock", confidence: 0.85 }],
  warehouse: [{ server: "wms", tool: "check_inventory", confidence: 0.75 }],
  email: [{ server: "email", tool: "send_tracking_update", confidence: 0.7 }],
  notify: [{ server: "email", tool: "send_tracking_update", confidence: 0.7 }],
  sheet: [{ server: "googlesheets", tool: "read_sheet", confidence: 0.85 }],
  spreadsheet: [{ server: "googlesheets", tool: "read_sheet", confidence: 0.85 }],
  sap: [{ server: "erp", tool: "sync_orders", confidence: 0.9 }],
  tally: [{ server: "tally", tool: "sync_inventory", confidence: 0.85 }],
  erp: [{ server: "erp", tool: "sync_orders", confidence: 0.8 }],
};

// Domain entity mentions
const ENTITY_PATTERNS: Array<{ pattern: RegExp; entity: string }> = [
  { pattern: /\b(?:shipment|package|parcel|courier|awb|tracking)\b/i, entity: "shipment" },
  { pattern: /\b(?:inventory|stock|sku|item|product|warehouse)\b/i, entity: "inventory" },
  { pattern: /\b(?:vehicle|truck|van|fleet|driver|gps|fuel)\b/i, entity: "vehicle" },
  { pattern: /\b(?:route|delivery|stop|waypoint|navigate)\b/i, entity: "route" },
  { pattern: /\b(?:order|purchase|sale|customer|buyer)\b/i, entity: "order" },
  { pattern: /\b(?:dock|loading|unloading|dock)\b/i, entity: "dock" },
  { pattern: /\b(?:gstin|gst|tax|eway|e-way|invoice)\b/i, entity: "compliance" },
  { pattern: /\b(?:license|rc|insurance|fitness|puc|challan)\b/i, entity: "compliance" },
  { pattern: /\b(?:plan|pricing|subscription|billing|payment)\b/i, entity: "billing" },
  { pattern: /\b(?:team|member|role|invite|admin)\b/i, entity: "team" },
];

// ── Public API ──

/**
 * Search the knowledge base with BM25 ranking.
 */
export function searchKB(options: SearchOptions): SearchResult[] {
  return searchKnowledgeBase(ALL_ENTRIES, options);
}

/**
 * Get all entries, optionally filtered.
 */
export function listKBEntries(filters?: {
  category?: KBCategory;
  subCategory?: KBSubCategory;
  planTier?: string;
}): KBEntry[] {
  let entries = ALL_ENTRIES;
  if (filters?.category) entries = entries.filter((e) => e.category === filters.category);
  if (filters?.subCategory) entries = entries.filter((e) => e.subCategory === filters.subCategory);
  if (filters?.planTier) entries = entries.filter((e) => !e.planTier || e.planTier === filters.planTier);
  return entries;
}

/**
 * Get a single entry by ID.
 */
export function getKBEntry(id: string): KBEntry | undefined {
  return ALL_ENTRIES.find((e) => e.id === id);
}

/**
 * Build agent context for a chat message.
 * Returns relevant knowledge entries, tool recommendations, and mentioned entities.
 */
export async function getKBAgentContext(userMessage: string): Promise<AgentContext> {
  const tokens = tokenize(userMessage);
  const lowerMessage = userMessage.toLowerCase();

  // 1. Search for relevant knowledge entries
  const searchResults = searchKB({ query: userMessage, limit: 10, minScore: 0.1 });
  const relevantEntries = searchResults.map((r) => r.entry);

  // 2. Detect tool recommendations based on keywords
  const toolRecommendations: AgentContext["toolRecommendations"] = [];
  const seenTools = new Set<string>();

  for (const token of tokens) {
    const recommendations = INTENT_TOOL_MAP[token];
    if (recommendations) {
      for (const rec of recommendations) {
        const key = `${rec.server}:${rec.tool}`;
        if (!seenTools.has(key)) {
          seenTools.add(key);
          toolRecommendations.push({
            ...rec,
            reason: `Keyword "${token}" matches ${rec.server}/${rec.tool}`,
          });
        }
      }
    }
  }

  // Sort by confidence
  toolRecommendations.sort((a, b) => b.confidence - a.confidence);

  // 3. Detect mentioned domain entities
  const mentionedEntities: string[] = [];
  for (const { pattern, entity } of ENTITY_PATTERNS) {
    if (pattern.test(userMessage) && !mentionedEntities.includes(entity)) {
      mentionedEntities.push(entity);
    }
  }

  // 4. Find applicable business rules
  const applicableRules: string[] = [];
  if (mentionedEntities.includes("billing") || lowerMessage.includes("plan") || lowerMessage.includes("price")) {
    applicableRules.push("rule:pricing_plans", "rule:plan_recommendation");
  }
  if (mentionedEntities.includes("team") || lowerMessage.includes("role") || lowerMessage.includes("admin")) {
    applicableRules.push("rule:rbac");
  }
  if (lowerMessage.includes("agent") || lowerMessage.includes("trust") || lowerMessage.includes("approval")) {
    applicableRules.push("rule:agent_trust");
  }
  if (lowerMessage.includes("limit") || lowerMessage.includes("rate")) {
    applicableRules.push("rule:rate_limiting");
  }

  return {
    relevantEntries,
    toolRecommendations: toolRecommendations.slice(0, 5),
    mentionedEntities,
    applicableRules,
  };
}

/**
 * Get the JSON-LD knowledge graph for external consumption.
 */
export function getKnowledgeGraph() {
  return buildKnowledgeGraph(ALL_ENTRIES);
}

/**
 * Get the agent discovery document.
 */
export function getAgentDiscovery() {
  return buildAgentDiscovery(ALL_ENTRIES);
}

/**
 * Get knowledge stats.
 */
export function getKBStats() {
  const byCategory: Record<string, number> = {};
  const bySubCategory: Record<string, number> = {};
  const byPlan: Record<string, number> = {};

  for (const entry of ALL_ENTRIES) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    bySubCategory[entry.subCategory] = (bySubCategory[entry.subCategory] || 0) + 1;
    if (entry.planTier) {
      byPlan[entry.planTier] = (byPlan[entry.planTier] || 0) + 1;
    }
  }

  return {
    totalEntries: ALL_ENTRIES.length,
    byCategory,
    bySubCategory,
    byPlan,
    mcpServers: [...new Set(MCP_ENTRIES.filter((e) => e.mcp).map((e) => e.mcp!.server))].length,
    mcpTools: MCP_ENTRIES.filter((e) => e.mcp).length,
  };
}
