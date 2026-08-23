/**
 * JSON-LD Ontology for Lanework Knowledge Base
 *
 * Exposes Lanework's knowledge graph in a format that external AI agents
 * (Claude, GPT, Gemini, other MCP clients) can consume using standard
 * schema.org types and JSON-LD.
 *
 * Format: Open Knowledge compatible — uses schema.org vocabulary with
 * custom Lanework extensions for logistics domain concepts.
 */

import type { KBEntry, KnowledgeGraph } from "./types";

// ── Schema.org Type Mapping ──

const CATEGORY_TO_SCHEMA: Record<string, string> = {
  mcp_tool: "SoftwareApplication",
  domain_entity: "Thing",
  business_rule: "Rule",
  api_endpoint: "WebAPI",
  integration: "Service",
  workflow: "HowTo",
  procedure: "HowTo",
};

// ── Build Knowledge Graph ──

export function buildKnowledgeGraph(entries: KBEntry[]): KnowledgeGraph {
  return {
    "@context": [
      "https://schema.org",
      "https://lanework.ai/contexts/logistics/v1",
    ],
    "@graph": entries.map((entry) => buildSchemaOrgNode(entry)),
    meta: {
      version: "1.0.0",
      totalEntries: entries.length,
      generatedAt: new Date().toISOString(),
      generator: "Lanework Knowledge Base",
    },
  };
}

function buildSchemaOrgNode(entry: KBEntry) {
  const base: Record<string, unknown> = {
    "@type": CATEGORY_TO_SCHEMA[entry.category] || "Thing",
    "@id": `https://lanework.ai/knowledge/${entry.id}`,
    name: entry.title,
    description: entry.description,
    url: `https://lanework.ai/knowledge/${entry.id}`,
    provider: {
      "@type": "Organization",
      name: "Lanework",
      url: "https://lanework.ai",
    },
    dateModified: entry.updatedAt,
    keywords: entry.tags.join(", "),
  };

  // Add MCP-specific schema.org properties
  if (entry.mcp) {
    base.applicationCategory = "LogisticsApplication";
    base.operatingSystem = "Cloud (Vercel)";
    base.offers = {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      description: `Requires: ${entry.mcp.requiredEnvVars.join(", ") || "no API keys needed"}`,
    };
  }

  // Add API-specific schema.org properties
  if (entry.api) {
    base["@type"] = "WebAPI";
    base.method = entry.api.method;
    base.urlTemplate = `https://lanework.ai${entry.api.path}`;
    base.requiresInput = entry.api.authRequired;
    base.potentialAction = {
      "@type": "InvokeAction",
      name: entry.title,
      target: {
        "@type": "EntryPoint",
        urlTemplate: `https://lanework.ai${entry.api.path}`,
        actionPlatform: "https://schema.org/WebPlatform",
      },
    };
  }

  // Add Lanework custom extensions
  base["lanework:category"] = entry.category;
  base["lanework:subCategory"] = entry.subCategory;
  base["lanework:planTier"] = entry.planTier || "free";
  base["lanework:weight"] = entry.weight;

  if (entry.mcp) {
    base["lanework:mcpServer"] = entry.mcp.server;
    base["lanework:mcpTool"] = entry.mcp.toolName;
    base["lanework:modes"] = entry.mcp.modes;
    base["lanework:latencyMs"] = entry.mcp.latencyMs || 0;
  }

  return base;
}

// ── Parse External Knowledge Graph ──

export interface ExternalKnowledgeEntry {
  type: string;
  id: string;
  name: string;
  description: string;
  keywords: string[];
  provider?: string;
  lanework?: Record<string, unknown>;
}

/**
 * Parse an external agent's JSON-LD knowledge graph into Lanework format.
 * This allows importing knowledge from other systems.
 */
export function parseExternalGraph(graph: KnowledgeGraph): ExternalKnowledgeEntry[] {
  return graph["@graph"].map((node) => ({
    type: node["@type"] as string,
    id: node["@id"] as string,
    name: node.name as string,
    description: node.description as string,
    keywords: (node.keywords as string || "").split(", ").filter(Boolean),
    provider: (node.provider as any)?.name,
    lanework: Object.fromEntries(
      Object.entries(node).filter(([k]) => k.startsWith("lanework:"))
    ),
  }));
}

// ── Agent Discovery ──

/**
 * Build a discovery document that external agents can use to understand
 * what Lanework can do. Follows MCP server discovery pattern.
 */
export function buildAgentDiscovery(entries: KBEntry[]) {
  const byCategory: Record<string, KBEntry[]> = {};
  for (const entry of entries) {
    if (!byCategory[entry.category]) byCategory[entry.category] = [];
    byCategory[entry.category].push(entry);
  }

  return {
    name: "Lanework",
    description: "AI-powered logistics platform for Indian MSMEs — shipping, inventory, fleet, routes, compliance, and more.",
    version: "1.0.0",
    url: "https://lanework.ai",
    capabilities: Object.entries(byCategory).map(([category, catEntries]) => ({
      category,
      count: catEntries.length,
      entries: catEntries.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description.slice(0, 200),
        subCategory: e.subCategory,
        planTier: e.planTier,
        tags: e.tags,
      })),
    })),
    totalKnowledgeEntries: entries.length,
    supportedLanguages: ["English", "Hindi", "Hinglish"],
    targetMarket: "Indian MSMEs",
    pricing: {
      free: "₹0/mo — 10 AI chats/day, 20 shipments/mo",
      starter: "₹499/mo — 100 AI chats/day, 500 shipments/mo",
      growth: "₹1,999/mo — Unlimited everything",
      enterprise: "₹4,999/mo — Custom + SLA",
    },
    jsonLd: buildKnowledgeGraph(entries),
  };
}
