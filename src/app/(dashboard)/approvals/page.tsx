"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, CheckCircle, XCircle, Clock, AlertTriangle,
  RefreshCw, ThumbsUp, ThumbsDown, Filter
} from "lucide-react";

interface Approval {
  id: string;
  agent_type: string;
  action_type: string;
  action_description: string;
  risk_score: number;
  reasoning: string;
  input_data: Record<string, unknown>;
  status: string;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const AGENT_LABELS: Record<string, string> = {
  shipment_tracking: "📦 Shipment Tracking",
  inventory_management: "📊 Inventory",
  fleet_management: "🚛 Fleet",
  compliance: "🪪 Compliance",
  route_optimization: "🗺️ Route Optimization",
  warehouse_operations: "🏭 Warehouse",
  customer_communication: "💬 Customer",
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/approvals?status=${filter}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 30_000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  async function handleDecision(approvalId: string, decision: "approved" | "rejected") {
    setProcessingId(approvalId);
    try {
      await fetch("/api/agents/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, decision, reason: decision === "approved" ? "Auto-approved" : "Rejected by user" }),
      });
      setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    } catch {
      // ignore
    } finally {
      setProcessingId(null);
    }
  }

  function getRiskLevel(score: number): string {
    if (score >= 7) return "high";
    if (score >= 4) return "medium";
    return "low";
  }

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e] flex items-center gap-3">
              <Shield className="h-7 w-7" />
              Agent Approval Queue
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Review and approve agent actions that require human decision
            </p>
          </div>
          <button
            onClick={fetchApprovals}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {["pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-[#1a1a2e] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Approvals List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-200 bg-white">
            <CheckCircle className="h-12 w-12 text-emerald-400 mb-4" />
            <p className="text-lg font-medium text-gray-600">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === "pending"
                ? "No agent actions need your approval right now."
                : `No ${filter} approvals found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => {
              const riskLevel = getRiskLevel(approval.risk_score);
              return (
                <div
                  key={approval.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {AGENT_LABELS[approval.agent_type] || approval.agent_type}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${SEVERITY_COLORS[riskLevel]}`}>
                          Risk: {approval.risk_score}/10
                        </span>
                        {filter === "pending" && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{approval.action_description}</p>
                      {approval.reasoning && (
                        <p className="text-xs text-gray-400 italic">"{approval.reasoning}"</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                        <span>Action: {approval.action_type}</span>
                        <span>{new Date(approval.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {filter === "pending" && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleDecision(approval.id, "approved")}
                          disabled={processingId === approval.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecision(approval.id, "rejected")}
                          disabled={processingId === approval.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
