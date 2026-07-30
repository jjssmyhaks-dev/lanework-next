"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Truck, Package, Users, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type SearchType = "shipments" | "inventory" | "customers";

interface SearchResult {
  type: SearchType;
  id: string;
  title: string;
  description: string;
  href: string;
  relevance: number;
}

interface SearchResponse {
  results: SearchResult[];
  message: string | null;
  query: string;
}

// ── Group config ───────────────────────────────────────────────────────────

const GROUP_CONFIG: Record<
  SearchType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  shipments: { label: "Shipments", icon: Truck },
  inventory: { label: "Inventory", icon: Package },
  customers: { label: "Customers", icon: Users },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function groupResults(results: SearchResult[]) {
  const map = new Map<SearchType, SearchResult[]>();
  for (const r of results) {
    if (!map.has(r.type)) map.set(r.type, []);
    map.get(r.type)!.push(r);
  }
  return Array.from(map.entries()).map(([type, items]) => ({
    type,
    label: GROUP_CONFIG[type]?.label ?? type,
    icon: GROUP_CONFIG[type]?.icon ?? Package,
    items,
  }));
}

// ── Component ──────────────────────────────────────────────────────────────

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Debounced search ──────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setMessage("Type to search across shipments, inventory, and customers.");
      setError(null);
      setSelectedIdx(-1);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });

        const data: SearchResponse = await res.json();

        if (!res.ok) {
          setError(data.message || "Search failed.");
          setResults([]);
          setMessage(null);
          return;
        }

        setResults(data.results);
        setMessage(data.results.length === 0 ? data.message : null);
        setSelectedIdx(-1);
      } catch (err: any) {
        setError(err.message || "Network error. Please try again.");
        setResults([]);
        setMessage(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ── Open / close ──────────────────────────────────────────────────────
  const onOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setResults([]);
    setMessage(null);
    setError(null);
    setSelectedIdx(-1);
    // Focus after render
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const onClose = useCallback(() => {
    setOpen(false);
  }, []);

  // ── Navigate ──────────────────────────────────────────────────────────
  const groups = groupResults(results);
  const flatResults = groups.flatMap((g) => g.items);

  const navigateTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= flatResults.length) return;
      const item = flatResults[idx];
      onClose();
      router.push(item.href);
    },
    [flatResults, router, onClose]
  );

  // ── Keyboard ──────────────────────────────────────────────────────────
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setSelectedIdx((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setSelectedIdx((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
          break;
        }
        case "Enter": {
          e.preventDefault();
          navigateTo(selectedIdx);
          break;
        }
        case "Escape": {
          onClose();
          break;
        }
      }
    },
    [flatResults.length, selectedIdx, navigateTo, onClose]
  );

  // ── Global ⌘K / Ctrl+K shortcut ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          onClose();
        } else {
          onOpen();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpen, onClose]);

  // ── Scroll selected into view ──────────────────────────────────────────
  useEffect(() => {
    if (selectedIdx < 0 || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-search-item="${selectedIdx}"]`);
    if (el) {
      (el as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [selectedIdx]);

  // ── Click outside closes ───────────────────────────────────────────────
  const overlayRef = useRef<HTMLDivElement>(null);
  const onOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  return (
    <>
      {/* ── Trigger button ───────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex items-center gap-2 h-9 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500",
          "hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300 transition-colors",
          "w-full max-w-[280px]"
        )}
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left truncate">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 text-[10px] font-medium text-gray-400">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </button>

      {/* ── Modal overlay ─────────────────────────────────────────────── */}
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
          onClick={onOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          {/* panel */}
          <div className="relative z-10 w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            {/* ── Input ────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 border-b border-gray-100">
              {loading ? (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              ) : (
                <Search className="h-5 w-5 text-gray-400" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search shipments, inventory, customers…"
                className="flex-1 h-14 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-400">
                ESC
              </kbd>
            </div>

            {/* ── Body ─────────────────────────────────────────────────── */}
            <div
              ref={containerRef}
              className="max-h-[60vh] overflow-y-auto p-2"
            >
              {/* Loading state */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div className="py-12 text-center">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {/* Empty state (no query) */}
              {!loading && !error && !query.trim() && (
                <div className="py-12 text-center">
                  <Search className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">
                    {message || "Type to search across shipments, inventory, and customers."}
                  </p>
                </div>
              )}

              {/* No results state */}
              {!loading && !error && query.trim() && results.length === 0 && message && (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-500">{message}</p>
                </div>
              )}

              {/* Results grouped by type */}
              {!loading && !error && results.length > 0 &&
                groups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.type} className="mb-2 last:mb-0">
                      <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        <Icon className="h-3.5 w-3.5" />
                        {group.label}
                      </div>
                      {group.items.map((item) => {
                        // Build a flat-index for keyboard nav
                        const flatIdx = flatResults.indexOf(item);
                        const isSelected = selectedIdx === flatIdx;
                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            type="button"
                            data-search-item={flatIdx}
                            onClick={() => {
                              onClose();
                              router.push(item.href);
                            }}
                            onMouseEnter={() => setSelectedIdx(flatIdx)}
                            className={cn(
                              "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors",
                              isSelected ? "bg-gray-100" : "hover:bg-gray-50"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {item.description}
                              </p>
                            </div>
                            <CornerDownLeft
                              className={cn(
                                "h-3.5 w-3.5 text-gray-300 flex-shrink-0",
                                isSelected && "text-gray-400"
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
            </div>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <kbd className="inline-flex h-5 items-center rounded border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-400">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <kbd className="inline-flex h-5 items-center rounded border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-400">
                  ↩
                </kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <kbd className="inline-flex h-5 items-center rounded border border-gray-200 bg-gray-50 px-1.5 text-[10px] font-medium text-gray-400">
                  ESC
                </kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
