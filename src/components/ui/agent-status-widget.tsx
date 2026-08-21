"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, RefreshCw, CheckCircle2, XCircle, Clock, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PollerStatus {
  name: string;
  schedule: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string;
  itemsChecked: number;
  alertsGenerated: number;
}

const POLLER_LABELS: Record<string, string> = {
  "shipment-poller": "📦 Shipments",
  "inventory-poller": "📊 Inventory",
  "fleet-poller": "🚛 Fleet",
  "compliance-poller": "🪪 Compliance",
  "daily-report": "📋 Daily Report",
};

const POLLER_SCHEDULES: Record<string, string> = {
  "shipment-poller": "Every 5 min",
  "inventory-poller": "Every 30 min",
  "fleet-poller": "Every 10 min",
  "compliance-poller": "Daily 6 AM",
  "daily-report": "Daily 8 AM",
};

export function AgentStatusWidget() {
  const [pollers, setPollers] = useState<PollerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [runningPoller, setRunningPoller] = useState<string | null>(null);

  const fetchPollers = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/cron");
      if (res.ok) {
        const data = await res.json();
        // The cron endpoint returns results, but we want status
        // Let's try the dedicated status endpoint
        const statusRes = await fetch("/api/agents/poller-status");
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setPollers(statusData.pollers || []);
        }
      }
    } catch {
      // Try fallback
      try {
        const res = await fetch("/api/agents/poller-status");
        if (res.ok) {
          const data = await res.json();
          setPollers(data.pollers || []);
        }
      } catch {
        // silent
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPollers();
    const interval = setInterval(fetchPollers, 60_000);
    return () => clearInterval(interval);
  }, [fetchPollers]);

  const runPoller = async (name: string) => {
    setRunningPoller(name);
    try {
      await fetch(`/api/agents/cron?job=${encodeURIComponent(name)}`);
      await fetchPollers();
    } finally {
      setRunningPoller(null);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    try {
      await fetch("/api/agents/cron");
      await fetchPollers();
    } finally {
      setRunningAll(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">Agent Pollers</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-900">Agent Pollers</span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {pollers.length} active
          </span>
        </div>
        <button
          onClick={runAll}
          disabled={runningAll}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {runningAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          Run All
        </button>
      </div>

      <div className="space-y-2">
        {pollers.map((poller) => {
          const isRunning = runningPoller === poller.name;
          const lastRun = poller.lastRunAt ? new Date(poller.lastRunAt) : null;
          const timeAgo = lastRun ? getTimeAgo(lastRun) : "Never run";
          const hasError = poller.lastStatus === "error";
          const isRunningNow = poller.lastStatus === "running";

          return (
            <div
              key={poller.name}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
                hasError ? "border-red-200 bg-red-50/50" : "border-gray-100 hover:bg-gray-50"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">
                    {POLLER_LABELS[poller.name] || poller.name}
                  </span>
                  {isRunningNow && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Running
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                  <span>{POLLER_SCHEDULES[poller.name] || poller.schedule}</span>
                  <span>·</span>
                  <span>{timeAgo}</span>
                  {poller.itemsChecked > 0 && (
                    <>
                      <span>·</span>
                      <span>{poller.itemsChecked} checked</span>
                    </>
                  )}
                  {poller.alertsGenerated > 0 && (
                    <span className="text-amber-600 font-medium">
                      {poller.alertsGenerated} alerts
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {hasError ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : poller.lastStatus === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-300" />
                )}
                <button
                  onClick={() => runPoller(poller.name)}
                  disabled={isRunning || isRunningNow}
                  className="text-[11px] font-medium text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : "Run"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
