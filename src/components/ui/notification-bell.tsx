"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, AlertTriangle, Info, XCircle, Loader2 } from "lucide-react";
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

interface AlertStats {
  total: number;
  unacknowledged: number;
  critical: number;
  warnings: number;
}

const SEVERITY_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  critical: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
};

export function NotificationBell() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/alerts?acknowledged=false&limit=10");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setStats(data.stats || null);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const acknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      await fetch("/api/agents/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setStats((prev) => prev ? { ...prev, unacknowledged: prev.unacknowledged - 1 } : prev);
    } catch {
      // silent
    } finally {
      setAcknowledging(null);
    }
  };

  const acknowledgeAll = async () => {
    for (const alert of alerts) {
      if (!alert.acknowledged) {
        await fetch("/api/agents/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertId: alert.id }),
        });
      }
    }
    setAlerts([]);
    setStats((prev) => prev ? { ...prev, unacknowledged: 0 } : prev);
  };

  const unreadCount = stats?.unacknowledged || 0;
  const hasCritical = (stats?.critical || 0) > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        )}
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white px-1",
              hasCritical ? "bg-red-600 animate-pulse" : "bg-amber-500"
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={acknowledgeAll}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400"
              >
                <span className="sr-only">Close</span>
                <span className="text-xs">✕</span>
              </button>
            </div>
          </div>

          {/* Alerts list */}
          <div className="overflow-y-auto max-h-[50vh]">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <CheckCheck className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-gray-500">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {alerts.map((alert) => {
                  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                  const Icon = config.icon;
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                        alert.severity === "critical" && "bg-red-50/30"
                      )}
                    >
                      <div className={cn("mt-0.5 p-1.5 rounded-lg", config.bg)}>
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-gray-400">
                            {new Date(alert.created_at).toLocaleString("en-IN", {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          <span className="text-[10px] text-gray-400 capitalize">
                            {alert.agent_type?.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => acknowledge(alert.id)}
                        disabled={acknowledging === alert.id}
                        className="mt-1 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-50 shrink-0"
                        title="Mark as read"
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

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); router.push("/alerts"); }}
              className="w-full text-center text-xs font-medium text-gray-600 hover:text-gray-900 py-1"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
