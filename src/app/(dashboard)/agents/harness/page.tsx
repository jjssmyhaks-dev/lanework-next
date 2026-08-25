"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Play, Loader2, BarChart3, Zap, Shield, Activity
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

interface CircuitBreaker {
  integration: string;
  state: string;
  failureCount: number;
  successCount: number;
  timeUntilRetryMs: number | null;
}

interface DLQStats {
  total: number;
  pending: number;
  retrying: number;
  discarded: number;
  recovered: number;
  avgAttempts: number;
}

interface Capability {
  name: string;
  description: string;
  integrations: { name: string; available: boolean }[];
  trustDefault: string;
  riskLevel: string;
  planRequired: string;
}

interface ConfidenceStats {
  totalPredictions: number;
  avgConfidence: number;
  calibrationError: number;
  lowConfidenceCount: number;
  highConfidenceCount: number;
}

interface ActionCalibration {
  actionType: string;
  sampleSize: number;
  avgConfidence: number;
  actualAccuracy: number | null;
  calibrationError: number | null;
}

interface AgentMemory {
  id: string;
  entityType: string;
  entityId: string;
  memoryType: string;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  accessCount: number;
  createdAt: string;
}

interface AgentLimitStatus {
  agentType: string;
  tokens: number;
  maxTokens: number;
  concurrent: number;
  maxConcurrent: number;
}

interface EvalCase {
  id: string;
  source: string;
  agent: string;
  scenario: string;
  confidence: number;
  createdAt: string;
}

const TABS = [
  { id: "harness", label: "Eval & Tuning", icon: Brain },
  { id: "circuits", label: "Circuit Breakers", icon: Shield },
  { id: "dlq", label: "Dead Letters", icon: AlertTriangle },
  { id: "confidence", label: "Confidence", icon: BarChart3 },
  { id: "memory", label: "Memory", icon: Zap },
  { id: "limits", label: "Rate Limits", icon: Activity },
  { id: "autogen", label: "Eval Cases", icon: RefreshCw },
  { id: "capabilities", label: "Capabilities", icon: Zap },
] as const;

type TabId = typeof TABS[number]["id"];

export default function HarnessPage() {
  const [status, setStatus] = useState<HarnessStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<HarnessRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("harness");
  const [circuits, setCircuits] = useState<CircuitBreaker[]>([]);
  const [dlqStats, setDlqStats] = useState<DLQStats | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [confidenceStats, setConfidenceStats] = useState<ConfidenceStats | null>(null);
  const [actionCalibration, setActionCalibration] = useState<ActionCalibration[]>([]);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [agentLimits, setAgentLimits] = useState<AgentLimitStatus[]>([]);
  const [evalCases, setEvalCases] = useState<EvalCase[]>([]);

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
    // Fetch circuit breaker status
    fetch("/api/agents/circuit-breaker").then(r => r.ok ? r.json() : null).then(d => { if (d?.circuits) setCircuits(d.circuits); }).catch(() => {});
    // Fetch DLQ stats
    fetch("/api/agents/dlq").then(r => r.ok ? r.json() : null).then(d => { if (d?.stats) setDlqStats(d.stats); }).catch(() => {});
    // Fetch capabilities
    fetch("/api/agents/capabilities").then(r => r.ok ? r.json() : null).then(d => { if (d?.capabilities) setCapabilities(d.capabilities); }).catch(() => {});
    // Fetch confidence calibration
    fetch("/api/agents/confidence").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.stats) setConfidenceStats(d.stats);
      if (d?.actionCalibration) setActionCalibration(d.actionCalibration);
    }).catch(() => {});
    // Fetch memories (need a default tenant)
    fetch("/api/agents/memory?limit=20").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.memories) setMemories(d.memories);
    }).catch(() => {});
    // Fetch rate limiter status
    fetch("/api/agents/poller-status").then(r => r.ok ? r.json() : null).then(d => {
      if (Array.isArray(d)) setAgentLimits(d.map((p: any) => ({ agentType: p.name, tokens: p.itemsChecked || 0, maxTokens: 20, concurrent: 0, maxConcurrent: 2 })));
    }).catch(() => {});
    // Fetch generated eval cases
    fetch("/api/agents/eval-autogen?limit=20").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.cases) setEvalCases(d.cases);
    }).catch(() => {});
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

        {/* Tab Bar */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
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

        {/* Tab Content */}
        {activeTab === "harness" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">How the Harness Works</h3>
            <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-500 leading-relaxed">
              <div>
                <p className="font-medium text-gray-700 mb-1">1. Evaluate</p>
                <p>Runs the full eval suite (60+ test cases) against all agents, measuring accuracy, latency, and safety.</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">2. Learn</p>
                <p>Analyzes user feedback, approval patterns, outcomes, AND rejection reasons to extract actionable insights.</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">3. Tune</p>
                <p>Adjusts risk profiles based on historical accuracy. Auto-generates new eval cases from production failures.</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">4. Alert</p>
                <p>If performance regresses, creates alerts and logs the regression details for human review.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "circuits" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Circuit Breakers</h3>
            {circuits.length === 0 ? (
              <p className="text-sm text-gray-400">No circuit breaker data yet. Run a harness cycle first.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {circuits.map((c) => (
                  <div key={c.integration} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800 capitalize">{c.integration}</span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        c.state === "closed" ? "bg-emerald-50 text-emerald-700" :
                        c.state === "open" ? "bg-red-50 text-red-700" :
                        "bg-amber-50 text-amber-700"
                      )}>
                        {c.state}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Failures: {c.failureCount} · Successes: {c.successCount}</p>
                      {c.timeUntilRetryMs !== null && c.timeUntilRetryMs > 0 && (
                        <p className="text-amber-600">Retry in {Math.ceil(c.timeUntilRetryMs / 1000)}s</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "dlq" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Dead Letter Queue</h3>
            {dlqStats ? (
              <div className="grid md:grid-cols-5 gap-4">
                {[
                  { label: "Total", value: dlqStats.total, color: "text-gray-900" },
                  { label: "Pending", value: dlqStats.pending, color: "text-amber-600" },
                  { label: "Retrying", value: dlqStats.retrying, color: "text-blue-600" },
                  { label: "Recovered", value: dlqStats.recovered, color: "text-emerald-600" },
                  { label: "Discarded", value: dlqStats.discarded, color: "text-gray-400" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No DLQ data yet.</p>
            )}
          </div>
        )}

        {activeTab === "capabilities" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Agent Capabilities</h3>
            {capabilities.length === 0 ? (
              <p className="text-sm text-gray-400">No capability data yet.</p>
            ) : (
              <div className="space-y-3">
                {capabilities.map((cap) => (
                  <div key={cap.name} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800">{cap.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          cap.riskLevel === "low" ? "bg-emerald-50 text-emerald-700" :
                          cap.riskLevel === "medium" ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-700"
                        )}>{cap.riskLevel}</span>
                        <span className="text-xs text-gray-400">{cap.planRequired}+ plan</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{cap.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cap.integrations.map((i) => (
                        <span key={i.name} className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full",
                          i.available ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                        )}>
                          {i.available ? "✓" : "○"} {i.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "confidence" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Confidence Calibration</h3>
            {confidenceStats ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-5 gap-4">
                  {[
                    { label: "Total Predictions", value: confidenceStats.totalPredictions, color: "text-gray-900" },
                    { label: "Avg Confidence", value: `${Math.round(confidenceStats.avgConfidence * 100)}%`, color: "text-blue-600" },
                    { label: "Calibration Error", value: `${Math.round(confidenceStats.calibrationError * 100)}%`, color: confidenceStats.calibrationError > 0.2 ? "text-red-600" : "text-emerald-600" },
                    { label: "Low Confidence", value: confidenceStats.lowConfidenceCount, color: "text-amber-600" },
                    { label: "High Confidence", value: confidenceStats.highConfidenceCount, color: "text-emerald-600" },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                {actionCalibration.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-3">Per-Action Calibration</h4>
                    <div className="space-y-2">
                      {actionCalibration.map((a) => (
                        <div key={a.actionType} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <span className="text-xs font-medium text-gray-800 w-40 truncate">{a.actionType}</span>
                          <div className="flex-1">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((a.actualAccuracy ?? 0) * 100)}%` }} />
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 w-20 text-right">{(a.actualAccuracy ?? 0) > 0 ? `${Math.round((a.actualAccuracy ?? 0) * 100)}% accuracy` : "No data"}</span>
                          <span className="text-[10px] text-gray-400 w-16 text-right">n={a.sampleSize}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No confidence data yet. Agents need to make predictions first.</p>
            )}
          </div>
        )}

        {activeTab === "memory" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Agent Memory</h3>
            {memories.length === 0 ? (
              <p className="text-sm text-gray-400">No memories stored yet. Agents will learn as they execute actions.</p>
            ) : (
              <div className="space-y-2">
                {memories.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      m.memoryType === "decision" ? "bg-blue-50 text-blue-700" :
                      m.memoryType === "rejection" ? "bg-red-50 text-red-700" :
                      m.memoryType === "preference" ? "bg-purple-50 text-purple-700" :
                      m.memoryType === "context" ? "bg-amber-50 text-amber-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {m.memoryType}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{m.entityType}:{m.entityId}</p>
                      <p className="text-[10px] text-gray-500 truncate">{m.key}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Conf: {Math.round(m.confidence * 100)}%</p>
                      <p className="text-[10px] text-gray-400">Used {m.accessCount}×</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "limits" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Agent Rate Limits</h3>
            {agentLimits.length === 0 ? (
              <p className="text-sm text-gray-400">No rate limit data yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agentLimits.map((l) => (
                  <div key={l.agentType} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800 capitalize">{l.agentType}</span>
                      <span className="text-xs text-gray-400">{l.concurrent}/{l.maxConcurrent} running</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.round((l.tokens / l.maxTokens) * 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400">{l.tokens}/{l.maxTokens} tokens available</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "autogen" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Auto-Generated Eval Cases</h3>
              <button
                onClick={async () => {
                  const res = await fetch("/api/agents/eval-autogen", { method: "POST" });
                  if (res.ok) {
                    const d = await res.json();
                    alert(`Generated ${d.generated} cases, stored ${d.stored}`);
                    const updated = await fetch("/api/agents/eval-autogen?limit=20");
                    if (updated.ok) { const data = await updated.json(); if (data?.cases) setEvalCases(data.cases); }
                  }
                }}
                className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Generate Cases
              </button>
            </div>
            {evalCases.length === 0 ? (
              <p className="text-sm text-gray-400">No auto-generated eval cases yet. Click "Generate Cases" to create from production data.</p>
            ) : (
              <div className="space-y-2">
                {evalCases.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      c.source === "production_failure" ? "bg-red-50 text-red-700" :
                      c.source === "user_correction" ? "bg-amber-50 text-amber-700" :
                      c.source === "rejected_approval" ? "bg-purple-50 text-purple-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {c.source}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{c.scenario}</p>
                      <p className="text-[10px] text-gray-500">Agent: {c.agent}</p>
                    </div>
                    <span className="text-xs text-gray-400">Conf: {Math.round(c.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
