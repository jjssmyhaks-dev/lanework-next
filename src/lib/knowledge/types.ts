/**
 * Lanework Knowledge Base — Core Types
 *
 * Structured knowledge store for AI agents. Each entry follows a
 * JSON-LD / schema.org compatible format so external agents can
 * consume our knowledge in an interoperable way.
 *
 * Categories mirror the product's domain:
 *   mcp_tool      — one of the 58 MCP tools across 15 servers
 *   domain_entity — shipments, inventory, fleet, routes, etc.
 *   business_rule — pricing, RBAC, plan limits, workflows
 *   api_endpoint  — REST routes the frontend or agents call
 *   integration   — external service setup and configuration
 *   workflow      — multi-step autonomous agent actions
 *   procedure     — how-to knowledge for common logistics tasks
 */

// ── Core Knowledge Entry ──

export type KBCategory =
  | "mcp_tool"
  | "domain_entity"
  | "business_rule"
  | "api_endpoint"
  | "integration"
  | "workflow"
  | "procedure";

export type KBSubCategory =
  | "tracking"
  | "shipping"
  | "inventory"
  | "fleet"
  | "routes"
  | "warehouse"
  | "compliance"
  | "erp"
  | "ecommerce"
  | "weather"
  | "communication"
  | "scanning"
  | "docking"
  | "billing"
  | "auth"
  | "ai_agents"
  | "general";

export interface KBEntry {
  /** Unique identifier — e.g. "mcp:shiprocket:track_shipment" */
  id: string;
  /** Human-readable title */
  title: string;
  /** Full description — this is the main searchable text */
  description: string;
  /** Category */
  category: KBCategory;
  /** Sub-category for filtering */
  subCategory: KBSubCategory;
  /** Tags for fuzzy matching */
  tags: string[];
  /** The JSON-LD @context and @type for interoperability */
  jsonLd?: {
    "@context": string;
    "@type": string;
    [key: string]: unknown;
  };
  /** Structured metadata — varies by category */
  metadata: Record<string, unknown>;
  /** MCP-specific fields (only for mcp_tool entries) */
  mcp?: MCPToolMeta;
  /** API-specific fields (only for api_endpoint entries) */
  api?: APIMeta;
  /** Which plan tier unlocks this feature */
  planTier?: "free" | "starter" | "growth" | "enterprise";
  /** When this entry was last updated */
  updatedAt: string;
  /** Relevance weight — higher = more important */
  weight: number;
}

export interface MCPToolMeta {
  /** MCP server this tool belongs to — e.g. "shiprocket" */
  server: string;
  /** Tool name as registered in the MCP server — e.g. "track_shipment" */
  toolName: string;
  /** JSON Schema for inputs */
  inputSchema: Record<string, unknown>;
  /** What the tool returns */
  outputSchema?: Record<string, unknown>;
  /** Env vars required for live mode */
  requiredEnvVars: string[];
  /** Live/Simulated/Fallback modes */
  modes: Array<"live" | "simulated" | "db-fallback">;
  /** Approximate latency in ms */
  latencyMs?: number;
}

export interface APIMeta {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Route path — e.g. "/api/shipments" */
  path: string;
  /** Whether auth is required */
  authRequired: boolean;
  /** Rate limit (requests per minute) */
  rateLimit?: number;
  /** Request body Zod schema reference */
  validationSchema?: string;
  /** Example request/response */
  example?: { request?: unknown; response?: unknown };
}

// ── Search Types ──

export interface SearchOptions {
  /** Free-text query */
  query?: string;
  /** Filter by category */
  category?: KBCategory;
  /** Filter by sub-category */
  subCategory?: KBSubCategory;
  /** Filter by plan tier */
  planTier?: string;
  /** Filter by tags (AND logic) */
  tags?: string[];
  /** Max results to return */
  limit?: number;
  /** Minimum relevance score (0-1) */
  minScore?: number;
  /** Include JSON-LD in results */
  includeJsonLd?: boolean;
}

export interface SearchResult {
  entry: KBEntry;
  /** BM25 relevance score (unbounded, higher = better) */
  score: number;
  /** Normalized score 0-1 */
  normalizedScore: number;
  /** Which fields matched */
  matchedFields: string[];
  /** Highlighted snippets */
  highlights: string[];
}

// ── JSON-LD Interoperability ──

export interface KnowledgeGraph {
  "@context": string[];
  "@graph": Array<{
    "@type": string;
    "@id": string;
    name: string;
    description: string;
    url?: string;
    provider?: { "@type": "Organization"; name: string };
    [key: string]: unknown;
  }>;
  /** Metadata about the knowledge graph itself */
  meta: {
    version: string;
    totalEntries: number;
    generatedAt: string;
    generator: string;
  };
}

// ── Agent Context ──

export interface AgentContext {
  /** Relevant knowledge entries for the current query */
  relevantEntries: KBEntry[];
  /** Tool recommendations based on detected intent */
  toolRecommendations: Array<{
    server: string;
    tool: string;
    confidence: number;
    reason: string;
  }>;
  /** Domain entities mentioned in the query */
  mentionedEntities: string[];
  /** Business rules that apply */
  applicableRules: string[];
}
