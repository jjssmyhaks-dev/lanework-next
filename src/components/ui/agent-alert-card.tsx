"use client";

import { useState } from "react";
import {
  AlertTriangle, Info, XCircle, CheckCircle, Clock, Bell
} from "lucide-react";

interface AgentAlert {
  id: string;
  agent_type: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  data: Record<string, unknown>;
  acknowledged: boolean;
  created_at: string;
}

const SEVERITY_CONFIG = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <XCircle className="h-4 w-4 text-red-600" />,
    badge: "bg-red-100 text-red-700 border-red-200",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <Info className="h-4 w-4 text-blue-600" />,
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
};

export function AgentAlertCard({
  alert,
  onAcknowledge,
}: {
  alert: AgentAlert;
  onAcknowledge?: (id: string) => void;
}) {
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${config.bg} ${config.border} ${alert.acknowledged ? "opacity-50" : ""}`}>
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.badge}`}>
            {alert.severity}
          </span>
          <span className="text-xs text-gray-400">
            {alert.agent_type.replace(/_/g, " ")}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900">{alert.title}</p>
        <p className="text-xs text-gray-500 mt-1">{alert.message}</p>
        <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
          <Clock className="h-3 w-3" />
          {new Date(alert.created_at).toLocaleString()}
        </div>
      </div>
      {!alert.acknowledged && onAcknowledge && (
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Ack
        </button>
      )}
    </div>
  );
}

/**
 * Agent Alerts Widget — shows recent alerts with ack functionality.
 * Use in dashboard or agent detail pages.
 */
export function AgentAlertsWidget({ agentType }: { agentType?: string }) {
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const url = agentType
        ? `/api/agents/alerts?agentType=${agentType}&limit=10`
        : "/api/agents/alerts?acknowledged=false&limit=10";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  // Initial fetch
  useState(() => {
    fetchAlerts();
  });

  async function handleAcknowledge(alertId: string) {
    try {
      await fetch("/api/agents/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) => prev.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      ));
    } catch {}
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((n) => (
          <div key={n} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Bell className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">No alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <AgentAlertCard
          key={alert.id}
          alert={alert}
          onAcknowledge={handleAcknowledge}
        />
      ))}
    </div>
  );
}
