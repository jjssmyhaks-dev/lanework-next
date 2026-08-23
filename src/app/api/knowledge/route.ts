/**
 * Knowledge Base API
 *
 * GET /api/knowledge — Search, list, or get stats from the knowledge base.
 *
 * Query params:
 *   q           — free-text search query
 *   category    — filter by category (mcp_tool, domain_entity, business_rule, etc.)
 *   subCategory — filter by sub-category (tracking, inventory, fleet, etc.)
 *   planTier    — filter by plan tier (free, starter, growth, enterprise)
 *   id          — get a single entry by ID
 *   stats       — return knowledge base statistics
 *   discovery   — return agent discovery document
 *   graph       — return JSON-LD knowledge graph
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import {
  searchKB,
  listKBEntries,
  getKBEntry,
  getKBStats,
  getKnowledgeGraph,
  getAgentDiscovery,
} from "@/lib/knowledge";

export const GET = withAuth(async (request, _user) => {
  try {
    const { searchParams } = new URL(request.url);

    // Single entry by ID
    const id = searchParams.get("id");
    if (id) {
      const entry = getKBEntry(id);
      if (!entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }
      return NextResponse.json({ entry });
    }

    // Stats
    if (searchParams.get("stats") === "true") {
      return NextResponse.json(getKBStats());
    }

    // Agent discovery
    if (searchParams.get("discovery") === "true") {
      return NextResponse.json(getAgentDiscovery());
    }

    // JSON-LD knowledge graph
    if (searchParams.get("graph") === "true") {
      return NextResponse.json(getKnowledgeGraph(), {
        headers: { "Content-Type": "application/ld+json" },
      });
    }

    // Search or list
    const query = searchParams.get("q") || undefined;
    const category = (searchParams.get("category") as any) || undefined;
    const subCategory = (searchParams.get("subCategory") as any) || undefined;
    const planTier = searchParams.get("planTier") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (query) {
      // BM25 search
      const results = searchKB({
        query,
        category,
        subCategory,
        planTier,
        limit,
        minScore: 0.05,
      });
      return NextResponse.json({
        query,
        count: results.length,
        results: results.map((r) => ({
          id: r.entry.id,
          title: r.entry.title,
          description: r.entry.description.slice(0, 300),
          category: r.entry.category,
          subCategory: r.entry.subCategory,
          tags: r.entry.tags,
          score: r.normalizedScore,
          matchedFields: r.matchedFields,
          highlights: r.highlights,
          planTier: r.entry.planTier,
        })),
      });
    }

    // List entries with filters
    const entries = listKBEntries({ category, subCategory, planTier });
    return NextResponse.json({
      count: entries.length,
      entries: entries.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description.slice(0, 200),
        category: e.category,
        subCategory: e.subCategory,
        tags: e.tags,
        planTier: e.planTier,
        weight: e.weight,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Knowledge base error", message: error.message },
      { status: 500 }
    );
  }
});
