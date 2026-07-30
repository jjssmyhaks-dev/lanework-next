"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, RefreshCw, Loader2, AlertCircle } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

type AgentTask = {
  id: string;
  agent_type: string;
  action_type: string;
  status: string;
  reasoning_trace: string | null;
  created_at: string;
};

type Integration = {
  id: string;
  name: string;
  status: string;
  type: string;
};

const AGENT_TYPE_MAP: Record<string, string> = {
  "shipment-tracking": "shipment-tracking",
  "inventory-management": "inventory-management",
  "route-optimization": "route-optimization",
  "warehouse-operations": "warehouse-operations",
  "fleet-management": "fleet-management",
  "customer-communication": "customer-support",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  running: "bg-blue-50 text-blue-700 border-blue-200",
};

// ── Component ──────────────────────────────────────────────────────────

export function AgentLiveActivity({ agentId }: { agentId: string }) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const agentType = AGENT_TYPE_MAP[agentId] || agentId;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tasksRes, intRes] = await Promise.all([
        fetch(`/api/ai?agent_type=${encodeURIComponent(agentType)}&limit=5`),
        fetch(`/api/integrations?agent=${encodeURIComponent(agentId)}`),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(Array.isArray(data) ? data : []);
      } else {
        setTasks([]);
      }

      if (intRes.ok) {
        const data = await intRes.json();
        setIntegrations(Array.isArray(data) ? data : []);
      } else {
        setIntegrations([]);
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError("Couldn't load activity data. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [agentType, agentId]);

  // Initial fetch ＋ 30s auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const connectedIntegrations = integrations.filter((i) => i.status === "connected");

  // ── Loading skeleton ─────────────────────────────────────────────────
  if (loading && tasks.length === 0) {
    return (
      <section className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-6 w-6 text-[#1a1a2e]" />
          <h3 className="text-2xl font-semibold">Live Activity</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-3 p-4 rounded-xl border border-[#e5e7eb] animate-pulse">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
              <div className="flex-1 h-3 bg-gray-100 rounded" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────
  if (error && tasks.length === 0) {
    return (
      <section className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-6 w-6 text-[#1a1a2e]" />
          <h3 className="text-2xl font-semibold">Live Activity</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-[#e5e7eb] bg-gray-50">
          <AlertCircle className="h-8 w-8 text-amber-400 mb-3" />
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-full border border-[#1a1a2e]/20 px-4 py-2 text-sm text-[#1a1a2e] hover:bg-[#1a1a2e]/5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </section>
    );
  }

  // ── Live view ────────────────────────────────────────────────────────
  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-[#1a1a2e]" />
          <h3 className="text-2xl font-semibold">Live Activity</h3>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Connected integrations ───────────────────────────────────── */}
      {connectedIntegrations.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {connectedIntegrations.map((int) => (
            <span
              key={int.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {int.name}
            </span>
          ))}
          {integrations.filter((i) => i.status !== "connected").length > 0 && (
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-400">
              +{integrations.filter((i) => i.status !== "connected").length} available
            </span>
          )}
        </div>
      )}

      {/* ── Recent tasks ─────────────────────────────────────────────── */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e5e7eb] hover:bg-gray-50 transition-colors"
            >
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  STATUS_COLORS[task.status] || "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                {task.status}
              </span>
              <span className="text-sm font-medium text-[#1a1a2e]">{task.action_type || "task"}</span>
              <span className="flex-1 text-xs text-gray-400 truncate">
                {task.reasoning_trace ? task.reasoning_trace.slice(0, 100) + (task.reasoning_trace.length > 100 ? "…" : "") : "—"}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(task.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        /* ── Empty state ─────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-[#e5e7eb] bg-gray-50">
          <Activity className="h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No recent activity yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Tasks will appear here as the {agentId.replace(/-/g, " ")} agent processes work.
          </p>
        </div>
      )}
    </section>
  );
}
