"use client";

import {
  Package, MapPin, Truck, Clock, AlertTriangle,
  Copy, Share2, RefreshCw, CheckCircle2, XCircle,
  BarChart3, ExternalLink, CreditCard, Calculator,
  MessageCircle, FileSpreadsheet, Download, Webhook,
  ShoppingCart, ShoppingBag, Navigation, Activity,
  Building, ChevronRight, Wifi, WifiOff, Database,
  Route,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ModeBadge = "live" | "db-fallback" | "simulated" | "error";

interface ToolResultCardProps {
  type: "shipment" | "inventory" | "route" | "integration" | "error" | "report";
  data: Record<string, any>;
  onRetry?: () => void;
}

const modeLabels: Record<string, string> = {
  live: "Live API",
  "db-fallback": "DB Cache",
  simulated: "Simulated",
  error: "Error",
};

const modeIcons: Record<string, React.ReactNode> = {
  live: <Wifi className="h-3 w-3" />,
  "db-fallback": <Database className="h-3 w-3" />,
  simulated: <WifiOff className="h-3 w-3" />,
  error: <XCircle className="h-3 w-3" />,
};

const modeColors: Record<string, string> = {
  live: "bg-emerald-100 text-emerald-700",
  "db-fallback": "bg-amber-100 text-amber-700",
  simulated: "bg-gray-100 text-gray-600",
  error: "bg-red-100 text-red-700",
};

function ModeBadgeComp({ mode }: { mode: ModeBadge }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
        modeColors[mode] || modeColors.simulated
      )}
    >
      {modeIcons[mode] || modeIcons.simulated}
      {modeLabels[mode] || mode}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ShipmentCard({ data, mode }: { data: any; mode: ModeBadge }) {
  const tracking = data.tracking_number || data.awb || "—";
  const carrier = data.carrier || "—";
  const status = data.status || data.shipment_status || "unknown";
  const location = data.location || data.current_location || "—";
  const estDelivery = data.estimated_delivery || data.eta || "—";
  const destination = data.destination || "—";
  const origin = data.origin || "—";

  const statusStyle = (() => {
    const s = status.toLowerCase();
    if (s.includes("delivered")) return "text-emerald-600 bg-emerald-50";
    if (s.includes("transit") || s.includes("shipped")) return "text-sky-600 bg-sky-50";
    if (s.includes("pending") || s.includes("created")) return "text-amber-600 bg-amber-50";
    if (s.includes("cancelled") || s.includes("failed") || s.includes("rto")) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  })();

  const copyText = `Tracking: ${tracking}\nCarrier: ${carrier}\nStatus: ${status}\nLocation: ${location}\nETA: ${estDelivery}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Shipment Tracking</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={copyText} />
          <ModeBadgeComp mode={mode} />
        </div>
      </div>
      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Tracking #</span>
          <span className="text-sm font-mono font-semibold text-gray-800">{tracking}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Carrier</span>
          <span className="text-sm text-gray-700">{carrier}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Status</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusStyle)}>
            {status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Current Location</span>
          <span className="text-sm text-gray-700">{location}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Destination</span>
          <span className="text-sm text-gray-700">{destination}</span>
        </div>
        {estDelivery !== "—" && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Est. Delivery</span>
            <span className="text-sm text-gray-700">{estDelivery}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function InventoryCard({ data, mode }: { data: any; mode: ModeBadge }) {
  const itemName = data.name || data.item_name || data.product_name || "—";
  const sku = data.sku || "—";
  const quantity = Number(data.quantity || 0);
  const reorderPoint = Number(data.reorder_point || data.reorderPoint || 10);
  const status = quantity <= 0 ? "Out of Stock" : quantity <= reorderPoint ? "Low Stock" : "In Stock";
  const statusColor = quantity <= 0 ? "text-red-600 bg-red-50" : quantity <= reorderPoint ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50";

  const copyText = `SKU: ${sku}\nItem: ${itemName}\nQty: ${quantity}\nStatus: ${status}`;

  const items = data.items;
  const inventoryList = Array.isArray(items) ? items : (data.inventory && Array.isArray(data.inventory) ? data.inventory : []);

  if (inventoryList.length > 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Inventory Check</span>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton text={inventoryList.map((i: any) => `${i.item_name || i.name}: ${i.quantity}`).join("\n")} />
            <ModeBadgeComp mode={mode} />
          </div>
        </div>
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {inventoryList.map((item: any, idx: number) => {
            const qty = Number(item.quantity || 0);
            const rp = Number(item.reorder_point || item.reorderPoint || 10);
            const itemStatus = qty <= 0 ? "out" : qty <= rp ? "low" : "ok";
            return (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{item.item_name || item.name}</p>
                  <p className="text-[11px] text-gray-400">{item.sku || "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-800">{qty}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    itemStatus === "out" ? "bg-red-100 text-red-600" : itemStatus === "low" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {itemStatus === "out" ? "Out" : itemStatus === "low" ? "Low" : "OK"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {data.count !== undefined && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500">
            {data.count} items total
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Inventory</span>
        </div>
        <ModeBadgeComp mode={mode} />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">SKU</span>
          <span className="text-sm font-mono text-gray-700">{sku}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Item</span>
          <span className="text-sm text-gray-700">{itemName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Quantity</span>
          <span className="text-sm font-semibold text-gray-800">{quantity}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Status</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor)}>{status}</span>
        </div>
        {quantity <= reorderPoint && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            Reorder point: {reorderPoint}. Action required.
          </div>
        )}
      </div>
    </div>
  );
}

function RouteCard({ data, mode }: { data: any; mode: ModeBadge }) {
  const stops = Array.isArray(data.stops) ? data.stops : data.route || [];
  const totalDistance = data.total_distance || data.distance || "—";
  const totalTime = data.total_time || data.eta || "—";

  const copyText = stops.map((s: any, i: number) => `Stop ${i + 1}: ${s.address || s.location || s.name} (${s.eta || "—"})`).join("\n");

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Route Plan</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={copyText} />
          <ModeBadgeComp mode={mode} />
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Route className="h-3.5 w-3.5" />
            {totalDistance} km
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {totalTime} min
          </div>
        </div>
        {stops.length > 0 && (
          <div className="space-y-1">
            {stops.map((stop: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex flex-col items-center pt-0.5">
                  <div className={cn(
                    "grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white",
                    idx === 0 ? "bg-emerald-500" : idx === stops.length - 1 ? "bg-red-500" : "bg-gray-400"
                  )}>
                    {idx + 1}
                  </div>
                  {idx < stops.length - 1 && <div className="w-0.5 h-8 bg-gray-200 mt-0.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{stop.address || stop.location || stop.name || `Stop ${idx + 1}`}</p>
                  {stop.eta && <p className="text-[11px] text-gray-400">ETA: {stop.eta}</p>}
                  {stop.distance && <p className="text-[11px] text-gray-400">{stop.distance} km from previous</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IntegrationCard({ data, mode }: { data: any; mode: ModeBadge }) {
  const success = data.success !== undefined ? data.success : true;
  const message = data.message || data.error || "Action completed";
  const integrationName = data.integration_name || data.provider || "";
  const details = data.tracking || data.inventory || data.rates || data.transactions || data.orders_synced || null;

  const copyText = `${integrationName ? integrationName + ": " : ""}${message}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {success ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
          <span className="text-sm font-semibold text-gray-700">
            {integrationName || "Integration"} {success ? "Success" : "Failed"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={copyText} />
          <ModeBadgeComp mode={mode} />
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600">{message}</p>
        {details && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <pre className="text-[11px] text-gray-600 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        )}
        {data.hint && (
          <p className="mt-2 text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded">{data.hint}</p>
        )}
        {data.form && (
          <div className="mt-2">
            <p className="text-[11px] text-gray-400 mb-1">Required fields:</p>
            <div className="flex flex-wrap gap-1">
              {data.form.fields.map((f: string) => (
                <span key={f} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-mono">{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorCard({ data, onRetry }: { data: any; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-700">Something went wrong</p>
          <p className="text-xs text-red-600 mt-1">
            {data.message || data.error || "An unexpected error occurred. Please try again."}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-900 font-medium"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportCard({ data, mode }: { data: any; mode: ModeBadge }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Report</span>
        </div>
        <ModeBadgeComp mode={mode} />
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600">{data.message || "Report generated"}</p>
      </div>
    </div>
  );
}

export default function ToolResultCard({ type, data, onRetry }: ToolResultCardProps) {
  const mode: ModeBadge = data?.mode || "simulated";

  if (type === "error") return <ErrorCard data={data} onRetry={onRetry} />;

  return (
    <div className="my-2">
      {type === "shipment" && <ShipmentCard data={data} mode={mode} />}
      {type === "inventory" && <InventoryCard data={data} mode={mode} />}
      {type === "route" && <RouteCard data={data} mode={mode} />}
      {type === "integration" && <IntegrationCard data={data} mode={mode} />}
      {type === "report" && <ReportCard data={data} mode={mode} />}
    </div>
  );
}
