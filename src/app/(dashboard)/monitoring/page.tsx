"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, Activity, Users, AlertTriangle, TrendingUp,
  Clock, RefreshCw, Zap, CheckCircle2, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

interface MonitoringMetrics {
  period: string;
  bucket: string;
  summary: {
    total_events: number;
    critical_events: number;
    unique_users: number;
    total_feedback: number;
    positive_feedback: number;
    avg_api_latency_ms: number;
  };
  timeSeries: {
    securityEvents: Array<{
      bucket: string;
      event_type: string;
      severity: string;
      count: number;
    }>;
    apiLatency: Array<{
      bucket: string;
      route: string;
      avg_ms: number;
      p50: number;
      p95: number;
      request_count: number;
    }>;
    agentAccuracy: Array<{
      bucket: string;
      agent_type: string;
      positive: number;
      negative: number;
      total: number;
    }>;
    errorRates: Array<{
      bucket: string;
      critical: number;
      warning: number;
      info: number;
      total: number;
    }>;
    activeUsers: Array<{
      bucket: string;
      unique_users: number;
    }>;
  };
}

// ── Simple bar chart (no external deps) ──

function BarChart({
  data,
  label,
  color = "#3b82f6",
  maxValue,
}: {
  data: Array<{ label: string; value: number }>;
  label: string;
  color?: string;
  maxValue?: number;
}) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{label}</h4>
      <div className="flex items-end gap-1 h-32">
        {data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
            No data
          </div>
        ) : (
          data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t transition-all duration-300 min-h-[2px]"
                style={{
                  height: `${Math.max((d.value / max) * 100, 2)}%`,
                  backgroundColor: color,
                  opacity: 0.7 + (d.value / max) * 0.3,
                }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
          ))
        )}
      </div>
      {data.length > 0 && (
        <div className="flex gap-1 mt-1">
          {data.map((d, i) => (
            <div
              key={i}
              className="flex-1 text-[9px] text-gray-400 text-center truncate"
              title={d.label}
            >
              {i % Math.max(1, Math.floor(data.length / 6)) === 0
                ? d.label
                : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stacked bar chart for error rates ──

function StackedBarChart({
  data,
  label,
  colors,
}: {    data: Array<{
      label: string;
      segments: { value: number; color: string; label?: string }[];
    }>;
  label: string;
  colors: string[];
}) {
  const max = Math.max(
    ...data.map((d) => d.segments.reduce((s, seg) => s + seg.value, 0)),
    1
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{label}</h4>
      <div className="flex items-end gap-1 h-32">
        {data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
            No data
          </div>
        ) : (
          data.map((d, i) => {
            const total = d.segments.reduce((s, seg) => s + seg.value, 0);
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t overflow-hidden flex flex-col-reverse"
                  style={{ height: `${Math.max((total / max) * 100, 2)}%` }}
                >
                  {d.segments.map((seg, j) => (
                    <div
                      key={j}
                      style={{
                        height: `${total > 0 ? (seg.value / total) * 100 : 0}%`,
                        backgroundColor: seg.color,
                      }}
                      title={`${seg.label || ""}: ${seg.value}`}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Metric card ──

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", color)}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`/api/monitoring/metrics?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  // Format time buckets for display
  const formatBucket = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // Transform security events into stacked bar chart data
  const securityChartData =
    metrics?.timeSeries.errorRates.map((e) => ({
      label: formatBucket(e.bucket),
      segments: [
        { value: e.critical, color: "#ef4444", label: "Critical" },
        { value: e.warning, color: "#f59e0b", label: "Warning" },
        { value: e.info, color: "#3b82f6", label: "Info" },
      ],
    })) || [];

  // Transform API latency into bar chart
  const latencyChartData =
    metrics?.timeSeries.apiLatency.map((e) => ({
      label: `${formatBucket(e.bucket)} ${e.route}`,
      value: e.p95,
    })) || [];

  // Transform active users
  const usersChartData =
    metrics?.timeSeries.activeUsers.map((e) => ({
      label: formatBucket(e.bucket),
      value: e.unique_users,
    })) || [];

  // Agent accuracy per type
  const agentTypes =
    metrics?.timeSeries.agentAccuracy.reduce(
      (acc, e) => {
        if (!acc[e.agent_type]) acc[e.agent_type] = { positive: 0, negative: 0 };
        acc[e.agent_type].positive += e.positive;
        acc[e.agent_type].negative += e.negative;
        return acc;
      },
      {} as Record<string, { positive: number; negative: number }>
    ) || {};

  const accuracy = metrics?.summary
    ? metrics.summary.total_feedback > 0
      ? Math.round(
          (metrics.summary.positive_feedback / metrics.summary.total_feedback) *
            100
        )
      : 0
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              Monitoring Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time system health, security events, and agent performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={168}>Last 7 days</option>
            </select>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                autoRefresh
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "bg-gray-50 border-gray-300 text-gray-600"
              )}
            >
              {autoRefresh ? "● Live" : "○ Paused"}
            </button>
            <button
              onClick={fetchMetrics}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw
                className={cn("h-4 w-4", loading && "animate-spin")}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading && !metrics ? (
          <div className="text-center py-20 text-gray-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3" />
            Loading metrics...
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <MetricCard
                icon={<Shield className="h-5 w-5 text-blue-600" />}
                label="Total Events"
                value={metrics?.summary.total_events || 0}
                color="bg-blue-50"
              />
              <MetricCard
                icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                label="Critical"
                value={metrics?.summary.critical_events || 0}
                color="bg-red-50"
              />
              <MetricCard
                icon={<Users className="h-5 w-5 text-purple-600" />}
                label="Active Users"
                value={metrics?.summary.unique_users || 0}
                color="bg-purple-50"
              />
              <MetricCard
                icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                label="Accuracy"
                value={`${accuracy}%`}
                sub={`${metrics?.summary.total_feedback || 0} feedback`}
                color="bg-green-50"
              />
              <MetricCard
                icon={<Clock className="h-5 w-5 text-amber-600" />}
                label="Avg Latency"
                value={`${metrics?.summary.avg_api_latency_ms || 0}ms`}
                color="bg-amber-50"
              />
              <MetricCard
                icon={<Zap className="h-5 w-5 text-cyan-600" />}
                label="Feedback"
                value={metrics?.summary.total_feedback || 0}
                sub={`${metrics?.summary.positive_feedback || 0} positive`}
                color="bg-cyan-50"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Error Rates (stacked) */}
              <StackedBarChart
                data={securityChartData}
                label="Security Events by Severity"
                colors={["#ef4444", "#f59e0b", "#3b82f6"]}
              />

              {/* API Latency */}
              <BarChart
                data={latencyChartData}
                label="API Latency (p95 ms)"
                color="#8b5cf6"
              />

              {/* Active Users */}
              <BarChart
                data={usersChartData}
                label="Active Users per Bucket"
                color="#06b6d4"
              />

              {/* Agent Accuracy */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Agent Accuracy by Type
                </h4>
                {Object.keys(agentTypes).length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-xs text-gray-400">
                    No feedback data yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(agentTypes).map(([type, data]) => {
                      const pct =
                        data.positive + data.negative > 0
                          ? Math.round(
                              (data.positive /
                                (data.positive + data.negative)) *
                                100
                            )
                          : 0;
                      return (
                        <div key={type}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 capitalize">
                              {type.replace(/_/g, " ")}
                            </span>
                            <span className="text-gray-500">
                              {pct}% ({data.positive}/{data.positive + data.negative})
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                pct >= 80
                                  ? "bg-green-500"
                                  : pct >= 60
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Security Events Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Recent Security Events
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Event</th>
                      <th className="pb-2 font-medium">Severity</th>
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics?.timeSeries.securityEvents
                      .slice(0, 20)
                      .map((e, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-50 hover:bg-gray-50"
                        >
                          <td className="py-2 text-gray-600">
                            {formatBucket(e.bucket)}
                          </td>
                          <td className="py-2 font-mono text-xs text-gray-800">
                            {e.event_type}
                          </td>
                          <td className="py-2">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                e.severity === "critical"
                                  ? "bg-red-100 text-red-700"
                                  : e.severity === "warning"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-blue-100 text-blue-700"
                              )}
                            >
                              {e.severity}
                            </span>
                          </td>
                          <td className="py-2 text-gray-500 text-xs">—</td>
                          <td className="py-2 font-medium text-gray-700">
                            {e.count}
                          </td>
                        </tr>
                      ))}
                    {(!metrics?.timeSeries.securityEvents ||
                      metrics.timeSeries.securityEvents.length === 0) && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-gray-400"
                        >
                          No security events in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
