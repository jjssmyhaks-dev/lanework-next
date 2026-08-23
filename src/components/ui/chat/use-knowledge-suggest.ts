/**
 * useKnowledgeSuggest — Debounced typeahead hook for the chat input.
 *
 * Fetches /api/knowledge/suggest as the user types, with 200ms debounce
 * and a minimum 2-character query. Returns suggestions, loading state,
 * and a select handler that fills the input.
 *
 * Usage:
 *   const { suggestions, loading, query, setQuery } = useKnowledgeSuggest();
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface KBSuggestion {
  id: string;
  title: string;
  category: string;
  subCategory: string;
  snippet: string;
  tags: string[];
}

interface UseKnowledgeSuggestOptions {
  /** Debounce delay in ms (default 200) */
  debounceMs?: number;
  /** Min chars before fetching (default 2) */
  minChars?: number;
  /** Max results (default 6) */
  limit?: number;
}

export function useKnowledgeSuggest(options: UseKnowledgeSuggestOptions = {}) {
  const { debounceMs = 200, minChars = 2, limit = 6 } = options;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<KBSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch suggestions
  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (q.trim().length < minChars) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Abort previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      try {
        const res = await fetch(
          `/api/knowledge/suggest?q=${encodeURIComponent(q)}&limit=${limit}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          setSuggestions([]);
          return;
        }

        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setSelectedIndex(-1);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [minChars, limit]
  );

  // Debounced update when query changes
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (query.trim().length < minChars) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, debounceMs, minChars, fetchSuggestions]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (e.key === "Tab" && selectedIndex >= 0) {
        e.preventDefault();
        return suggestions[selectedIndex];
      } else if (e.key === "Escape") {
        setSuggestions([]);
        setSelectedIndex(-1);
      }

      return null;
    },
    [suggestions, selectedIndex]
  );

  // Clear suggestions
  const dismiss = useCallback(() => {
    setSuggestions([]);
    setSelectedIndex(-1);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    query,
    setQuery,
    suggestions,
    loading,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
    dismiss,
  };
}
