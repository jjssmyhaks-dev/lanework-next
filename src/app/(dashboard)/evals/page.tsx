"use client";

import { useState, useCallback } from "react";
import {
  Play, RotateCcw, CheckCircle2, XCircle, Clock,
  TrendingUp, BarChart3, Activity, Loader2, ChevronDown, ChevronRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EvalResult {
  testId: string;
  agent: string;
  scenario: string;
  input: Record<string, unknown>;
  output: string;
  latencyMs: number;
  scores: {
    keywordMatch: number;
    lengthOk: number;
    latencyOk: number;
    overall: number;
  };
  passed: boolean;
  error?: string;
}

interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  byAgent: Record<string, { total: number; passed: number; avgScore: number }>;
  overallAvgScore: number;
  totalDurationMs: number;
  results: EvalResult[];
}

const agentLabels: Record<string, string> = {
  "shipment-tracking": "Shipment Tracking",
  "route-optimization": "Route Optimization",
  "customer-support": "Customer Support",
  "reasoning": "Task Reasoning",
};

const agentFilters = [
  { key: "", label: "All Agents" },
  { key: "shipment-tracking", label: "Shipment Tracking" },
  { key: "route-optimization", label: "Route Optimization" },
  { key: "customer-support", label: "Customer Support" },
  { key: "reasoning", label: "Task Reasoning" },
];

export default function EvalDashboard() {
  const [summary, setSummary] = useState<EvalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState("");
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  const runEval = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch("/api/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentFilter ? { agent: agentFilter } : {}),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eval failed");
    } finally {
      setLoading(false);
    }
  }, [agentFilter]);

  const scoreColor = (score: number) => {
    if (score >= 0.8) return "text-emerald-600";
    if (score >= 0.5) return "text-amber-600";
    return "text-red-600";
  };

  const scoreBg = (score: number) => {
    if (score >= 0.8) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 0.5) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agent Evaluations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Run structured tests against your AI agents to measure accuracy, relevance, and performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
          >
            {agentFilters.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <button
            onClick={runEval}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
            ) : (
              <><Play className="h-4 w-4" /> Run Evals</>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!summary && !loading && !error && (
        <Card className="border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-gray-100 p-4">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No eval data yet</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md text-center">
              Click "Run Evals" to test all 32 scenarios across 4 agents. The eval measures keyword accuracy, response length, latency, and completion.
            </p>
            <button
              onClick={runEval}
              disabled={loading}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-black/90"
            >
              <Play className="h-4 w-4" /> Run Evals
            </button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && !summary && (
        <Card className="border border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="mt-4 text-sm text-gray-500">Running {agentFilter ? agentLabels[agentFilter] : "all"} agent tests…</p>
            <p className="mt-1 text-xs text-gray-400">This may take 30-60 seconds depending on AI service latency.</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 font-medium">Total Tests</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{summary.total}</div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 font-medium">Passed</div>
                <div className="mt-1 text-2xl font-semibold text-emerald-600">{summary.passed}</div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 font-medium">Failed</div>
                <div className="mt-1 text-2xl font-semibold text-red-600">{summary.failed}</div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 font-medium">Avg Score</div>
                <div className={`mt-1 text-2xl font-semibold ${scoreColor(summary.overallAvgScore)}`}>
                  {(summary.overallAvgScore * 100).toFixed(0)}%
                </div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 font-medium">Total Time</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">
                  {(summary.totalDurationMs / 1000).toFixed(1)}s
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-agent breakdown */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">Per-Agent Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(summary.byAgent).map(([agent, stats]) => (
                  <div key={agent} className="rounded-xl border border-gray-200 p-4">
                    <div className="text-sm font-medium text-gray-900">
                      {agentLabels[agent] || agent}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className={`text-lg font-semibold ${scoreColor(stats.avgScore)}`}>
                        {(stats.avgScore * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs text-gray-400">
                        {stats.passed}/{stats.total} passed
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${stats.avgScore >= 0.8 ? "bg-emerald-500" : stats.avgScore >= 0.5 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${stats.avgScore * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed results */}
          <Card className="border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Detailed Results</CardTitle>
              <Badge variant="outline" className="text-xs">
                {summary.results.length} tests
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summary.results.map((r) => {
                  const isExpanded = expandedTest === r.testId;
                  return (
                    <div key={r.testId} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setExpandedTest(isExpanded ? null : r.testId)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        {r.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">{r.scenario}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {agentLabels[r.agent] || r.agent}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className={`text-xs font-medium ${scoreColor(r.scores.overall)}`}>
                              {(r.scores.overall * 100).toFixed(0)}%
                            </span>
                            <span className="text-xs text-gray-400">
                              {r.latencyMs}ms
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${scoreBg(r.scores.overall)}`}>
                          {r.passed ? "PASS" : "FAIL"}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                          {/* Scores grid */}
                          <div className="grid grid-cols-4 gap-2 text-center">
                            {[
                              { label: "Keywords", value: r.scores.keywordMatch },
                              { label: "Length", value: r.scores.lengthOk },
                              { label: "Latency", value: r.scores.latencyOk },
                              { label: "Overall", value: r.scores.overall },
                            ].map((s) => (
                              <div key={s.label} className="bg-white rounded-md border border-gray-200 p-2">
                                <div className={`text-sm font-semibold ${scoreColor(s.value)}`}>
                                  {(s.value * 100).toFixed(0)}%
                                </div>
                                <div className="text-[10px] text-gray-400">{s.label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Output */}
                          <div>
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">AI Output</div>
                            <div className="bg-white rounded-md border border-gray-200 p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {r.output}
                            </div>
                          </div>

                          {r.error && (
                            <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                              Error: {r.error}
                            </div>
                          )}

                          {/* Input */}
                          <div>
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Input</div>
                            <pre className="bg-white rounded-md border border-gray-200 p-2 text-xs text-gray-500 overflow-x-auto">
                              {JSON.stringify(r.input, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
