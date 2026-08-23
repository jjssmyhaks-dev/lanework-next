"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Flag, Shield, ToggleLeft, ToggleRight, Lock, Unlock,
  RefreshCw, Search, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  minPlan: string | null;
  enabled: boolean;
  category: string;
  updatedAt: string;
  available?: boolean;
  lockedReason?: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  growth: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

const CATEGORY_ICONS: Record<string, string> = {
  polling: "⚡",
  ai: "🤖",
  integration: "🔌",
  data: "📊",
  support: "💬",
  general: "🔧",
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch("/api/feature-flags?availability=true");
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags || []);
      }
    } catch (err) {
      console.error("Failed to fetch flags:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (flag: FeatureFlag) => {
    setUpdating(flag.key);
    try {
      const res = await fetch("/api/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: flag.key, enabled: !flag.enabled }),
      });
      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) =>
            f.key === flag.key ? { ...f, enabled: !f.enabled } : f
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle flag:", err);
    } finally {
      setUpdating(null);
    }
  };

  const categories = [...new Set(flags.map((f) => f.category))];
  const filtered = flags.filter((f) => {
    if (
      search &&
      !f.name.toLowerCase().includes(search.toLowerCase()) &&
      !f.key.toLowerCase().includes(search.toLowerCase()) &&
      !f.description.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (categoryFilter && f.category !== categoryFilter) return false;
    return true;
  });

  const enabledCount = flags.filter((f) => f.enabled).length;
  const lockedCount = flags.filter((f) => !f.available && f.enabled).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Flag className="h-6 w-6 text-indigo-600" />
            Feature Flags
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Toggle features per plan tier — {enabledCount} enabled, {lockedCount} locked
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{flags.length}</div>
            <div className="text-sm text-gray-500">Total Flags</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">{enabledCount}</div>
            <div className="text-sm text-gray-500">Enabled</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-red-600">{flags.length - enabledCount}</div>
            <div className="text-sm text-gray-500">Disabled</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-amber-600">{lockedCount}</div>
            <div className="text-sm text-gray-500">Plan-Locked</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flags..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_ICONS[cat] || "🔧"} {cat}
              </option>
            ))}
          </select>
          <button
            onClick={fetchFlags}
            className="p-2.5 rounded-lg border border-gray-300 hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Flags List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading flags...
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((flag) => (
              <div
                key={flag.id}
                className={cn(
                  "bg-white rounded-xl border p-4 transition-all",
                  flag.enabled
                    ? "border-gray-200 hover:shadow-sm"
                    : "border-gray-100 opacity-75"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">
                        {CATEGORY_ICONS[flag.category] || "🔧"}
                      </span>
                      <h3 className="font-semibold text-gray-900">{flag.name}</h3>
                      <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-500">
                        {flag.key}
                      </code>
                      {flag.minPlan && (
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            PLAN_COLORS[flag.minPlan] || "bg-gray-100 text-gray-700"
                          )}
                        >
                          {flag.minPlan}+
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{flag.description}</p>
                    {flag.lockedReason && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        {flag.lockedReason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <button
                      onClick={() => handleToggle(flag)}
                      disabled={updating === flag.key}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                        flag.enabled ? "bg-green-500" : "bg-gray-300",
                        updating === flag.key && "opacity-50"
                      )}
                      title={flag.enabled ? "Disable" : "Enable"}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                          flag.enabled ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                    {flag.enabled ? (
                      <Unlock className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No flags match your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
