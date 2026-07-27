"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Search, Zap, FileSpreadsheet, MessageCircle, Globe,
  Rocket, Calculator, FileCheck, CreditCard, Building, MapPin, ShoppingCart,
  ShoppingBag, Package, Truck, Navigation, Activity, ChevronDown, Check,
  Loader2, Upload, Download, Wifi, WifiOff, Plus, X, ExternalLink,
  Sheet, Webhook
} from "lucide-react";

type Integration = {
  id: string; tier: number; name: string; category: string; desc: string;
  icon: string; docsUrl: string; status: "connected" | "disconnected";
  connectedAt?: string; config?: any;
};

const TIERS = [
  { key: "all", label: "All", color: "bg-[#1a1a2e] text-white" },
  { key: "1", label: "Universal", color: "bg-emerald-100 text-emerald-800" },
  { key: "2", label: "India-Specific", color: "bg-blue-100 text-blue-800" },
  { key: "3", label: "Scale", color: "bg-purple-100 text-purple-800" },
];

const ICON_MAP: Record<string, any> = {
  "file-spreadsheet": FileSpreadsheet, download: Download, "message-circle": MessageCircle,
  sheet: Sheet, webhook: Webhook, rocket: Rocket, calculator: Calculator,
  "file-check": FileCheck, "credit-card": CreditCard, building: Building,
  "map-pin": MapPin, "shopping-cart": ShoppingCart, "shopping-bag": ShoppingBag,
  package: Package, truck: Truck, navigation: Navigation, activity: Activity,
};

// Quick-connect recommendations for first-time users
const QUICK_CONNECT = ["csv_import", "whatsapp", "google_sheets", "generic_webhook"];

export default function IntegrationsDashboard() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeTier, setActiveTier] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [showQuickConnect, setShowQuickConnect] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations${activeTier !== "all" ? `?tier=${activeTier}` : ""}`);
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch { /* offline */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchIntegrations();
  }, [activeTier]);

  const flash = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleConnect = async (type: string, name: string) => {
    setConnecting(type);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, config: {} }),
      });
      const data = await res.json();
      if (data.success) {
        flash(`${name} connected! 🎉`, "success");
        fetchIntegrations();
      } else {
        flash(data.error || "Connection failed", "error");
      }
    } catch {
      flash("Network error. Try again.", "error");
    }
    setConnecting(null);
  };

  const handleDisconnect = async (id: string, name: string) => {
    setDisconnecting(id);
    try {
      const res = await fetch(`/api/integrations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        flash(`${name} disconnected`, "success");
        fetchIntegrations();
      }
    } catch {
      flash("Failed to disconnect", "error");
    }
    setDisconnecting(null);
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
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#e5e7eb]/60 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center gap-3 text-sm text-[#1a1a2e]/50 mb-2">
            <Link href="/dashboard" className="hover:text-[#1a1a2e]">Dashboard</Link>
            <span>/</span>
            <span className="text-[#1a1a2e]">Integrations</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[#1a1a2e]">Integrations</h1>
              <p className="mt-1 text-[#1a1a2e]/60">
                Connect Lanework to your existing tools — one click, no setup
              </p>
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
        {/* Quick Connect Card — for first-time setup */}
        {showQuickConnect && connectedCount === 0 && (
          <div className="mb-8 p-6 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a2e] flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-600" />
                  Quick Setup — Get started in 30 seconds
                </h2>
                <p className="mt-1 text-sm text-[#1a1a2e]/60">
                  These are the most popular integrations for logistics teams. Click any to connect instantly.
                </p>
              </div>
              <button onClick={() => setShowQuickConnect(false)} className="text-[#1a1a2e]/30 hover:text-[#1a1a2e]/60">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-4 mt-4">
              {QUICK_CONNECT.map(id => {
                const integ = integrations.find(i => i.id === id);
                if (!integ) return null;
                const IconComp = ICON_MAP[integ.icon] || Zap;
                const isConnected = integ.status === "connected";
                return (
                  <button key={id}
                    disabled={isConnected || connecting === id}
                    onClick={() => handleConnect(id, integ.name)}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border text-center transition-all ${
                      isConnected
                        ? "border-emerald-300 bg-emerald-50 cursor-default"
                        : "border-[#e5e7eb] bg-white hover:border-[#1a1a2e] hover:shadow-md cursor-pointer"
                    }`}>
                    <div className={`grid h-12 w-12 place-items-center rounded-xl ${
                      isConnected ? "bg-emerald-100" : "bg-[#1a1a2e]/5"
                    }`}>
                      {connecting === id
                        ? <Loader2 className="h-5 w-5 text-[#1a1a2e] animate-spin" />
                        : isConnected
                          ? <Check className="h-5 w-5 text-emerald-600" />
                          : <IconComp className="h-5 w-5 text-[#1a1a2e]/70" />
                      }
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#1a1a2e]">{integ.name}</div>
                      <div className="text-xs text-[#1a1a2e]/50 mt-0.5">
                        {isConnected ? "✓ Connected" : "Click to connect"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex gap-1.5">
            {TIERS.map(t => (
              <button key={t.key}
                onClick={() => setActiveTier(t.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTier === t.key ? t.color : "bg-[#1a1a2e]/5 text-[#1a1a2e]/60 hover:bg-[#1a1a2e]/10"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1a1a2e]/30" />
            <input
              type="text" placeholder="Search integrations…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-white border border-[#e5e7eb] text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/30 focus:outline-none focus:border-[#1a1a2e]/40"
            />
          </div>
        </div>

        {/* Integrations Grid — Grouped by Category */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-[#1a1a2e]/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Zap className="h-12 w-12 text-[#1a1a2e]/15 mx-auto" />
            <p className="mt-4 text-[#1a1a2e]/50">No integrations found. Try a different search.</p>
          </div>
        ) : (
          categories.map(cat => {
            const catItems = filtered.filter(i => i.category === cat);
            if (catItems.length === 0) return null;
            return (
              <div key={cat} className="mb-10">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1a1a2e]/40 mb-4">{cat}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {catItems.map(integ => {
                    const IconComp = ICON_MAP[integ.icon] || Zap;
                    const isConnected = integ.status === "connected";
                    const isBusy = connecting === integ.id || disconnecting === integ.id;
                    return (
                      <div key={integ.id}
                        className={`group relative rounded-2xl border p-6 transition-all duration-300 ${
                          isConnected
                            ? "border-emerald-200 bg-emerald-50/30"
                            : "border-[#e5e7eb] bg-white hover:border-[#1a1a2e]/30 hover:shadow-md"
                        }`}>
                        {/* Status dot */}
                        <div className="absolute top-4 right-4">
                          {isConnected ? (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              Connected
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-[#1a1a2e]/30">
                              <div className="h-2 w-2 rounded-full bg-[#1a1a2e]/20" />
                              Available
                            </div>
                          )}
                        </div>

                        <div className={`grid h-12 w-12 place-items-center rounded-xl mb-4 ${
                          isConnected ? "bg-emerald-100" : "bg-[#1a1a2e]/5"
                        }`}>
                          <IconComp className={`h-6 w-6 ${isConnected ? "text-emerald-600" : "text-[#1a1a2e]/60"}`} />
                        </div>

                        <h4 className="font-semibold text-[#1a1a2e]">{integ.name}</h4>
                        <p className="mt-1 text-sm text-[#1a1a2e]/55 leading-relaxed">{integ.desc}</p>

                        <div className="flex items-center gap-2 mt-4">
                          {isConnected ? (
                            <button
                              disabled={isBusy}
                              onClick={() => handleDisconnect(integ.id, integ.name)}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
                              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}
                              Disconnect
                            </button>
                          ) : (
                            <button
                              disabled={isBusy}
                              onClick={() => handleConnect(integ.id, integ.name)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition-all">
                              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                              Connect
                            </button>
                          )}
                        </div>
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
