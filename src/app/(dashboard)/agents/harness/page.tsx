"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Play, Loader2, BarChart3, Zap, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HarnessStatus {
  lastRunAt: string | null;
  lastScore: number | null;
  baselineScore: number | null;
  trend: "improving" | "stable" | "declining" | "unknown";
  totalRuns: number;
  regressionsDetected: number;
}

interface HarnessRun {
  id: string;
  timestamp: string;
  evalResults: {
    total: number;
    passed: number;
    failed: number;
    overallAvgScore: number;
    byAgent: Record<string, { total: number; passed: number; avgScore: number }>;
  };
  tuningResult: {
    learningCycle: { insights: number; patternsStored: number };
    riskAdjustments: Array<{ actionType: string; oldScore: number; newScore: number; reason: string }>;
    trustChanges: Array<{ agentType: string; actionType: string; oldLevel: string; newLevel: string; reason: string }>;
  };
  learningInsights: Array<{ type: string; agentType: string; description: string; confidence: number; recommendation: string }>;
  regressionDetected: boolean;
  regressionDetails: string[];
  baselineComparison: { previousScore: number | null; currentScore: number; delta: number | null };
}

const TREND_CONFIG = {
  improving: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Improving" },
  stable: { icon: Minus, color: "text-gray-600", bg: "bg-gray-50", label: "Stable" },
  declining: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", label: "Declining" },
  unknown: { icon: BarChart3, color: "text-gray-400", bg: "bg-gray-50", label: "No data" },
};

export default function HarnessPage() {
  const [status, setStatus] = useState<HarnessStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<HarnessRun | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/harness");
      if (res.ok) setStatus(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const runCycle = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/agents/harness", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setLastResult(result);
        await fetchStatus();
      }
    } finally {
      setRunning(false);
    }
  };

  const trendConfig = TREND_CONFIG[status?.trend || "unknown"];
  const TrendIcon = trendConfig.icon;

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="h-7 w-7" />
              Agentic Harness
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Self-evaluation, regression detection, and continuous improvement
            </p>
          </div>
          <button
            onClick={runCycle}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running..." : "Run Harness Cycle"}
          </button>
        </div>

        {/* Status Cards */}
        {loading ? (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-500 mb-1">Last Score</div>
              <div className="text-2xl font-bold text-gray-900">
                {status.lastScore !== null ? `${(status.lastScore * 100).toFixed(0)}%` : "—"}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {status.baselineScore !== null
                  ? `Baseline: ${(status.baselineScore * 100).toFixed(0)}%`
                  : "No baseline yet"}
              </div>
            </div>
            <div className={cn("rounded-xl border p-5", trendConfig.bg)}>
              <div className={cn("text-xs font-medium mb-1", trendConfig.color)}>Trend</div>
              <div className="flex items-center gap-2">
                <TrendIcon className={cn("h-5 w-5", trendConfig.color)} />
                <span className={cn("text-lg font-bold", trendConfig.color)}>{trendConfig.label}</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-500 mb-1">Total Runs</div>
              <div className="text-2xl font-bold text-gray-900">{status.totalRuns}</div>
            </div>
            <div className={cn(
              "rounded-xl border p-5",
              status.regressionsDetected > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
            )}>
              <div className={cn("text-xs font-medium mb-1", status.regressionsDetected > 0 ? "text-red-600" : "text-emerald-600")}>
                Regressions
              </div>
              <div className={cn("text-2xl font-bold", status.regressionsDetected > 0 ? "text-red-700" : "text-emerald-700")}>
                {status.regressionsDetected}
              </div>
            </div>
          </div>
        )}

        {/* Last Run Results */}
        {lastResult && (
          <div className="space-y-6">
            {/* Regression Alert */}
            {lastResult.regressionDetected && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-semibold text-red-800">Regression Detected</span>
                </div>
                <ul className="space-y-1">
                  {lastResult.regressionDetails.map((detail, i) => (
                    <li key={i} className="text-sm text-red-700">• {detail}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Score Comparison */}
            {lastResult.baselineComparison.delta !== null && (
              <div className={cn(
                "rounded-xl border p-5",
                lastResult.baselineComparison.delta >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
              )}>
                <div className="flex items-center gap-3">
                  {lastResult.baselineComparison.delta >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-amber-600" />
                  )}
                  <span className="text-sm font-medium">
                    Score: {(lastResult.baselineComparison.previousScore! * 100).toFixed(0)}% →{" "}
                    {(lastResult.baselineComparison.currentScore * 100).toFixed(0)}%
                    <span className={cn(
                      "ml-2 font-bold",
                      lastResult.baselineComparison.delta >= 0 ? "text-emerald-700" : "text-amber-700"
                    )}>
                      {lastResult.baselineComparison.delta >= 0 ? "+" : ""}
                      {(lastResult.baselineComparison.delta * 100).toFixed(1)}%
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Per-Agent Breakdown */}
            {Object.keys(lastResult.evalResults.byAgent).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Agent Scores</h3>
                <div className="space-y-3">
                  {Object.entries(lastResult.evalResults.byAgent).map(([agent, stats]) => (
                    <div key={agent} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700 w-40">{agent}</span>
                      <div className="flex-1">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              stats.avgScore >= 0.7 ? "bg-emerald-500" :
                              stats.avgScore >= 0.5 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${stats.avgScore * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 w-16 text-right">
                        {(stats.avgScore * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs text-gray-400 w-20 text-right">
                        {stats.passed}/{stats.total} passed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Insights */}
            {lastResult.learningInsights.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Learning Insights</h3>
                <div className="space-y-3">
                  {lastResult.learningInsights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{insight.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{insight.recommendation}</p>
                      </div>
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                        {(insight.confidence * 100).toFixed(0)}% conf
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tuning Results */}
            {lastResult.tuningResult.riskAdjustments.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Risk Adjustments</h3>
                <div className="space-y-2">
                  {lastResult.tuningResult.riskAdjustments.map((adj, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="font-medium text-gray-700 w-40">{adj.actionType.replace(/_/g, " ")}</span>
                      <span className={cn(
                        "font-bold",
                        adj.newScore < adj.oldScore ? "text-emerald-600" :
                        adj.newScore > adj.oldScore ? "text-red-600" : "text-gray-500"
                      )}>
                        {adj.oldScore} → {adj.newScore}
                      </span>
                      <span className="text-xs text-gray-400 flex-1">{adj.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">How the Harness Works</h3>
          <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-500 leading-relaxed">
            <div>
              <p className="font-medium text-gray-700 mb-1">1. Evaluate</p>
              <p>Runs the full eval suite (60+ test cases) against all agents, measuring accuracy, latency, and safety.</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">2. Learn</p>
              <p>Analyzes user feedback, approval patterns, and outcomes to extract actionable insights.</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">3. Tune</p>
              <p>Adjusts risk profiles based on historical accuracy. High-confidence patterns are stored for auto-application.</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">4. Alert</p>
              <p>If performance regresses, creates alerts and logs the regression details for human review.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
