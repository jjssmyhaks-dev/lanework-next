/**
 * Knowledge Base — Suggest API
 *
 * GET /api/knowledge/suggest?q=track
 *
 * Fast typeahead endpoint for the chat input. Returns compact suggestions
 * with title, category, snippet, and tags. Minimum 2 characters to query.
 *
 * Designed for low latency — no deep scoring, just BM25 top-N.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { suggestKB } from "@/lib/knowledge";

export const GET = withAuth(async (request, _user) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "6", 10), 10);

    if (query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = suggestKB(query, limit);

    return NextResponse.json({
      query,
      count: suggestions.length,
      suggestions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Suggest error", message: error.message },
      { status: 500 }
    );
  }
});
