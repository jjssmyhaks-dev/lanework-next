"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search, Zap, FileSpreadsheet, MessageCircle, Globe,
  Rocket, Calculator, FileCheck, CreditCard, Building, MapPin, ShoppingCart,
  ShoppingBag, Package, Truck, Navigation, Activity, Check,
  Loader2, Upload, Download, Wifi, WifiOff, Plus, X,
  Sheet, Settings, RefreshCw, BarChart3, Send, Eye, Play,
  ChevronDown, ChevronUp, HelpCircle, Copy, Phone, ArrowRight,
  MapPinHouse, Clock, IndianRupee, FileText, AlertCircle, BadgeCheck,
  Key, Link2, SheetIcon
} from "lucide-react";

type Integration = {
  id: string; tier: number; name: string; category: string; desc: string;
  icon: string; docsUrl: string; configFields: string[];
  status: "connected" | "disconnected"; connectedAt?: string; config?: any;
};

// ─── Integration credential schemas — what fields each integration needs ───
const CREDENTIAL_FIELDS: Record<string, { label: string; placeholder: string; key: string; help: string }[]> = {
  shiprocket: [
    { label: "Email", placeholder: "your-email@example.com", key: "email", help: "The email you use to login to Shiprocket" },
    { label: "Password", placeholder: "Your Shiprocket password", key: "password", help: "Your Shiprocket account password" },
  ],
  whatsapp: [
    { label: "Phone Number ID", placeholder: "123456789012345", key: "phone_number_id", help: "From WhatsApp Business → Settings → API Setup" },
    { label: "Access Token", placeholder: "EAA...", key: "access_token", help: "From WhatsApp → System Users → Generate Token" },
  ],
  tally_prime: [
    { label: "Tally REST URL", placeholder: "http://192.168.1.100:9000", key: "rest_url", help: "Open TallyPrime → press Ctrl+Alt+R → copy the URL shown" },
    { label: "Company Name", placeholder: "Your Company Name", key: "company", help: "The company name as it appears in TallyPrime" },
  ],
  gstn_eway_bill: [
    { label: "GSTIN", placeholder: "27AABCG2196N1Z1", key: "gstin", help: "Your 15-character GST registration number" },
    { label: "Username", placeholder: "ewb-username", key: "username", help: "Your e-way bill portal username" },
    { label: "Password", placeholder: "Your password", key: "password", help: "Your e-way bill portal password" },
  ],
  razorpay: [
    { label: "Key ID", placeholder: "rzp_live_...", key: "key_id", help: "From Razorpay Dashboard → Settings → API Keys" },
    { label: "Key Secret", placeholder: "••••••••", key: "key_secret", help: "From Razorpay Dashboard → Settings → API Keys" },
  ],
  google_sheets: [
    { label: "Google Sheet Link", placeholder: "https://docs.google.com/spreadsheets/d/...", key: "sheet_url", help: "Open your Google Sheet → click Share → 'Anyone with link can edit' → copy the URL" },
  ],
  generic_webhook: [
    { label: "Your Software Name", placeholder: "e.g. MyERP, MyTMS", key: "source_name", help: "Name of the software sending data to Lanework" },
  ],
  fedex: [
    { label: "API Key", placeholder: "l1234...", key: "api_key", help: "From FedEx Developer Portal" },
    { label: "Secret Key", placeholder: "••••••••", key: "secret_key", help: "From FedEx Developer Portal" },
    { label: "Account Number", placeholder: "123456789", key: "account_number", help: "Your FedEx account number" },
  ],
  shopify: [
    { label: "Store URL", placeholder: "https://my-store.myshopify.com", key: "store_url", help: "Your Shopify store address" },
    { label: "Access Token", placeholder: "shpat_...", key: "access_token", help: "From Shopify Admin → Settings → Apps → Develop apps → API credentials" },
  ],
  mapmyindia: [
    { label: "License Key", placeholder: "••••••••", key: "license_key", help: "From mapmyindia.com → Dashboard → API Keys" },
  ],
  csv_import: [
    { label: "No credentials needed — just upload your file", placeholder: "", key: "_none", help: "Click Download Template, fill your data, then upload." },
  ],
};

// ─── Benefit & setup text ───
const PLAIN_SPEAK: Record<string, { benefit: string; setupHelp: string }> = {
  shiprocket: {
    benefit: "Ship orders across India using BlueDart, Delhivery, DTDC, and more — all from one place",
    setupHelp: "Enter your Shiprocket email and password to connect.",
  },
  whatsapp: {
    benefit: "Send automatic delivery updates to your customers on WhatsApp",
    setupHelp: "Enter your WhatsApp Business credentials to send automated messages.",
  },
  tally_prime: {
    benefit: "Keep your stock levels in sync with your TallyPrime accounting automatically",
    setupHelp: "Enter your TallyPrime REST API URL to sync inventory and orders.",
  },
  gstn_eway_bill: {
    benefit: "Generate e-way bills directly when you create shipments — no need to log into the GST portal separately",
    setupHelp: "Enter your GSTIN and e-way bill portal credentials.",
  },
  razorpay: {
    benefit: "Accept UPI, cards, and net banking payments. Track COD settlements.",
    setupHelp: "Enter your Razorpay API keys to enable payments and reconciliation.",
  },
  google_sheets: {
    benefit: "Connect your Google Sheets — data flows automatically both ways",
    setupHelp: "Paste your Google Sheet link below. Make sure sharing is set to 'Anyone with link can edit'.",
  },
  generic_webhook: {
    benefit: "Get data from any other software — TMS, WMS, ERP, or custom tools",
    setupHelp: "Give your software a name. Lanework will generate a webhook URL you can paste into that software.",
  },
  fedex: {
    benefit: "Ship internationally with FedEx — track packages, get rates, print labels",
    setupHelp: "Enter your FedEx API credentials from the Developer Portal.",
  },
  shopify: {
    benefit: "Auto-import orders from your Shopify store for fulfillment",
    setupHelp: "Enter your Shopify store URL and Admin API access token.",
  },
  mapmyindia: {
    benefit: "Plan delivery routes, find addresses, calculate distances across India",
    setupHelp: "Enter your MapmyIndia license key.",
  },
  csv_import: {
    benefit: "Upload your Excel or CSV files — shipments, inventory, or orders all at once",
    setupHelp: "No setup needed. Just download our template, fill your data, and upload.",
  },
  csv_export: {
    benefit: "Export any data from Lanework to Excel for your records or reports",
    setupHelp: "No setup needed. Click to export any data you need.",
  },
};

// ─── Action labels in plain language ───
const ACTIONS_MAP: Record<string, { label: string; icon: any; desc: string; action: string; resultParser?: (data: any) => string }[]> = {
  shiprocket: [
    { label: "Find a package", icon: Search, desc: "Enter a tracking number to see where your package is right now", action: "track_shipment",
      resultParser: (d: any) => d.shipments?.[0]
        ? `📦 ${d.shipments[0].tracking_number} · ${d.shipments[0].carrier} · Status: **${(d.shipments[0].status || "unknown").replace(/_/g, " ")}**`
        : "📦 Tracking loaded" },
    { label: "Compare delivery prices", icon: IndianRupee, desc: "See which courier gives the best rate", action: "compare_rates" },
    { label: "Create a new shipment", icon: Plus, desc: "Book a delivery — we'll find the best courier", action: "create_shipment" },
    { label: "Import tracking numbers", icon: Upload, desc: "Upload Excel with tracking numbers", action: "bulk_awb" },
  ],
  whatsapp: [
    { label: "Send a test message", icon: Send, desc: "Verify WhatsApp setup", action: "send_test" },
    { label: "Set notification rules", icon: Settings, desc: "Choose which events trigger messages", action: "notification_rules" },
    { label: "View message history", icon: Clock, desc: "See all sent messages", action: "message_log" },
  ],
  tally_prime: [
    { label: "Update stock levels", icon: RefreshCw, desc: "Pull latest inventory from TallyPrime", action: "sync_inventory" },
    { label: "Send orders to Tally", icon: Upload, desc: "Push completed orders as sales entries", action: "push_orders" },
    { label: "Check stock level", icon: Package, desc: "Quick stock check for any item", action: "check_stock",
      resultParser: (d: any) => d.sku ? `📦 ${d.name || d.sku}: **${d.qty}** in stock${d.needsReorder ? " ⚠️ Reorder!" : ""}` : "Stock checked" },
  ],
  gstn_eway_bill: [
    { label: "Create e-way bill", icon: FileText, desc: "Generate from shipment data", action: "generate_ewb" },
    { label: "Verify GST number", icon: BadgeCheck, desc: "Check if GSTIN is valid", action: "validate_gstin" },
    { label: "View e-way bills", icon: Eye, desc: "See all generated bills", action: "view_ewb" },
  ],
  razorpay: [
    { label: "Reconcile payments", icon: RefreshCw, desc: "Match COD with settlements", action: "reconcile" },
    { label: "View transactions", icon: BarChart3, desc: "See all payments", action: "view_transactions" },
    { label: "Send payment link", icon: Send, desc: "Share with a customer", action: "send_link" },
  ],
  google_sheets: [
    { label: "Sync with Sheets now", icon: RefreshCw, desc: "Pull latest data from your sheet", action: "sync_sheet" },
    { label: "Export to Sheets", icon: Upload, desc: "Push Lanework data to your sheet", action: "export_sheet" },
    { label: "Map your columns", icon: Settings, desc: "Match sheet columns to data fields", action: "configure_sheet" },
  ],
  generic_webhook: [
    { label: "Copy connection URL", icon: Copy, desc: "Get URL for your other software", action: "copy_webhook" },
    { label: "Test connection", icon: Play, desc: "Verify data is flowing", action: "test_webhook" },
    { label: "View received data", icon: Eye, desc: "See incoming events", action: "view_log" },
  ],
  csv_import: [
    { label: "Upload a file", icon: Upload, desc: "Upload CSV or Excel", action: "upload_csv" },
    { label: "Download template", icon: Download, desc: "Pre-formatted template", action: "download_template" },
    { label: "View last upload", icon: Eye, desc: "Recent import results", action: "view_history" },
  ],
  csv_export: [
    { label: "Export shipments", icon: Download, desc: "Download as Excel", action: "export_shipments" },
    { label: "Export inventory", icon: Download, desc: "Download as Excel", action: "export_inventory" },
  ],
  fedex: [
    { label: "Track a package", icon: Search, desc: "FedEx tracking number", action: "track_shipment" },
    { label: "Get shipping rates", icon: IndianRupee, desc: "FedEx route rates", action: "get_rates" },
    { label: "Create shipment", icon: Plus, desc: "Book FedEx shipment", action: "create_shipment" },
  ],
  shopify: [
    { label: "Import orders", icon: Download, desc: "Pull new orders", action: "sync_orders" },
    { label: "Update inventory", icon: RefreshCw, desc: "Push stock to Shopify", action: "sync_inventory" },
  ],
  mapmyindia: [
    { label: "Find address", icon: MapPin, desc: "Convert to coordinates", action: "geocode" },
    { label: "Plan route", icon: Navigation, desc: "Fastest delivery path", action: "optimize_route" },
    { label: "Calculate distances", icon: MapPinHouse, desc: "Between locations", action: "distance_matrix" },
  ],
};

const ICON_MAP: Record<string, any> = {
  "file-spreadsheet": FileSpreadsheet, download: Download, "message-circle": MessageCircle,
  sheet: Sheet, webhook: Globe, rocket: Rocket, calculator: Calculator,
  "file-check": FileCheck, "credit-card": CreditCard, building: Building,
  "map-pin": MapPin, "shopping-cart": ShoppingCart, "shopping-bag": ShoppingBag,
  package: Package, truck: Truck, navigation: Navigation, activity: Activity,
};

const CATEGORY_LABELS: Record<string, { label: string; icon: any; desc: string }> = {
  "Carrier Aggregator": { label: "Shipping & Delivery", icon: Truck, desc: "Send packages across India and internationally" },
  "Communication": { label: "Customer Messaging", icon: MessageCircle, desc: "Keep customers updated via WhatsApp" },
  "Accounting": { label: "Accounting & Books", icon: Calculator, desc: "Sync with your accounting software" },
  "Compliance": { label: "GST & Compliance", icon: FileCheck, desc: "Handle e-way bills and GST" },
  "Payments": { label: "Payments", icon: CreditCard, desc: "Accept and track payments" },
  "Data Sync": { label: "Spreadsheets & Data", icon: Sheet, desc: "Connect Excel and Google Sheets" },
  "API / Webhook": { label: "Other Software", icon: Globe, desc: "Connect any webhook-enabled tool" },
  "Route Planning": { label: "Maps & Routes", icon: MapPin, desc: "Plan routes and find addresses" },
  "Data Import": { label: "Import Data", icon: Upload, desc: "Bring data into Lanework" },
  "Data Export": { label: "Export Data", icon: Download, desc: "Download as Excel files" },
  "E-Commerce": { label: "Online Store", icon: ShoppingCart, desc: "Connect your online store" },
  "Fleet Telematics": { label: "Vehicles & Fleet", icon: Truck, desc: "Track vehicles and fleet" },
  "Maps / Routing": { label: "Maps & Routing", icon: MapPin, desc: "Delivery route planning" },
  "ERP": { label: "Enterprise (ERP)", icon: Building, desc: "Connect SAP and enterprise tools" },
};

export default function IntegrationsDashboard() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const [actionRunning, setActionRunning] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ raw: any; parsed: string } | null>(null);
  const [connectForm, setConnectForm] = useState<{ id: string; fields: Record<string, string> } | null>(null);

  useEffect(() => { fetchIntegrations(); }, []);
  const fetchIntegrations = async () => {
    setLoading(true);
    try { const data = await (await fetch("/api/integrations")).json(); setIntegrations(data.integrations || []); } catch {}
    setLoading(false);
  };

  const flash = (text: string, type: "success" | "error") => {
    setToast({ text, type }); setTimeout(() => setToast(null), 3500);
  };

  const handleConnect = async (id: string, name: string, credentials?: Record<string, string>) => {
    setConnecting(id);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: id, config: credentials || {} }),
      });
      const data = await res.json();
      if (data.success) {
        flash(`${name} connected!`, "success");
        setConnectForm(null);
        setExpandedIntegration(id);
      } else {
        flash(data.error || "Couldn't connect.", "error");
      }
      fetchIntegrations();
    } catch { flash("Connection failed — check your internet.", "error"); }
    setConnecting(null);
  };

  const handleDisconnect = async (id: string, name: string) => {
    setDisconnecting(id);
    try {
      await fetch(`/api/integrations/${id}`, { method: "DELETE" });
      flash(`${name} disconnected.`, "success");
      setExpandedIntegration(null);
      fetchIntegrations();
    } catch { flash("Couldn't disconnect.", "error"); }
    setDisconnecting(null);
  };

  const handleAction = async (integrationId: string, action: string, label: string, parser?: (data: any) => string) => {
    setActionRunning(action);
    setActionResult(null);
    try {
      const res = await fetch(`/api/integrations/${integrationId}/action`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      const parsed = parser ? parser(data) : (data.success ? `✅ ${label} completed` : `⚠️ ${label} ran with notes`);
      setActionResult({ raw: data, parsed });
      flash(`${label} done!`, data.success ? "success" : "error");
    } catch {
      flash(`Couldn't complete ${label}.`, "error");
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
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#e5e7eb]/60 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center gap-3 text-sm text-[#1a1a2e]/50 mb-2">
            <Link href="/dashboard" className="hover:text-[#1a1a2e]">Home</Link><span>/</span><span className="text-[#1a1a2e]">Connections</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[#1a1a2e]">Connections</h1>
              <p className="mt-1 text-[#1a1a2e]/60">Connect the tools you already use. Click Connect, enter your details, and you're set.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a2e]/5 text-sm text-[#1a1a2e]/70">
              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-semibold text-emerald-600">{connectedCount}</span>
              <span>connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {connectedCount === 0 && (
          <div className="mb-8 p-8 rounded-2xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-emerald-100"><Zap className="h-7 w-7 text-emerald-600" /></div>
              <div>
                <h2 className="text-xl font-semibold text-[#1a1a2e]">Welcome! Connect your first tool.</h2>
                <p className="mt-2 text-[#1a1a2e]/60 max-w-2xl">
                  Click <strong>Connect</strong> on any card below, enter your login details for that service, and Lanework handles the rest.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1a1a2e]/30" />
            <input type="text" aria-label="Search integrations" placeholder="Search for a tool…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-white border border-[#e5e7eb] text-sm placeholder:text-[#1a1a2e]/30 focus:outline-none focus:border-emerald-400" />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({length:6}).map((_,i)=>(<div key={i} className="h-44 rounded-2xl bg-[#1a1a2e]/5 animate-pulse" />))}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20"><Search className="h-14 w-14 text-[#1a1a2e]/10 mx-auto" /><p className="mt-4 text-[#1a1a2e]/50 text-lg">No tools found.</p></div>
        ) : (
          categories.map(cat => {
            const catItems = filtered.filter(i => i.category === cat);
            if (catItems.length === 0) return null;
            const catMeta = CATEGORY_LABELS[cat] || { label: cat, icon: Zap, desc: "" };
            const CatIcon = catMeta.icon;
            return (
              <div key={cat} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#1a1a2e]/5"><CatIcon className="h-4 w-4 text-[#1a1a2e]/60" /></div>
                  <div><h3 className="text-sm font-semibold text-[#1a1a2e]">{catMeta.label}</h3><p className="text-xs text-[#1a1a2e]/40">{catMeta.desc}</p></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {catItems.map(integ => {
                    const ICO = ICON_MAP[integ.icon] || Zap;
                    const isConnected = integ.status === "connected";
                    const isBusy = connecting === integ.id || disconnecting === integ.id;
                    const isExpanded = expandedIntegration === integ.id;
                    const isConnectForm = connectForm?.id === integ.id;
                    const plainInfo = PLAIN_SPEAK[integ.id];
                    const credFields = CREDENTIAL_FIELDS[integ.id];
                    const actions = ACTIONS_MAP[integ.id] || [];
                    const hasActions = actions.length > 0;

                    return (
                      <div key={integ.id}>
                        {/* Main card */}
                        <div className={`group relative rounded-2xl border transition-all duration-300 ${
                          isConnected
                            ? `border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white ${isExpanded ? "ring-2 ring-emerald-400 shadow-lg" : "cursor-pointer hover:border-emerald-400 hover:shadow-md"}`
                            : "border-[#e5e7eb] bg-white hover:border-[#1a1a2e]/30 hover:shadow-md"
                        }`}>
                          <div className="absolute top-4 right-4 flex items-center gap-1.5">
                            {isConnected ? (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Connected</div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-[#1a1a2e]/35 bg-[#1a1a2e]/5 px-2 py-1 rounded-full"><div className="h-1.5 w-1.5 rounded-full bg-[#1a1a2e]/20" />Available</div>
                            )}
                          </div>

                          <div onClick={() => isConnected && hasActions && setExpandedIntegration(isExpanded ? null : integ.id)}
                            className={`p-6 ${isConnected && hasActions ? "cursor-pointer" : ""}`}>
                            <div className={`grid h-12 w-12 place-items-center rounded-xl mb-4 ${isConnected ? "bg-emerald-100" : "bg-[#1a1a2e]/5"}`}>
                              <ICO className={`h-6 w-6 ${isConnected ? "text-emerald-600" : "text-[#1a1a2e]/60"}`} />
                            </div>
                            <h4 className="font-semibold text-[#1a1a2e]">{integ.name}</h4>
                            <p className="mt-1.5 text-sm text-[#1a1a2e]/55 leading-relaxed">{plainInfo?.benefit || integ.desc}</p>

                            <div className="flex items-center gap-2 mt-4">
                              {isConnected ? (
                                <div className="flex items-center gap-2">
                                  {hasActions ? (
                                    <button onClick={() => setExpandedIntegration(isExpanded ? null : integ.id)}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-all">
                                      {isExpanded ? "Close" : "Use this tool"}
                                    </button>
                                  ) : (
                                    <span className="text-sm text-emerald-600 font-medium">Connected ✓</span>
                                  )}
                                  <button disabled={isBusy} onClick={(e) => { e.stopPropagation(); handleDisconnect(integ.id, integ.name); }}
                                    className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600 disabled:opacity-50">
                                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}Disconnect
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button disabled={isBusy} onClick={() => setConnectForm(isConnectForm ? null : { id: integ.id, fields: {} })}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition-all">
                                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Connect
                                  </button>
                                </div>
                              )}
                            </div>
                            {isConnected && integ.connectedAt && (
                              <p className="mt-2 text-xs text-[#1a1a2e]/30">
                                Connected {new Date(integ.connectedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* CONNECT FORM — shows input fields for credentials */}
                        {isConnectForm && !isConnected && credFields && (
                          <div className="mt-2 p-6 rounded-2xl border border-blue-200 bg-white shadow-sm animate-fade-in">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-semibold text-[#1a1a2e] flex items-center gap-2">
                                  <Key className="h-5 w-5 text-blue-600" />Connect {integ.name}
                                </h4>
                                <p className="text-sm text-[#1a1a2e]/60 mt-1">{plainInfo?.setupHelp}</p>
                              </div>
                              <button onClick={() => setConnectForm(null)} className="text-[#1a1a2e]/30 hover:text-[#1a1a2e]/60"><X className="h-4 w-4" /></button>
                            </div>

                            {credFields[0]?.key === "_none" ? (
                              /* No-credentials integrations */
                              <div className="mb-4">
                                <p className="text-sm text-[#1a1a2e]/60 mb-3">{credFields[0].label}</p>
                                <button disabled={isBusy} onClick={() => handleConnect(integ.id, integ.name)}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Connect now
                                </button>
                              </div>
                            ) : (
                              /* Credential fields */
                              <div className="space-y-4 mb-5">
                                {credFields.map((f, i) => (
                                  <div key={f.key}>
                                    <label className="block text-sm font-medium text-[#1a1a2e] mb-1">{f.label}</label>
                                    <input
                                      autoFocus={i === 0}
                                      type={f.key.includes("password") || f.key.includes("secret") || f.key.includes("token") ? "password" : "text"}
                                      placeholder={f.placeholder}
                                      className="w-full px-4 py-2.5 rounded-xl border border-[#e5e7eb] bg-[#fafafa] text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                                      onChange={e => setConnectForm(prev => prev ? { ...prev, fields: { ...prev.fields, [f.key]: e.target.value } } : null)}
                                      onKeyDown={e => { if (e.key === "Enter") handleConnect(integ.id, integ.name, connectForm?.fields); }}
                                    />
                                    <p className="text-xs text-[#1a1a2e]/40 mt-1">{f.help}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {credFields[0]?.key !== "_none" && (
                              <div className="flex items-center gap-3">
                                <button disabled={isBusy} onClick={() => handleConnect(integ.id, integ.name, connectForm?.fields)}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Connect
                                </button>
                                <button onClick={() => handleConnect(integ.id, integ.name)}
                                  className="text-sm text-[#1a1a2e]/30 hover:text-[#1a1a2e]/50 underline">Skip — connect without credentials</button>
                              </div>
                            )}
                            <p className="mt-3 text-xs text-[#1a1a2e]/30">🔒 Your credentials are stored securely and only used for this integration.</p>
                          </div>
                        )}

                        {/* Expanded Action Panel */}
                        {isExpanded && isConnected && hasActions && (
                          <div className="mt-2 p-5 rounded-2xl border border-emerald-200 bg-white shadow-sm animate-fade-in">
                            <h4 className="text-sm font-semibold text-[#1a1a2e] mb-1">What would you like to do?</h4>
                            <p className="text-xs text-[#1a1a2e]/50 mb-4">Click any option. Your {integ.name} account is connected.</p>
                            <div className="grid gap-3 md:grid-cols-2">
                              {actions.map(act => {
                                const AIC = act.icon;
                                const running = actionRunning === act.action;
                                return (
                                  <button key={act.action} disabled={!!actionRunning}
                                    onClick={() => handleAction(integ.id, act.action, act.label, act.resultParser)}
                                    className="flex items-start gap-4 p-4 rounded-xl border border-[#e5e7eb] hover:border-emerald-400 hover:bg-emerald-50/30 transition-all text-left disabled:opacity-50 group">
                                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 mt-0.5 group-hover:bg-emerald-100 transition-colors">
                                      {running ? <Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> : <AIC className="h-5 w-5 text-emerald-600" />}
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
                              <div className={`mt-4 p-4 rounded-xl border ${actionResult.raw?.success ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                                <div className="flex items-center gap-2 mb-2">
                                  {actionResult.raw?.success ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                                  <span className="text-xs font-semibold text-[#1a1a2e]/60">Result</span>
                                </div>
                                <p className="text-sm text-[#1a1a2e]/80">{actionResult.parsed}</p>
                              </div>
                            )}
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
