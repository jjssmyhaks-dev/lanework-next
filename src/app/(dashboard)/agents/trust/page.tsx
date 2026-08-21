"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Save, RefreshCw, Info, AlertTriangle, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type TrustLevel = "propose" | "auto_low_risk" | "full";

interface TrustConfig {
  agentType: string;
  actionType: string;
  trustLevel: TrustLevel;
}

const AGENT_TYPES = [
  { id: "shipment_tracking", label: "📦 Shipment Tracking", actions: ["track_shipment", "create_shipment", "cancel_shipment", "reroute_shipment"] },
  { id: "inventory_management", label: "📊 Inventory", actions: ["reorder_stock", "sync_inventory", "check_stock"] },
  { id: "fleet_management", label: "🚛 Fleet", actions: ["schedule_maintenance", "track_fleet"] },
  { id: "compliance", label: "🪪 Compliance", actions: ["check_license", "check_registration", "generate_ewb"] },
  { id: "route_optimization", label: "🗺️ Routes", actions: ["optimize_route", "reroute_shipment"] },
  { id: "warehouse_operations", label: "🏭 Warehouse", actions: ["sync_inventory"] },
  { id: "customer_communication", label: "💬 Customer", actions: ["send_notification", "send_whatsapp"] },
];

const TRUST_LEVELS: Record<TrustLevel, { label: string; description: string; color: string; bg: string }> = {
  propose: { label: "Propose Only", description: "Agent suggests actions, you approve every one", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  auto_low_risk: { label: "Auto Low-Risk", description: "Auto-execute safe actions (risk ≤3/10), approve risky ones", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  full: { label: "Fully Autonomous", description: "Agent executes everything within limits (enterprise only)", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
};

const RISK_PROFILES: Record<string, { action: string; financial: number; reversibility: number; customer: number; risk: number }> = {
  track_shipment: { action: "Track Shipment", financial: 0, reversibility: 10, customer: 0, risk: 0 },
  create_shipment: { action: "Create Shipment", financial: 3, reversibility: 7, customer: 2, risk: 3 },
  cancel_shipment: { action: "Cancel Shipment", financial: 6, reversibility: 3, customer: 8, risk: 8 },
  reroute_shipment: { action: "Reroute Shipment", financial: 4, reversibility: 6, customer: 5, risk: 5 },
  reorder_stock: { action: "Reorder Stock", financial: 7, reversibility: 5, customer: 3, risk: 7 },
  sync_inventory: { action: "Sync Inventory", financial: 0, reversibility: 10, customer: 0, risk: 0 },
  schedule_maintenance: { action: "Schedule Maintenance", financial: 4, reversibility: 8, customer: 2, risk: 4 },
  check_license: { action: "Check License", financial: 0, reversibility: 10, customer: 0, risk: 0 },
  optimize_route: { action: "Optimize Route", financial: 2, reversibility: 9, customer: 2, risk: 2 },
  send_notification: { action: "Send Notification", financial: 0, reversibility: 10, customer: 3, risk: 3 },
  send_whatsapp: { action: "Send WhatsApp", financial: 0, reversibility: 10, customer: 4, risk: 4 },
  generate_ewb: { action: "Generate E-Way Bill", financial: 2, reversibility: 4, customer: 1, risk: 4 },
};

export default function TrustSettingsPage() {
  const [configs, setConfigs] = useState<TrustConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/trust");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.trustLevels || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const getTrustLevel = (agentType: string, actionType: string): TrustLevel => {
    const config = configs.find((c) => c.agentType === agentType && c.actionType === actionType);
    return config?.trustLevel || "propose";
  };

  const setTrustLevelLocal = (agentType: string, actionType: string, trustLevel: TrustLevel) => {
    setConfigs((prev) => {
      const existing = prev.find((c) => c.agentType === agentType && c.actionType === actionType);
      if (existing) {
        return prev.map((c) =>
          c.agentType === agentType && c.actionType === actionType ? { ...c, trustLevel } : c
        );
      }
      return [...prev, { agentType, actionType, trustLevel }];
    });
    setSaved(false);
  };

  const setAllForAgent = (agentType: string, trustLevel: TrustLevel) => {
    const agent = AGENT_TYPES.find((a) => a.id === agentType);
    if (!agent) return;
    for (const action of agent.actions) {
      setTrustLevelLocal(agentType, action, trustLevel);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (e: unknown) {
      setError("Failed to save trust settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-7 w-7" />
              Agent Trust Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Control how much autonomy each AI agent has over decisions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchConfigs}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={save}
              disabled={saving}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors",
                saved
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-900 text-white hover:bg-gray-800",
                saving && "opacity-50"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Trust Level Legend */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {Object.entries(TRUST_LEVELS).map(([level, config]) => (
            <div key={level} className={cn("rounded-xl border p-4", config.bg)}>
              <div className={cn("text-sm font-semibold", config.color)}>{config.label}</div>
              <div className="text-xs text-gray-600 mt-1">{config.description}</div>
            </div>
          ))}
        </div>

        {/* Risk Reference */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900">Risk Score Reference</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Risk scores (0-10) determine whether an action needs approval. Actions with risk &gt; 3 require human approval on &quot;Auto Low-Risk&quot; mode.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Action</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Financial</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Reversibility</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Customer</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(RISK_PROFILES).map((profile) => (
                  <tr key={profile.action} className="border-b border-gray-50">
                    <td className="py-1.5 font-medium text-gray-700">{profile.action}</td>
                    <td className="py-1.5 text-center text-gray-500">{profile.financial}/10</td>
                    <td className="py-1.5 text-center text-gray-500">{profile.reversibility}/10</td>
                    <td className="py-1.5 text-center text-gray-500">{profile.customer}/10</td>
                    <td className="py-1.5 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        profile.risk <= 3 ? "bg-emerald-50 text-emerald-700" :
                        profile.risk <= 6 ? "bg-amber-50 text-amber-700" :
                        "bg-red-50 text-red-700"
                      )}>
                        {profile.risk}/10
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trust Configuration Grid */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {AGENT_TYPES.map((agent) => (
              <div key={agent.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">{agent.label}</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 mr-2">Set all:</span>
                    {(["propose", "auto_low_risk", "full"] as TrustLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setAllForAgent(agent.id, level)}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                          "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {TRUST_LEVELS[level].label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {agent.actions.map((action) => {
                    const currentLevel = getTrustLevel(agent.id, action);
                    const risk = RISK_PROFILES[action];
                    return (
                      <div key={action} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-40 shrink-0">
                          {risk?.action || action.replace(/_/g, " ")}
                        </span>
                        {risk && (
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0",
                            risk.risk <= 3 ? "bg-emerald-50 text-emerald-600" :
                            risk.risk <= 6 ? "bg-amber-50 text-amber-600" :
                            "bg-red-50 text-red-600"
                          )}>
                            Risk {risk.risk}
                          </span>
                        )}
                        <div className="flex items-center gap-1 flex-1">
                          {(["propose", "auto_low_risk", "full"] as TrustLevel[]).map((level) => (
                            <button
                              key={level}
                              onClick={() => setTrustLevelLocal(agent.id, action, level)}
                              className={cn(
                                "flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                                currentLevel === level
                                  ? cn("border", TRUST_LEVELS[level].bg, TRUST_LEVELS[level].color)
                                  : "bg-gray-50 text-gray-400 hover:bg-gray-100 border border-transparent"
                              )}
                            >
                              {TRUST_LEVELS[level].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
