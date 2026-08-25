"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity, Radio, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, ChevronRight, X, Zap, Bot, Package,
  Truck, Warehouse, MapPin, RefreshCw, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

interface AgentEvent {
  id: string;
  eventType: string;
  data: Record<string, unknown>;
  source: string;
  timestamp: string;
}

interface AgentActivityPanelProps {
  tenantId?: string;
  className?: string;
}

// ── Event type config ──

const EVENT_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  "shipment.delayed":     { icon: Package,  color: "text-amber-600",  bg: "bg-amber-50",  label: "Shipment Delayed" },
  "shipment.exception":   { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "Shipment Exception" },
  "delivery.completed":   { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Delivery Completed" },
  "stock.below_reorder":  { icon: Warehouse, color: "text-orange-600", bg: "bg-orange-50", label: "Low Stock Alert" },
  "stock.out_of_stock":   { icon: Warehouse, color: "text-red-600",    bg: "bg-red-50",    label: "Out of Stock" },
  "fleet.maintenance_due":{ icon: Truck,     color: "text-blue-600",   bg: "bg-blue-50",   label: "Maintenance Due" },
  "fleet.driver_overtime": { icon: Truck,    color: "text-purple-600", bg: "bg-purple-50", label: "Driver Overtime" },
  "compliance.license_expiring": { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "License Expiring" },
  "order.new":            { icon: Package,   color: "text-blue-600",   bg: "bg-blue-50",   label: "New Order" },
  "system.health_check":  { icon: Activity,  color: "text-gray-600",   bg: "bg-gray-50",   label: "System Check" },
};

const DEFAULT_CONFIG = { icon: Zap, color: "text-gray-600", bg: "bg-gray-50", label: "Agent Event" };

function getEventConfig(eventType: string) {
  return EVENT_CONFIG[eventType] || DEFAULT_CONFIG;
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatEventDetail(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value).slice(0, 80);
  return String(value);
}

// ── Component ──

export default function AgentActivityPanel({ tenantId, className }: AgentActivityPanelProps) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const eventsRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = new URLSearchParams();
    if (tenantId) params.set("tenant_id", tenantId);

    const es = new EventSource(`/api/agents/stream?${params.toString()}`);
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setConnected(true);
    });

    // Listen for all agent events
    const eventTypes = [
      "shipment.delayed", "shipment.exception", "delivery.completed",
      "stock.below_reorder", "stock.out_of_stock",
      "fleet.maintenance_due", "fleet.driver_overtime", "fleet.offline",
      "compliance.license_expiring", "compliance.rc_expiring",
      "order.new", "order.cancelled", "delivery.failed",
      "system.health_check", "daily.report",
    ];

    for (const type of eventTypes) {
      es.addEventListener(type, (e) => {
        try {
          const data = JSON.parse(e.data);
          setEvents((prev) => [data, ...prev].slice(0, 50)); // Keep last 50
        } catch {
          // Ignore parse errors
        }
      });
    }

    // Also catch unknown events via message handler
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.eventType) {
          setEvents((prev) => [data, ...prev].slice(0, 50));
        }
      } catch {
        // Ignore
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 5 seconds
      reconnectTimerRef.current = setTimeout(connect, 5000);
    };
  }, [tenantId]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect]);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={cn(
          "fixed right-4 top-20 z-40 flex items-center gap-2 px-3 py-2 rounded-xl",
          "bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl",
          "transition-all duration-200",
          className
        )}
        aria-label="Show agent activity"
      >
        <Activity className="h-4 w-4 text-[#1a1a2e]" />
        {events.length > 0 && (
          <span className="text-xs font-bold text-[#1a1a2e]">{events.length}</span>
        )}
        <span className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-500 animate-pulse" : "bg-red-400")} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white border-l border-gray-200",
        "w-80 flex-shrink-0",
        className
      )}
      role="complementary"
      aria-label="Agent activity feed"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#1a1a2e]">
            <Activity className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-900">Agent Activity</h2>
            <div className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-500 animate-pulse" : "bg-red-400")} />
              <span className="text-[10px] text-gray-400">{connected ? "Live" : "Disconnected"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {events.length > 0 && (
            <button
              onClick={() => setEvents([])}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="Clear events"
              aria-label="Clear events"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Collapse panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div ref={eventsRef} className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gray-50 mb-3">
              <Radio className="h-5 w-5 text-gray-300 animate-pulse" />
            </div>
            <p className="text-xs font-medium text-gray-400">Waiting for agent events...</p>
            <p className="text-[10px] text-gray-300 mt-1">Events will appear here in real-time</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {events.map((event) => {
              const config = getEventConfig(event.eventType);
              const Icon = config.icon;
              const isExpanded = expandedId === event.id;

              return (
                <div
                  key={event.id}
                  className={cn(
                    "px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer",
                    "animate-in fade-in slide-in-from-right-2 duration-300"
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("grid h-7 w-7 place-items-center rounded-lg flex-shrink-0", config.bg)}>
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800 truncate">
                          {config.label}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {(() => {
                          const tn = event.data.trackingNumber as string | undefined;
                          const sku = event.data.sku as string | undefined;
                          const plate = event.data.plateNumber as string | undefined;
                          if (tn) return `#${tn}`;
                          if (sku) return `SKU: ${sku}`;
                          if (plate) return plate;
                          return event.source;
                        })()}
                      </p>
                      {isExpanded && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg text-[10px] text-gray-600 font-mono space-y-1">
                          <div><span className="font-semibold">Type:</span> {event.eventType}</div>
                          <div><span className="font-semibold">Source:</span> {event.source}</div>
                          <div><span className="font-semibold">ID:</span> {event.id.slice(0, 8)}...</div>
                          {Object.entries(event.data).slice(0, 5).map(([key, val]) => (
                            <div key={key}>
                              <span className="font-semibold">{key}:</span> {formatEventDetail(key, val)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 mt-1">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-gray-300" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[10px] text-gray-400 text-center">
          {events.length} event{events.length !== 1 ? "s" : ""} · Auto-updates via SSE
        </p>
      </div>
    </div>
  );
}
