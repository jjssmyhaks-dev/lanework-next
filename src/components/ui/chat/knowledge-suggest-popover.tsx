/**
 * KnowledgeSuggestPopover — Floating suggestion list for the chat input.
 *
 * Shows category-colored badges, titles, snippets, and tags.
 * Supports keyboard navigation (arrow keys + Tab to select).
 *
 * Usage:
 *   <KnowledgeSuggestPopover
 *     suggestions={suggestions}
 *     loading={loading}
 *     selectedIndex={selectedIndex}
 *     onSelect={handleSelect}
 *     visible={suggestions.length > 0 || loading}
 *   />
 */

"use client";

import { useRef, useEffect } from "react";
import { Loader2, Brain, Package, Shield, Workflow, Globe, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KBSuggestion } from "./use-knowledge-suggest";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  mcp_tool: {
    label: "Tool",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <Globe className="h-3 w-3" />,
  },
  domain_entity: {
    label: "Entity",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
    icon: <Package className="h-3 w-3" />,
  },
  business_rule: {
    label: "Rule",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    icon: <Shield className="h-3 w-3" />,
  },
  api_endpoint: {
    label: "API",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
    icon: <Globe className="h-3 w-3" />,
  },
  integration: {
    label: "Integration",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50 border-cyan-200",
    icon: <Globe className="h-3 w-3" />,
  },
  workflow: {
    label: "Workflow",
    color: "text-rose-700",
    bgColor: "bg-rose-50 border-rose-200",
    icon: <Workflow className="h-3 w-3" />,
  },
  procedure: {
    label: "How-to",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 border-indigo-200",
    icon: <BookOpen className="h-3 w-3" />,
  },
};

interface KnowledgeSuggestPopoverProps {
  suggestions: KBSuggestion[];
  loading: boolean;
  selectedIndex: number;
  onSelect: (suggestion: KBSuggestion) => void;
  visible: boolean;
}

export default function KnowledgeSuggestPopover({
  suggestions,
  loading,
  selectedIndex,
  onSelect,
  visible,
}: KnowledgeSuggestPopoverProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  if (!visible) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 z-50"
      role="listbox"
      aria-label="Knowledge suggestions"
    >
      <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <Brain className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
            Knowledge Base
          </span>
          {loading && <Loader2 className="h-3 w-3 text-gray-400 animate-spin" />}
        </div>

        {/* Suggestions */}
        <div ref={listRef} className="max-h-[280px] overflow-y-auto">
          {suggestions.map((s, i) => {
            const cat = CATEGORY_CONFIG[s.category] || CATEGORY_CONFIG.mcp_tool;
            return (
              <button
                key={s.id}
                role="option"
                aria-selected={i === selectedIndex}
                onClick={() => onSelect(s)}
                onMouseEnter={() => {}}
                className={cn(
                  "w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors",
                  i === selectedIndex
                    ? "bg-[#1a1a2e]/5"
                    : "hover:bg-gray-50"
                )}
              >
                {/* Category badge */}
                <span
                  className={cn(
                    "mt-0.5 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium shrink-0",
                    cat.bgColor,
                    cat.color
                  )}
                >
                  {cat.icon}
                  {cat.label}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {highlightMatch(s.title, s.subCategory)}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {s.snippet}
                  </p>
                  {s.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {s.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Keyboard hint */}
                {i === selectedIndex && (
                  <span className="mt-1 text-[10px] text-gray-400 shrink-0">
                    ↵
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 bg-gray-50/50">
          <span className="text-[10px] text-gray-400">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">↑↓</kbd> navigate
            {" · "}
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Tab</kbd> insert
            {" · "}
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Esc</kbd> dismiss
          </span>
          <span className="text-[10px] text-gray-400">
            {suggestions.length} result{suggestions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Highlight the subcategory prefix in the title if it matches */
function highlightMatch(title: string, subCategory: string): React.ReactNode {
  const idx = title.toLowerCase().indexOf(subCategory.replace(/_/g, " ").toLowerCase());
  if (idx === -1) return title;

  return (
    <>
      {title.slice(0, idx)}
      <span className="text-[#1a1a2e] font-semibold">
        {title.slice(idx, idx + subCategory.length)}
      </span>
      {title.slice(idx + subCategory.length)}
    </>
  );
}
