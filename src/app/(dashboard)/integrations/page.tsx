"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Search, Zap, FileSpreadsheet, MessageCircle, Globe,
  Rocket, Calculator, FileCheck, CreditCard, Building, MapPin, ShoppingCart,
  ShoppingBag, Package, Truck, Navigation, Activity, Check,
  Loader2, Upload, Download, Wifi, WifiOff, Plus, X, ExternalLink,
  Sheet, Webhook, Settings, RefreshCw, BarChart3, Send, Eye, Play
} from "lucide-react";

type Integration = {
  id: string; tier: number; name: string; category: string; desc: string;
  icon: string; docsUrl: string; configFields: string[];
  status: "connected" | "disconnected"; connectedAt?: string; config?: any;
};

const ACTIONS_MAP: Record<string, { label: string; icon: any; desc: string; action: string }[]> = {
  csv_import: [
    { label: "Upload CSV", icon: Upload, desc: "Upload a CSV file to import shipments, inventory, or orders", action: "upload_csv" },
    { label: "Download Template", icon: Download, desc: "Get a pre-formatted CSV template for data entry", action: "download_template" },
    { label: "View Last Import", icon: Eye, desc: "See the most recent import results and any errors", action: "view_history" },
  ],
  whatsapp: [
    { label: "Send Test Message", icon: Send, desc: "Send a test notification to verify your WhatsApp setup", action: "test_whatsapp" },
    { label: "Notification Rules", icon: Settings, desc: "Configure which events trigger WhatsApp notifications", action: "configure_rules" },
    { label: "Message Log", icon: BarChart3, desc: "View sent messages and delivery status", action: "view_log" },
  ],
  google_sheets: [
    { label: "Sync Now", icon: RefreshCw, desc: "Pull latest data from Google Sheets to Lanework", action: "sync_sheet" },
    { label: "Export to Sheet", icon: Upload, desc: "Push Lanework data to your Google Sheet", action: "export_sheet" },
    { label: "Sheet Settings", icon: Settings, desc: "Map spreadsheet columns to data fields", action: "configure_sheet" },
  ],
  generic_webhook: [
    { label: "Copy Webhook URL", icon: ExternalLink, desc: "Copy endpoint URL to paste into your TMS/WMS", action: "copy_webhook" },
    { label: "Test Webhook", icon: Play, desc: "Send a test payload to verify the webhook works", action: "test_webhook" },
    { label: "Event Log", icon: BarChart3, desc: "View all received webhook events", action: "view_webhook_log" },
  ],
  shiprocket: [
    { label: "Track Shipment", icon: Search, desc: "Enter an AWB to get real-time tracking", action: "track_shipment" },
    { label: "Compare Rates", icon: BarChart3, desc: "Compare shipping rates across carriers for a route", action: "compare_rates" },
    { label: "Create Shipment", icon: Plus, desc: "Book a new shipment via Shiprocket", action: "create_shipment" },
    { label: "Bulk Import AWB", icon: Upload, desc: "Upload a CSV of AWBs to track all at once", action: "bulk_awb" },
  ],
  tally_prime: [
    { label: "Sync Inventory Now", icon: RefreshCw, desc: "Pull latest stock levels from TallyPrime", action: "sync_inventory" },
    { label: "Push Orders", icon: Upload, desc: "Send pending orders to Tally as sales vouchers", action: "push_orders" },
    { label: "Check Ledger", icon: Eye, desc: "View any Tally ledger balance and transactions", action: "check_ledger" },
  ],
  gstn_eway_bill: [
    { label: "Generate E-Way Bill", icon: Plus, desc: "Create e-way bill for a shipment from invoice data", action: "generate_ewb" },
    { label: "Validate GSTIN", icon: Check, desc: "Verify a customer's GSTIN number", action: "validate_gstin" },
    { label: "View E-Way Bills", icon: Eye, desc: "See all generated e-way bills and their status", action: "view_ewb" },
  ],
  razorpay: [
    { label: "COD Reconciliation", icon: RefreshCw, desc: "Match COD payments with Razorpay settlements", action: "reconcile" },
    { label: "View Transactions", icon: Eye, desc: "See all payment transactions and settlements", action: "view_transactions" },
    { label: "Send Payment Link", icon: Send, desc: "Share a payment link with a customer", action: "send_link" },
  ],
  mapmyindia: [
    { label: "Geocode Address", icon: MapPin, desc: "Convert an Indian address to coordinates", action: "geocode" },
    { label: "Optimize Route", icon: Navigation, desc: "Find the fastest route for multiple stops", action: "optimize_route" },
    { label: "Distance Matrix", icon: BarChart3, desc: "Get time/distance between multiple locations", action: "distance_matrix" },
  ],
  loconav: [
    { label: "Track Vehicles", icon: Navigation, desc: "See real-time GPS positions of all vehicles", action: "track_all" },
    { label: "Maintenance Alert", icon: Settings, desc: "Check vehicles due for maintenance", action: "maintenance_check" },
    { label: "Driver Report", icon: Eye, desc: "View driver hours and compliance status", action: "driver_report" },
  ],
};

const FALLBACK_ACTIONS: { label: string; icon: any; desc: string; action: string }[] = [
  { label: "Configure", icon: Settings, desc: "Set up API keys, endpoints, and options for this integration", action: "configure" },
  { label: "Test Connection", icon: Play, desc: "Verify the integration is working with a test request", action: "test" },
  { label: "View Logs", icon: BarChart3, desc: "See recent activity and any errors from this integration", action: "view_logs" },
];

const ICON_MAP: Record<string, any> = {
  "file-spreadsheet": FileSpreadsheet, download: Download, "message-circle": MessageCircle,
  sheet: Sheet, webhook: Webhook, rocket: Rocket, calculator: Calculator,
  "file-check": FileCheck, "credit-card": CreditCard, building: Building,
  "map-pin": MapPin, "shopping-cart": ShoppingCart, "shopping-bag": ShoppingBag,
  package: Package, truck: Truck, navigation: Navigation, activity: Activity,
};

const QUICK_CONNECT = ["csv_import", "whatsapp", "google_sheets", "generic_webhook"];
const TIERS = [
  { key: "all", label: "All", color: "bg-[#1a1a2e] text-white" },
  { key: "1", label: "Universal", color: "bg-emerald-100 text-emerald-800" },
  { key: "2", label: "India-Specific", color: "bg-blue-100 text-blue-800" },
  { key: "3", label: "Scale", color: "bg-purple-100 text-purple-800" },
];

export default function IntegrationsDashboard() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeTier, setActiveTier] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [showQuickConnect, setShowQuickConnect] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const [actionRunning, setActionRunning] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<any>(null);

  useEffect(() => { fetchIntegrations(); }, []);
  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations${activeTier !== "all" ? `?tier=${activeTier}` : ""}`);
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchIntegrations(); }, [activeTier]);

  const flash = (text: string, type: "success" | "error") => {
    setToast({ text, type }); setTimeout(() => setToast(null), 3000);
  };

  const handleConnect = async (type: string, name: string) => {
    setConnecting(type);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config: {} }),
      });
      const data = await res.json();
      data.success ? flash(`${name} connected! 🎉`, "success") : flash(data.error || "Connection failed", "error");
      fetchIntegrations();
    } catch { flash("Network error", "error"); }
    setConnecting(null);
  };

  const handleDisconnect = async (id: string, name: string) => {
    setDisconnecting(id);
    try {
      await fetch(`/api/integrations/${id}`, { method: "DELETE" });
      flash(`${name} disconnected`, "success");
      setExpandedIntegration(null);
      fetchIntegrations();
    } catch { flash("Failed to disconnect", "error"); }
    setDisconnecting(null);
  };

  const handleAction = async (integrationId: string, action: string, label: string) => {
    setActionRunning(action);
    setActionResult(null);
    try {
      const res = await fetch(`/api/integrations/${integrationId}/action`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setActionResult(data);
      flash(`${label} completed`, data.success ? "success" : "error");
    } catch {
      flash(`${label} failed — is the integration configured with valid API keys?`, "error");
    }
    setActionRunning(null);
  };

  const filtered = integrations.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase()) ||
    i.desc.toLowerCase().includes(search.toLowerCase())
  );
  const connectedCount = integrations.filter(i => i.status === "connected").length;
  const categories = [...new Set(filtered.map(i => i.category))];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.text}
        </div>
      )}

      <div className="border-b border-[#e5e7eb]/60 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center gap-3 text-sm text-[#1a1a2e]/50 mb-2">
            <Link href="/dashboard" className="hover:text-[#1a1a2e]">Dashboard</Link><span>/</span><span className="text-[#1a1a2e]">Integrations</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[#1a1a2e]">Integrations</h1>
              <p className="mt-1 text-[#1a1a2e]/60">Connect Lanework to your tools. Click a connected integration to see available actions.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a2e]/5 text-sm text-[#1a1a2e]/70">
              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-medium text-emerald-600">{connectedCount}</span>
              <span>connected</span>
              <span className="mx-1">·</span>
              <span className="font-medium">{integrations.length - connectedCount}</span>
              <span>available</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {showQuickConnect && connectedCount === 0 && (
          <div className="mb-8 p-6 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><Zap className="h-5 w-5 text-emerald-600" />Quick Setup</h2>
                <p className="mt-1 text-sm text-[#1a1a2e]/60">Click an integration to connect, then click it again to see what you can do.</p>
              </div>
              <button onClick={() => setShowQuickConnect(false)} className="text-[#1a1a2e]/30 hover:text-[#1a1a2e]/60"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 md:grid-cols-4 mt-4">
              {QUICK_CONNECT.map(id => {
                const integ = integrations.find(i => i.id === id); if (!integ) return null;
                const ICO = ICON_MAP[integ.icon] || Zap; const isConnected = integ.status === "connected";
                return (
                  <button key={id} disabled={isConnected || connecting === id}
                    onClick={() => handleConnect(id, integ.name)}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border text-center transition-all ${
                      isConnected ? "border-emerald-300 bg-emerald-50 cursor-default" : "border-[#e5e7eb] bg-white hover:border-[#1a1a2e] hover:shadow-md cursor-pointer"
                    }`}>
                    <div className={`grid h-12 w-12 place-items-center rounded-xl ${isConnected ? "bg-emerald-100" : "bg-[#1a1a2e]/5"}`}>
                      {connecting === id ? <Loader2 className="h-5 w-5 animate-spin" /> : isConnected ? <Check className="h-5 w-5 text-emerald-600" /> : <ICO className="h-5 w-5 text-[#1a1a2e]/70" />}
                    </div>
                    <div><div className="text-sm font-medium">{integ.name}</div>
                      <div className="text-xs text-[#1a1a2e]/50 mt-0.5">{isConnected ? "✓ Connected — click to use" : "Click to connect"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex gap-1.5">
            {TIERS.map(t => (
              <button key={t.key} onClick={() => setActiveTier(t.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTier === t.key ? t.color : "bg-[#1a1a2e]/5 text-[#1a1a2e]/60 hover:bg-[#1a1a2e]/10"}`}>{t.label}</button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1a1a2e]/30" />
            <input type="text" placeholder="Search integrations…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-white border border-[#e5e7eb] text-sm placeholder:text-[#1a1a2e]/30 focus:outline-none focus:border-[#1a1a2e]/40" />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">{Array.from({length:6}).map((_,i)=>(<div key={i} className="h-40 rounded-2xl bg-[#1a1a2e]/5 animate-pulse" />))}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><Zap className="h-12 w-12 text-[#1a1a2e]/15 mx-auto" /><p className="mt-4 text-[#1a1a2e]/50">No integrations found.</p></div>
        ) : (
          categories.map(cat => {
            const catItems = filtered.filter(i => i.category === cat);
            if (catItems.length === 0) return null;
            return (
              <div key={cat} className="mb-10">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/40 mb-4">{cat}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {catItems.map(integ => {
                    const ICO = ICON_MAP[integ.icon] || Zap;
                    const isConnected = integ.status === "connected";
                    const isBusy = connecting === integ.id || disconnecting === integ.id;
                    const isExpanded = expandedIntegration === integ.id;
                    const actions = (isConnected ? (ACTIONS_MAP[integ.id] || FALLBACK_ACTIONS) : []);

                    return (
                      <div key={integ.id}>
                        <div onClick={() => isConnected && setExpandedIntegration(isExpanded ? null : integ.id)}
                          className={`group relative rounded-2xl border p-6 transition-all duration-300 ${
                            isConnected
                              ? `border-emerald-200 bg-emerald-50/30 ${isExpanded ? "ring-2 ring-emerald-400 shadow-lg" : "cursor-pointer hover:border-emerald-400 hover:shadow-md"}`
                              : "border-[#e5e7eb] bg-white hover:border-[#1a1a2e]/30 hover:shadow-md"
                          }`}>
                          <div className="absolute top-4 right-4">
                            {isConnected ? (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                {isExpanded ? "Click to close" : "Click to use"}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-[#1a1a2e]/30">
                                <div className="h-2 w-2 rounded-full bg-[#1a1a2e]/20" />Available
                              </div>
                            )}
                          </div>
                          <div className={`grid h-12 w-12 place-items-center rounded-xl mb-4 ${isConnected ? "bg-emerald-100" : "bg-[#1a1a2e]/5"}`}>
                            <ICO className={`h-6 w-6 ${isConnected ? "text-emerald-600" : "text-[#1a1a2e]/60"}`} />
                          </div>
                          <h4 className="font-semibold text-[#1a1a2e]">{integ.name}</h4>
                          <p className="mt-1 text-sm text-[#1a1a2e]/55 leading-relaxed">{integ.desc}</p>
                          <div className="flex items-center gap-2 mt-4">
                            {isConnected ? (
                              <div className="flex items-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setExpandedIntegration(isExpanded ? null : integ.id); }}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                                  {isExpanded ? "Close" : "Use"} <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                                <button disabled={isBusy} onClick={(e) => { e.stopPropagation(); handleDisconnect(integ.id, integ.name); }}
                                  className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600 disabled:opacity-50">
                                  {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            ) : (
                              <button disabled={isBusy} onClick={() => handleConnect(integ.id, integ.name)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition-all">
                                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                Connect
                              </button>
                            )}
                          </div>
                        </div>

                        {/* EXPANDED ACTION PANEL */}
                        {isExpanded && isConnected && (
                          <div className="mt-2 p-5 rounded-2xl border border-emerald-200 bg-white shadow-sm animate-fade-in">
                            <h4 className="text-sm font-semibold text-[#1a1a2e] mb-1">What you can do with {integ.name}</h4>
                            <p className="text-xs text-[#1a1a2e]/50 mb-4">
                              {integ.connectedAt ? `Connected ${new Date(integ.connectedAt).toLocaleDateString()}. ` : ""}
                              These actions use your real {integ.name} API keys.
                            </p>

                            <div className="grid gap-3 md:grid-cols-2">
                              {actions.map(act => {
                                const AIC = act.icon;
                                const running = actionRunning === act.action;
                                return (
                                  <button key={act.action} disabled={!!actionRunning}
                                    onClick={() => handleAction(integ.id, act.action, act.label)}
                                    className="flex items-start gap-4 p-4 rounded-xl border border-[#e5e7eb] hover:border-[#1a1a2e] hover:bg-[#fafafa] transition-all text-left disabled:opacity-50">
                                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#1a1a2e]/5 mt-0.5">
                                      {running ? <Loader2 className="h-5 w-5 animate-spin text-[#1a1a2e]" /> : <AIC className="h-5 w-5 text-[#1a1a2e]/70" />}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-[#1a1a2e]">{act.label}</div>
                                      <div className="text-xs text-[#1a1a2e]/50 mt-0.5">{act.desc}</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {actionResult && (
                              <div className="mt-4 p-4 rounded-xl bg-[#1a1a2e]/5 border border-[#1a1a2e]/10">
                                <div className="text-xs font-semibold text-[#1a1a2e]/50 mb-2">RESULT</div>
                                <pre className="text-xs text-[#1a1a2e]/70 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                                  {JSON.stringify(actionResult, null, 2)}
                                </pre>
                              </div>
                            )}

                            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
                              <span className="shrink-0">💡</span>
                              <span>Make sure you've set the required API keys in your Vercel environment variables. <Link href="/docs" className="underline font-medium">See docs</Link> for setup instructions.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
