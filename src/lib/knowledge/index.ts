/**
 * Knowledge Base — Public API
 *
 * One-stop import for all knowledge base functionality.
 */

export type {
  KBEntry,
  KBCategory,
  KBSubCategory,
  SearchOptions,
  SearchResult,
  AgentContext,
  MCPToolMeta,
  APIMeta,
  KnowledgeGraph,
} from "./types";

export {
  searchKB,
  listKBEntries,
  getKBEntry,
  getKBAgentContext,
  getKnowledgeGraph,
  getAgentDiscovery,
  getKBStats,
} from "./store";

export { tokenize, searchKnowledgeBase } from "./search";
export { buildKnowledgeGraph, buildAgentDiscovery, parseExternalGraph } from "./ontology";
export { MCP_ENTRIES } from "./mcp-entries";
export { DOMAIN_ENTRIES } from "./domain-entries";
