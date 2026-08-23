"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Brain, Globe, Package, Shield, Workflow, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKnowledgeSuggest } from "@/components/ui/chat/use-knowledge-suggest";
import type { KBSuggestion } from "@/components/ui/chat/use-knowledge-suggest";

interface KBResult {
  id: string;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  tags: string[];
  score?: number;
  matchedFields?: string[];
  highlights?: string[];
  planTier?: string;
  weight?: number;
}

interface KBStats {
  totalEntries: number;
  byCategory: Record<string, number>;
  bySubCategory: Record<string, number>;
  byPlan: Record<string, number>;
  mcpServers: number;
  mcpTools: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  mcp_tool: "bg-blue-100 text-blue-800",
  domain_entity: "bg-purple-100 text-purple-800",
  business_rule: "bg-amber-100 text-amber-800",
  api_endpoint: "bg-green-100 text-green-800",
  integration: "bg-cyan-100 text-cyan-800",
  workflow: "bg-rose-100 text-rose-800",
  procedure: "bg-teal-100 text-teal-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  mcp_tool: "MCP Tool",
  domain_entity: "Domain Entity",
  business_rule: "Business Rule",
  api_endpoint: "API Endpoint",
  integration: "Integration",
  workflow: "Workflow",
  procedure: "Procedure",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  growth: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<KBResult[]>([]);
  const [stats, setStats] = useState<KBStats | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<KBResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"search" | "browse" | "stats">("browse");

  // Load stats on mount
  useEffect(() => {
    fetch("/api/knowledge?stats=true")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  // Search
  const handleSearch = useCallback(async () => {
    if (!query.trim() && !category) {
      setView("browse");
      return;
    }
    setLoading(true);
    setView("search");
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      params.set("limit", "50");
      const res = await fetch(`/api/knowledge?${params}`);
      const data = await res.json();
      setResults(data.results || data.entries || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  // Load all entries for browse mode
  useEffect(() => {
    if (view === "browse") {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      params.set("limit", "100");
      fetch(`/api/knowledge?${params}`)
        .then((r) => r.json())
        .then((data) => setResults(data.entries || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [view, category]);

  const {
    query: suggestQuery,
    setQuery: setSuggestQuery,
    suggestions,
    loading: suggestLoading,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown: suggestKeyDown,
    dismiss: dismissSuggestions,
  } = useKnowledgeSuggest({ debounceMs: 150 });

  const handleSuggestSelect = useCallback((s: KBSuggestion) => {
    setQuery(s.title);
    dismissSuggestions();
    // Auto-search with the selected suggestion
    setTimeout(() => handleSearch(), 0);
  }, [dismissSuggestions, handleSearch]);

  const CATEGORY_SUGGEST_COLORS: Record<string, string> = {
    mcp_tool: "text-blue-700 bg-blue-50 border-blue-200",
    domain_entity: "text-emerald-700 bg-emerald-50 border-emerald-200",
    business_rule: "text-amber-700 bg-amber-50 border-amber-200",
    api_endpoint: "text-purple-700 bg-purple-50 border-purple-200",
    integration: "text-cyan-700 bg-cyan-50 border-cyan-200",
    workflow: "text-rose-700 bg-rose-50 border-rose-200",
    procedure: "text-indigo-700 bg-indigo-50 border-indigo-200",
  };

  const CATEGORY_SUGGEST_ICONS: Record<string, React.ReactNode> = {
    mcp_tool: <Globe className="h-3 w-3" />,
    domain_entity: <Package className="h-3 w-3" />,
    business_rule: <Shield className="h-3 w-3" />,
    api_endpoint: <Globe className="h-3 w-3" />,
    integration: <Globe className="h-3 w-3" />,
    workflow: <Workflow className="h-3 w-3" />,
    procedure: <BookOpen className="h-3 w-3" />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">📚 Knowledge Base</h1>
          <p className="text-gray-500 mt-1">
            AI-powered logistics knowledge — {stats?.totalEntries || "—"} entries across {stats?.mcpServers || "—"} MCP servers and {stats?.mcpTools || "—"} tools
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Search Bar */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            {/* Suggest Popover */}
            {(suggestions.length > 0 || suggestLoading) && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50">
                <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                    <Brain className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Knowledge Base</span>
                    {suggestLoading && <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => handleSuggestSelect(s)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors",
                          i === selectedIndex ? "bg-blue-50" : "hover:bg-gray-50"
                        )}
                      >
                        <span className={cn("mt-0.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium shrink-0", CATEGORY_SUGGEST_COLORS[s.category] || "bg-gray-100 text-gray-700 border-gray-200")}>
                          {CATEGORY_SUGGEST_ICONS[s.category]}
                          {s.category.replace(/_/g, " ")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{s.snippet}</p>
                          {s.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {s.tags.map((tag) => (
                                <span key={tag} className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 bg-gray-50/50">
                    <span className="text-[10px] text-gray-400">
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">↑↓</kbd> navigate{' · '}
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> search{' · '}
                      <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Esc</kbd> dismiss
                    </span>
                    <span className="text-[10px] text-gray-400">{suggestions.length} result{suggestions.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSuggestQuery(e.target.value); }}
              onKeyDown={(e) => {
                if (suggestions.length > 0 && ["ArrowUp", "ArrowDown", "Escape"].includes(e.key)) {
                  suggestKeyDown(e);
                  return;
                }
                if (e.key === "Enter") {
                  dismissSuggestions();
                  handleSearch();
                }
              }}
              onBlur={() => setTimeout(dismissSuggestions, 200)}
              placeholder="Search knowledge base... (e.g. 'track shipment', 'pricing plans', 'GSTIN validation')"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-3 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
          {(["browse", "stats"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === v
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {v === "browse" ? "📖 Browse" : "📊 Stats"}
            </button>
          ))}
        </div>

        {/* Stats View */}
        {view === "stats" && stats && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalEntries}</div>
                <div className="text-sm text-gray-500">Total Entries</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.mcpServers}</div>
                <div className="text-sm text-gray-500">MCP Servers</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-2xl font-bold text-green-600">{stats.mcpTools}</div>
                <div className="text-sm text-gray-500">MCP Tools</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.byCategory).length}</div>
                <div className="text-sm text-gray-500">Categories</div>
              </div>
            </div>

            {/* By Category */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
              <div className="space-y-3">
                {Object.entries(stats.byCategory).map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}>
                      {CATEGORY_LABELS[cat] || cat}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 rounded-full h-2 transition-all"
                        style={{ width: `${(count / stats.totalEntries) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Plan */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">By Plan Tier</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.byPlan).map(([plan, count]) => (
                  <div key={plan} className={`rounded-lg p-4 text-center ${PLAN_COLORS[plan] || "bg-gray-100"}`}>
                    <div className="text-xl font-bold">{count}</div>
                    <div className="text-sm capitalize">{plan}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {(view === "browse" || view === "search") && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {view === "search" ? "No results found. Try different keywords." : "No entries found."}
              </div>
            ) : (
              results.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedEntry?.id === entry.id ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{entry.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[entry.category] || "bg-gray-100 text-gray-700"}`}>
                          {CATEGORY_LABELS[entry.category] || entry.category}
                        </span>
                        {entry.planTier && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[entry.planTier]}`}>
                            {entry.planTier}
                          </span>
                        )}
                        {entry.score !== undefined && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            {Math.round(entry.score * 100)}% match
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{entry.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.slice(0, 6).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {entry.tags.length > 6 && (
                          <span className="px-2 py-0.5 text-gray-400 text-xs">+{entry.tags.length - 6}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-400 text-xs">
                      {selectedEntry?.id === entry.id ? "▲" : "▼"}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedEntry?.id === entry.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-700 mb-3">{entry.description}</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="font-medium text-gray-500">ID:</span>{" "}
                          <span className="text-gray-700 font-mono">{entry.id}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Sub-category:</span>{" "}
                          <span className="text-gray-700">{entry.subCategory}</span>
                        </div>
                        {entry.matchedFields && entry.matchedFields.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-500">Matched:</span>{" "}
                            <span className="text-gray-700">{entry.matchedFields.join(", ")}</span>
                          </div>
                        )}
                      </div>
                      {entry.highlights && entry.highlights.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium text-gray-500 text-xs">Highlights:</span>
                          <ul className="mt-1 space-y-1">
                            {entry.highlights.map((h, i) => (
                              <li key={i} className="text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded">
                                {h}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
