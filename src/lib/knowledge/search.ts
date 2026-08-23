/**
 * BM25 Search Engine for Knowledge Base
 *
 * Lightweight, zero-dependency text search using Okapi BM25 ranking.
 * No vector embeddings needed — works offline and is fast enough
 * for <1000 knowledge entries.
 */

import type { KBEntry, SearchResult, SearchOptions } from "./types";

// ── Tokenizer ──

/** Indian-language aware tokenizer: handles Hinglish, English, pincodes, GSTINs */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]/g, " ") // keep Devanagari
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "above", "below", "between", "out", "off", "over",
  "under", "again", "further", "then", "once", "here", "there", "when",
  "where", "why", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "because", "but", "and",
  "or", "if", "while", "about", "up", "that", "this", "it", "its",
  "what", "which", "who", "whom", "these", "those", "me", "my",
  "we", "our", "you", "your", "he", "him", "his", "she", "her",
  "they", "them", "their", "am", "i",
]);

// ── BM25 Implementation ──

const K1 = 1.5; // Term frequency saturation
const B = 0.75;  // Length normalization

interface CorpusStats {
  docCount: number;
  avgDocLength: number;
  /** term → number of documents containing it */
  docFreq: Map<string, number>;
  /** term → total frequency across all docs */
  totalFreq: Map<string, number>;
}

function buildCorpusStats(entries: KBEntry[]): CorpusStats {
  const docFreq = new Map<string, number>();
  const totalFreq = new Map<string, number>();
  let totalLength = 0;

  for (const entry of entries) {
    const tokens = getDocTokens(entry);
    const termCounts = new Map<string, number>();

    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) || 0) + 1);
    }

    for (const [term] of termCounts) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }

    for (const [term, count] of termCounts) {
      totalFreq.set(term, (totalFreq.get(term) || 0) + count);
    }

    totalLength += tokens.length;
  }

  return {
    docCount: entries.length,
    avgDocLength: entries.length > 0 ? totalLength / entries.length : 0,
    docFreq,
    totalFreq,
  };
}

/** Extract all searchable tokens from a KBEntry */
function getDocTokens(entry: KBEntry): string[] {
  const parts = [
    entry.title,
    entry.description,
    entry.tags.join(" "),
    entry.subCategory,
    entry.category,
    entry.planTier || "",
  ];

  // Include MCP metadata
  if (entry.mcp) {
    parts.push(entry.mcp.server, entry.mcp.toolName);
    parts.push(entry.mcp.requiredEnvVars.join(" "));
  }

  // Include API metadata
  if (entry.api) {
    parts.push(entry.api.path, entry.api.method);
  }

  // Include JSON-LD fields
  if (entry.jsonLd) {
    for (const [k, v] of Object.entries(entry.jsonLd)) {
      if (typeof v === "string") parts.push(v);
    }
  }

  // Include metadata values
  for (const [k, v] of Object.entries(entry.metadata)) {
    if (typeof v === "string") parts.push(v);
    if (Array.isArray(v)) parts.push(v.filter((x) => typeof x === "string").join(" "));
  }

  return tokenize(parts.join(" "));
}

function bm25Score(
  term: string,
  docTokens: string[],
  stats: CorpusStats
): number {
  const docLen = docTokens.length;
  const termCount = docTokens.filter((t) => t === term).length;

  const df = stats.docFreq.get(term) || 0;
  if (df === 0) return 0;

  const idf = Math.log(
    (stats.docCount - df + 0.5) / (df + 0.5) + 1
  );

  const tf = (termCount * (K1 + 1)) /
    (termCount + K1 * (1 - B + B * (docLen / stats.avgDocLength)));

  return idf * tf;
}

// ── Public Search API ──

export function searchKnowledgeBase(
  entries: KBEntry[],
  options: SearchOptions
): SearchResult[] {
  const { query, category, subCategory, planTier, tags, limit = 10, minScore = 0 } = options;

  // Pre-filter by category/tags
  let candidates = entries;
  if (category) candidates = candidates.filter((e) => e.category === category);
  if (subCategory) candidates = candidates.filter((e) => e.subCategory === subCategory);
  if (planTier) candidates = candidates.filter((e) => !e.planTier || e.planTier === planTier);
  if (tags && tags.length > 0) {
    candidates = candidates.filter((e) =>
      tags.some((t) => e.tags.includes(t))
    );
  }

  // No query → return weighted entries
  if (!query || query.trim() === "") {
    return candidates
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
      .map((entry) => ({
        entry,
        score: entry.weight,
        normalizedScore: 1,
        matchedFields: ["weight"],
        highlights: [],
      }));
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return candidates.slice(0, limit).map((entry) => ({
      entry,
      score: entry.weight,
      normalizedScore: 0.5,
      matchedFields: [],
      highlights: [],
    }));
  }

  const stats = buildCorpusStats(candidates);

  // Score each candidate
  const results: SearchResult[] = [];

  for (const entry of candidates) {
    const docTokens = getDocTokens(entry);
    let totalScore = 0;
    const matchedFields: string[] = [];
    const highlights: string[] = [];

    for (const qt of queryTokens) {
      const termScore = bm25Score(qt, docTokens, stats);
      totalScore += termScore;

      if (termScore > 0) {
        // Find which fields matched
        const lowerQuery = qt.toLowerCase();
        if (entry.title.toLowerCase().includes(lowerQuery)) matchedFields.push("title");
        if (entry.description.toLowerCase().includes(lowerQuery)) matchedFields.push("description");
        if (entry.tags.some((t) => t.toLowerCase().includes(lowerQuery))) matchedFields.push("tags");
        if (entry.mcp?.server.toLowerCase().includes(lowerQuery)) matchedFields.push("mcp.server");
        if (entry.mcp?.toolName.toLowerCase().includes(lowerQuery)) matchedFields.push("mcp.toolName");
        if (entry.api?.path.toLowerCase().includes(lowerQuery)) matchedFields.push("api.path");

        // Extract highlight snippet
        const snippet = extractSnippet(entry.description, qt);
        if (snippet) highlights.push(snippet);
      }
    }

    // Boost by entry weight
    totalScore *= (1 + entry.weight * 0.1);

    if (totalScore > minScore) {
      results.push({
        entry,
        score: totalScore,
        normalizedScore: 0, // computed after sorting
        matchedFields: [...new Set(matchedFields)],
        highlights: [...new Set(highlights)].slice(0, 3),
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Normalize scores 0-1
  const maxScore = results[0]?.score || 1;
  for (const r of results) {
    r.normalizedScore = r.score / maxScore;
  }

  return results.slice(0, limit);
}

/** Extract a snippet around the matching term */
function extractSnippet(text: string, term: string, contextChars = 60): string | null {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx === -1) return null;

  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + term.length + contextChars);
  let snippet = text.slice(start, end);

  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";

  return snippet;
}
