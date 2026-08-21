"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings, Play, RefreshCw, CheckCircle2, XCircle, Clock, Zap, Loader2,
  AlertTriangle, Activity, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PollerResult {
  name: string;
  success: boolean;
  checked: number;
  alerts: number;
  errors: number;
}

interface PollerStatus {
  name: string;
  schedule: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string;
  itemsChecked: number;
  alertsGenerated: number;
}

const POLLER_CONFIG: Record<string, { label: string; icon: string; description: string; schedule: string }> = {
  "shipment-poller": {
    label: "Shipment Tracker",
    icon: "📦",
    description: "Monitors all active shipments for delays, status changes, and exceptions across all carriers.",
    schedule: "Every 5 minutes",
  },
  "inventory-poller": {
    label: "Inventory Monitor",
    icon: "📊",
    description: "Checks stock levels against reorder points, detects out-of-stock items and demand spikes.",
    schedule: "Every 30 minutes",
  },
  "fleet-poller": {
    label: "Fleet Watchdog",
    icon: "🚛",
    description: "Monitors vehicle maintenance schedules, driver hours compliance, and GPS connectivity.",
    schedule: "Every 10 minutes",
  },
  "compliance-poller": {
    label: "Compliance Checker",
    icon: "🪪",
    description: "Daily checks for license expiry, RC renewal, fitness certificates, and pending challans.",
    schedule: "Daily at 6:00 AM",
  },
  "daily-report": {
    label: "Daily Report Generator",
    icon: "📋",
    description: "Generates a comprehensive logistics summary every morning with shipment, inventory, and fleet stats.",
    schedule: "Daily at 8:00 AM",
  },
};

export default function AgentControlPage() {
  const [pollers, setPollers] = useState<PollerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [runningPoller, setRunningPoller] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<Record<string, PollerResult>>({});
  const [lastRunAll, setLastRunAll] = useState<Date | null>(null);

  const fetchPollers = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/poller-status");
      if (res.ok) {
        const data = await res.json();
        setPollers(data.pollers || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPollers();
  }, [fetchPollers]);

  const runPoller = async (name: string) => {
    setRunningPoller(name);
    try {
      const res = await fetch(`/api/agents/cron?job=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setRunResults((prev) => ({ ...prev, [name]: { name, ...data } }));
      }
      await fetchPollers();
    } finally {
      setRunningPoller(null);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    try {
      const res = await fetch("/api/agents/cron");
      if (res.ok) {
        const data = await res.json();
        if (data.results) {
          const map: Record<string, PollerResult> = {};
          for (const r of data.results) map[r.name] = r;
          setRunResults(map);
        }
      }
      setLastRunAll(new Date());
      await fetchPollers();
    } finally {
      setRunningAll(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="h-7 w-7" />
              Agent Control Panel
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manually trigger agent pollers and monitor their execution
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRunAll && (
              <span className="text-xs text-gray-400">
                Last run all: {lastRunAll.toLocaleTimeString("en-IN")}
              </span>
            )}
            <button
              onClick={runAll}
              disabled={runningAll}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Run All Pollers
            </button>
          </div>
        </div>

        {/* Poller Cards */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-48 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(POLLER_CONFIG).map(([name, config]) => {
              const poller = pollers.find((p) => p.name === name);
              const isRunning = runningPoller === name;
              const result = runResults[name];
              const lastRun = poller?.lastRunAt ? new Date(poller.lastRunAt) : null;
              const hasError = poller?.lastStatus === "error";

              return (
                <div
                  key={name}
                  className={cn(
                    "bg-white rounded-xl border p-5 transition-all hover:shadow-md",
                    hasError ? "border-red-200" : "border-gray-200"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{config.label}</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">{config.schedule}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => runPoller(name)}
                      disabled={isRunning}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                        isRunning
                          ? "bg-blue-50 text-blue-600 border border-blue-200"
                          : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      {isRunning ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      {isRunning ? "Running..." : "Run Now"}
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{config.description}</p>

                  {/* Status row */}
                  <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      {hasError ? (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      ) : poller?.lastStatus === "success" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-gray-300" />
                      )}
                      <span className="text-[11px] text-gray-500">
                        {lastRun
                          ? `Last: ${lastRun.toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                          : "Never run"}
                      </span>
                    </div>
                    {poller && poller.itemsChecked > 0 && (
                      <span className="text-[11px] text-gray-400">
                        {poller.itemsChecked} items checked
                      </span>
                    )}
                    {poller && poller.alertsGenerated > 0 && (
                      <span className="text-[11px] text-amber-600 font-medium">
                        {poller.alertsGenerated} alerts
                      </span>
                    )}
                  </div>

                  {/* Latest run result */}
                  {result && (
                    <div className={cn(
                      "mt-3 p-3 rounded-lg text-xs",
                      result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    )}>
                      <div className="flex items-center gap-2">
                        {result.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        <span className="font-medium">
                          {result.success ? "Completed" : "Failed"}
                        </span>
                        <span>·</span>
                        <span>{result.checked} checked</span>
                        <span>·</span>
                        <span>{result.alerts} alerts</span>
                        {result.errors > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-red-600">{result.errors} errors</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Help section */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">How Agent Pollers Work</h3>
          <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-500 leading-relaxed">
            <div>
              <p className="font-medium text-gray-700 mb-1">Automatic Scheduling</p>
              <p>
                Pollers run automatically on their configured schedules. In production (Vercel),
                they use Vercel Cron. In development, they run in-process via node-cron.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Manual Triggers</p>
              <p>
                Use the &quot;Run Now&quot; button to trigger a poller immediately. This is useful for testing
                or when you need an immediate check outside the normal schedule.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Event-Driven Actions</p>
              <p>
                When a poller detects an issue (delay, low stock, etc.), it emits an event.
                The event system evaluates trust levels and either auto-executes or creates
                an approval request.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Alert Generation</p>
              <p>
                Pollers create alerts in the database when they detect issues. Alerts appear
                in the notification bell, alerts page, and dashboard feed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
