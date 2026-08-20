"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, Clock, DollarSign,
  ThumbsUp, ThumbsDown, RefreshCw, Activity, Zap, Shield, AlertTriangle
} from "lucide-react";

interface Metrics {
  period: string;
  audit: {
    totalActions: number;
    autoExecuted: number;
    approvedByUser: number;
    rejectedByUser: number;
    failedActions: number;
    avgRiskScore: number;
    avgDurationMs: number;
  };
  accuracy: {
    feedbackBased: number;
    outcomeBased: number;
    totalFeedback: number;
    totalOutcomes: number;
  };
  feedbackByAgent: Array<{
    agent_type: string;
    thumbs_up: number;
    thumbs_down: number;
    total: number;
  }>;
  alerts: Array<{ severity: string; count: number }>;
  workflows: Array<{ status: string; count: number; avg_duration_ms: number }>;
  outcomes: Array<{
    agent_type: string;
    total_outcomes: number;
    correct: number;
    incorrect: number;
    total_financial_impact: number;
    total_time_saved_min: number;
  }>;
  patterns: { total: number; autoApply: number };
}

const AGENT_LABELS: Record<string, string> = {
  shipment_tracking: "📦 Shipment Tracking",
  inventory_management: "📊 Inventory",
  fleet_management: "🚛 Fleet",
  compliance: "🪪 Compliance",
  route_optimization: "🗺️ Routes",
  warehouse_operations: "🏭 Warehouse",
  customer_communication: "💬 Customer",
};

export default function AgentMetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/metrics?period=${period}`);
      if (res.ok) {
        setMetrics(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <main className="min-h-screen bg-[#fafafa]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-32 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!metrics) {
    return (
      <main className="min-h-screen bg-[#fafafa]">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No metrics data available yet. Agent actions will appear here as they execute.</p>
        </div>
      </main>
    );
  }

  const totalAlerts = metrics.alerts.reduce((sum, a) => sum + a.count, 0);
  const criticalAlerts = metrics.alerts.find((a) => a.severity === "critical")?.count || 0;
  const totalWorkflows = metrics.workflows.reduce((sum, w) => sum + w.count, 0);
  const completedWorkflows = metrics.workflows.find((w) => w.status === "completed")?.count || 0;

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e] flex items-center gap-3">
              <BarChart3 className="h-7 w-7" />
              Agent Performance Metrics
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Last {metrics.period} — accuracy, actions, and outcomes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button
              onClick={fetchMetrics}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Zap className="h-5 w-5 text-blue-600" />}
            label="Total Actions"
            value={metrics.audit.totalActions}
            sub={`${metrics.audit.autoExecuted} auto-executed`}
            color="bg-blue-50"
          />
          <StatCard
            icon={<ThumbsUp className="h-5 w-5 text-emerald-600" />}
            label="Accuracy"
            value={`${metrics.accuracy.feedbackBased}%`}
            sub={`${metrics.accuracy.totalFeedback} feedback votes`}
            color="bg-emerald-50"
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-purple-600" />}
            label="Workflows Run"
            value={totalWorkflows}
            sub={`${completedWorkflows} completed`}
            color="bg-purple-50"
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
            label="Alerts Generated"
            value={totalAlerts}
            sub={`${criticalAlerts} critical`}
            color="bg-amber-50"
          />
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Clock className="h-5 w-5 text-indigo-600" />}
            label="Avg Response Time"
            value={`${metrics.audit.avgDurationMs}ms`}
            sub="per action"
            color="bg-indigo-50"
          />
          <StatCard
            icon={<Shield className="h-5 w-5 text-rose-600" />}
            label="Avg Risk Score"
            value={`${metrics.audit.avgRiskScore}/10`}
            sub="out of 10"
            color="bg-rose-50"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            label="Patterns Learned"
            value={metrics.patterns.total}
            sub={`${metrics.patterns.autoApply} auto-apply`}
            color="bg-emerald-50"
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5 text-orange-600" />}
            label="Rejected Actions"
            value={metrics.audit.rejectedByUser}
            sub="by users"
            color="bg-orange-50"
          />
        </div>

        {/* Agent Breakdown */}
        {metrics.feedbackByAgent.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Feedback by Agent Type</h2>
            <div className="space-y-3">
              {metrics.feedbackByAgent.map((f) => {
                const accuracy = f.total > 0 ? Math.round((f.thumbs_up / f.total) * 100) : 0;
                return (
                  <div key={f.agent_type} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 w-48">
                      {AGENT_LABELS[f.agent_type] || f.agent_type}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 w-16 text-right">{accuracy}%</span>
                    <div className="flex items-center gap-2 text-xs text-gray-400 w-24">
                      <ThumbsUp className="h-3 w-3 text-emerald-500" /> {f.thumbs_up}
                      <ThumbsDown className="h-3 w-3 text-red-500" /> {f.thumbs_down}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Outcomes */}
        {metrics.outcomes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Outcome Tracking</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-gray-500 font-medium">Agent</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Outcomes</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Correct</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Accuracy</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Financial Impact</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Time Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.outcomes.map((o) => (
                    <tr key={o.agent_type} className="border-b border-gray-50">
                      <td className="py-2 font-medium">{AGENT_LABELS[o.agent_type] || o.agent_type}</td>
                      <td className="py-2 text-right">{o.total_outcomes}</td>
                      <td className="py-2 text-right text-emerald-600">{o.correct}</td>
                      <td className="py-2 text-right font-medium">
                        {o.total_outcomes > 0 ? Math.round((o.correct / o.total_outcomes) * 100) : 0}%
                      </td>
                      <td className="py-2 text-right">₹{o.total_financial_impact.toLocaleString("en-IN")}</td>
                      <td className="py-2 text-right">{o.total_time_saved_min} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className={`${color} rounded-xl border border-gray-100 p-5`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[#1a1a2e]">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  );
}
