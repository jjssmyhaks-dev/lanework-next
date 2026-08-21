"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Info, XCircle, Check, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  agent_type: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  acknowledged: boolean;
  created_at: string;
}

const SEVERITY_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string; border: string }> = {
  critical: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
};

const AGENT_LABELS: Record<string, string> = {
  shipment_tracking: "📦 Shipments",
  inventory_management: "📊 Inventory",
  fleet_management: "🚛 Fleet",
  compliance: "🪪 Compliance",
  route_optimization: "🗺️ Routes",
  warehouse_operations: "🏭 Warehouse",
  customer_communication: "💬 Customer",
  system: "⚙️ System",
  shipment: "📦 Shipments",
  inventory: "📊 Inventory",
  fleet: "🚛 Fleet",
};

export function AlertFeed({ limit = 5 }: { limit?: number }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<{ total: number; unacknowledged: number; critical: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/alerts?acknowledged=false&limit=${limit}`);
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
  }, [limit]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const acknowledge = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcknowledging(alertId);
    try {
      await fetch("/api/agents/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      // silent
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">Recent Alerts</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-900">Recent Alerts</span>
          {stats && stats.unacknowledged > 0 && (
            <span className="text-[10px] font-medium text-white bg-amber-500 px-2 py-0.5 rounded-full">
              {stats.unacknowledged}
            </span>
          )}
        </div>
        <button
          onClick={() => router.push("/alerts")}
          className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1"
        >
          View all <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 rounded-lg bg-gray-50">
          <Check className="h-8 w-8 text-emerald-400 mb-2" />
          <p className="text-sm font-medium text-gray-500">No alerts</p>
          <p className="text-xs text-gray-400 mt-0.5">All systems running smoothly</p>
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
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 cursor-pointer",
                  config.border
                )}
                onClick={() => router.push("/alerts")}
              >
                <div className={cn("mt-0.5 p-1.5 rounded-lg shrink-0", config.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-400">
                      {AGENT_LABELS[alert.agent_type] || alert.agent_type?.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(alert.created_at).toLocaleString("en-IN", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => acknowledge(alert.id, e)}
                  disabled={acknowledging === alert.id}
                  className="mt-1 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-50 shrink-0"
                  title="Acknowledge"
                >
                  {acknowledging === alert.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
