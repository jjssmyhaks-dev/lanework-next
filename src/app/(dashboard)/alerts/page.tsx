"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, AlertTriangle, Info, XCircle, Check, CheckCheck, RefreshCw,
  Filter, Loader2, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  agent_type: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  data: Record<string, unknown>;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}

interface AlertStats {
  total: number;
  unacknowledged: number;
  critical: number;
  warnings: number;
}

const SEVERITY_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string; border: string; label: string }> = {
  critical: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Critical" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Warning" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Info" },
};

const AGENT_LABELS: Record<string, string> = {
  shipment_tracking: "📦 Shipment Tracking",
  inventory_management: "📊 Inventory",
  fleet_management: "🚛 Fleet",
  compliance: "🪪 Compliance",
  route_optimization: "🗺️ Route Optimization",
  warehouse_operations: "🏭 Warehouse",
  customer_communication: "💬 Customer",
  system: "⚙️ System",
  shipment: "📦 Shipments",
  inventory: "📊 Inventory",
  fleet: "🚛 Fleet",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("unacknowledged");
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [bulkAcknowledging, setBulkAcknowledging] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter === "unacknowledged") params.set("acknowledged", "false");
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (agentFilter !== "all") params.set("agentType", agentFilter);
      params.set("limit", "100");

      const res = await fetch(`/api/agents/alerts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setStats(data.stats || null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [severityFilter, agentFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const acknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      await fetch("/api/agents/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) => prev.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() } : a
      ));
      setStats((prev) => prev ? { ...prev, unacknowledged: prev.unacknowledged - 1 } : prev);
    } catch {
      // silent
    } finally {
      setAcknowledging(null);
    }
  };

  const acknowledgeAll = async () => {
    setBulkAcknowledging(true);
    const unacked = alerts.filter((a) => !a.acknowledged);
    for (const alert of unacked) {
      await fetch("/api/agents/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id }),
      });
    }
    setAlerts((prev) => prev.map((a) =>
      !a.acknowledged ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() } : a
    ));
    setStats((prev) => prev ? { ...prev, unacknowledged: 0 } : prev);
    setBulkAcknowledging(false);
  };

  const agentTypes = [...new Set(alerts.map((a) => a.agent_type))];

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Bell className="h-7 w-7" />
              Agent Alerts
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Real-time alerts from your autonomous AI agents
            </p>
          </div>
          <div className="flex items-center gap-3">
            {stats && stats.unacknowledged > 0 && (
              <button
                onClick={acknowledgeAll}
                disabled={bulkAcknowledging}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {bulkAcknowledging ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                Mark all read
              </button>
            )}
            <button
              onClick={fetchAlerts}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-medium text-gray-500 mb-1">Total Alerts (24h)</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="text-xs font-medium text-amber-600 mb-1">Unacknowledged</div>
              <div className="text-2xl font-bold text-amber-700">{stats.unacknowledged}</div>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <div className="text-xs font-medium text-red-600 mb-1">Critical</div>
              <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="text-xs font-medium text-amber-600 mb-1">Warnings</div>
              <div className="text-2xl font-bold text-amber-700">{stats.warnings}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filters:</span>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {["unacknowledged", "all", "acknowledged"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  statusFilter === s ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          {/* Agent filter */}
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="all">All agents</option>
            {agentTypes.map((at) => (
              <option key={at} value={at}>{AGENT_LABELS[at] || at}</option>
            ))}
          </select>
        </div>

        {/* Alerts list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-200 bg-white">
            <CheckCheck className="h-12 w-12 text-emerald-400 mb-4" />
            <p className="text-lg font-medium text-gray-600">All clear!</p>
            <p className="text-sm text-gray-400 mt-1">
              {statusFilter === "unacknowledged"
                ? "No unacknowledged alerts. Great job!"
                : "No alerts found with current filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow",
                    alert.acknowledged ? "border-gray-100 opacity-60" : config.border
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("mt-0.5 p-2 rounded-lg shrink-0", config.bg)}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{alert.title}</span>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          config.bg, config.color
                        )}>
                          {config.label}
                        </span>
                        {alert.acknowledged && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            <Check className="h-3 w-3 mr-1" /> Read
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{AGENT_LABELS[alert.agent_type] || alert.agent_type?.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span>{alert.alert_type?.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span>{new Date(alert.created_at).toLocaleString("en-IN")}</span>
                        {alert.acknowledged_at && (
                          <>
                            <span>·</span>
                            <span>Acknowledged {new Date(alert.acknowledged_at).toLocaleString("en-IN")}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledge(alert.id)}
                        disabled={acknowledging === alert.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shrink-0"
                      >
                        {acknowledging === alert.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Acknowledge
                      </button>
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
