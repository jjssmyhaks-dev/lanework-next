"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Activity, Settings, History, BarChart3, RefreshCw, Loader2,
  Shield, Bell, CheckCircle2, XCircle, Clock, Zap, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

type TrustLevel = "propose" | "auto_low_risk" | "full";

interface AgentTask {
  id: string;
  agent_type: string;
  action_type: string;
  status: string;
  reasoning_trace: string | null;
  created_at: string;
}

interface AgentAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  acknowledged: boolean;
  created_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  risk_score: number;
  trust_level: string;
  mode: string;
  duration_ms: number;
  success: boolean;
  timestamp: string;
}

const AGENT_CONFIG: Record<string, {
  label: string;
  icon: string;
  description: string;
  capabilities: string[];
}> = {
  "shipment-tracking": {
    label: "Shipment Tracking",
    icon: "📦",
    description: "Monitors all active shipments across carriers, predicts delays, and alerts teams automatically.",
    capabilities: ["Real-time tracking", "Delay prediction", "Multi-carrier view", "Auto-ETA updates", "Proof of delivery"],
  },
  "inventory-management": {
    label: "Inventory Management",
    icon: "📊",
    description: "Tracks stock levels, detects low stock, predicts demand spikes, and suggests reorder quantities.",
    capabilities: ["Stock monitoring", "Reorder suggestions", "Demand forecasting", "Out-of-stock alerts", "SKU tracking"],
  },
  "fleet-management": {
    label: "Fleet Management",
    icon: "🚛",
    description: "Monitors vehicle maintenance, driver hours, GPS connectivity, and compliance status.",
    capabilities: ["Maintenance scheduling", "Driver compliance", "GPS tracking", "Fuel monitoring", "Route optimization"],
  },
  "route-optimization": {
    label: "Route Optimization",
    icon: "🗺️",
    description: "Plans and optimizes delivery routes based on traffic, weather, and delivery windows.",
    capabilities: ["Multi-stop routing", "Traffic-aware", "Weather integration", "Cost optimization", "Time windows"],
  },
  "warehouse-operations": {
    label: "Warehouse Operations",
    icon: "🏭",
    description: "Manages dock scheduling, task assignment, and warehouse efficiency tracking.",
    capabilities: ["Dock scheduling", "Task prioritization", "Efficiency tracking", "Space optimization", "Pick/pack/ship"],
  },
  "customer-communication": {
    label: "Customer Communication",
    icon: "💬",
    description: "Handles automated customer notifications, tracking updates, and support escalation.",
    capabilities: ["WhatsApp updates", "Email notifications", "Tracking links", "Feedback collection", "Escalation routing"],
  },
};

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "activity", label: "Live Activity", icon: Activity },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentName = (params?.name as string) || "shipment-tracking";
  const config = AGENT_CONFIG[agentName] || AGENT_CONFIG["shipment-tracking"];

  const [activeTab, setActiveTab] = useState("overview");
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [trustLevel, setTrustLevel] = useState<TrustLevel>("propose");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, alertsRes, auditRes] = await Promise.all([
        fetch(`/api/ai?limit=20`),
        fetch(`/api/agents/alerts?limit=20`),
        fetch(`/api/agents/metrics?period=7`),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const allTasks = Array.isArray(data) ? data : [];
        setTasks(allTasks.filter((t: AgentTask) =>
          t.agent_type?.includes(agentName.replace("-", "_")) ||
          t.agent_type?.includes(agentName.replace("-", ""))
        ));
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        const allAlerts = data.alerts || [];
        setAlerts(allAlerts.filter((a: AgentAlert) =>
          a.alert_type?.includes(agentName.replace("-", "_")) ||
          a.alert_type?.includes(agentName.replace("-", ""))
        ));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [agentName]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Back link */}
        <Link
          href="/agents"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> All agents
        </Link>

        {/* Agent Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{config.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{config.label}</h1>
              <p className="mt-1 text-sm text-gray-500 max-w-lg">{config.description}</p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "alerts" && alerts.length > 0 && (
                <span className="text-[10px] font-medium text-white bg-amber-500 px-1.5 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Capabilities */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Capabilities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {config.capabilities.map((cap) => (
                      <div key={cap} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-sm text-gray-700">{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                    <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Recent Tasks</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                    <div className="text-2xl font-bold text-amber-600">{alerts.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Active Alerts</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {tasks.filter((t) => t.status === "completed").length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Completed</div>
                  </div>
                </div>

                {/* Trust Level */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-600" />
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Current Trust Level</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Controls how much autonomy this agent has
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium",
                      trustLevel === "full" ? "bg-emerald-50 text-emerald-700" :
                      trustLevel === "auto_low_risk" ? "bg-blue-50 text-blue-700" :
                      "bg-amber-50 text-amber-700"
                    )}>
                      {trustLevel === "full" ? "Fully Autonomous" :
                       trustLevel === "auto_low_risk" ? "Auto Low-Risk" : "Propose Only"}
                    </span>
                  </div>
                  <Link
                    href="/agents/trust"
                    className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Change trust settings →
                  </Link>
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === "activity" && (
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-200 bg-white">
                    <Activity className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-600">No activity yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Tasks will appear here as the {config.label.toLowerCase()} agent processes work.
                    </p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          task.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          task.status === "failed" ? "bg-red-50 text-red-700 border-red-200" :
                          task.status === "running" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {task.status}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{task.action_type}</span>
                        <span className="flex-1 text-xs text-gray-400 truncate">
                          {task.reasoning_trace?.slice(0, 120) || "—"}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(task.created_at).toLocaleString("en-IN", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === "alerts" && (
              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-200 bg-white">
                    <Bell className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-600">No alerts</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Alerts from this agent will appear here.
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "bg-white rounded-xl border p-4",
                        alert.severity === "critical" ? "border-red-200" :
                        alert.severity === "warning" ? "border-amber-200" :
                        "border-gray-200"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          alert.severity === "critical" ? "bg-red-50" :
                          alert.severity === "warning" ? "bg-amber-50" : "bg-blue-50"
                        )}>
                          {alert.severity === "critical" ? <XCircle className="h-4 w-4 text-red-600" /> :
                           alert.severity === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-600" /> :
                           <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {new Date(alert.created_at).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {alert.acknowledged && (
                          <CheckCircle2 className="h-4 w-4 text-gray-300 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Agent Configuration</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Enable Agent</p>
                      <p className="text-xs text-gray-500">Toggle this agent on or off</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-emerald-600 transition-colors">
                      <span className="inline-block h-4 w-4 translate-x-6 rounded-full bg-white transition-transform" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Alert Notifications</p>
                      <p className="text-xs text-gray-500">Receive notifications for this agent&apos;s alerts</p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-emerald-600 transition-colors">
                      <span className="inline-block h-4 w-4 translate-x-6 rounded-full bg-white transition-transform" />
                    </button>
                  </div>

                  <Link
                    href="/agents/trust"
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700">Trust Level</p>
                      <p className="text-xs text-gray-500">Configure autonomy level for this agent</p>
                    </div>
                    <span className="text-xs text-gray-400">Configure →</span>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
