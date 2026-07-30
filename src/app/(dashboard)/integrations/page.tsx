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
  MapPinHouse, Clock, IndianRupee, FileText, AlertCircle, BadgeCheck
} from "lucide-react";

type Integration = {
  id: string; tier: number; name: string; category: string; desc: string;
  icon: string; docsUrl: string; configFields: string[];
  status: "connected" | "disconnected"; connectedAt?: string; config?: any;
};

// ─── User-friendly descriptions & action labels ───
const PLAIN_SPEAK: Record<string, { benefit: string; setupHelp: string; setupSteps: string[]; helpLink?: string }> = {
  shiprocket: {
    benefit: "Ship orders across India using BlueDart, Delhivery, DTDC, and more — all from one place",
    setupHelp: "You'll need your Shiprocket login email and password. Find these in your Shiprocket account settings.",
    setupSteps: ["Login to your Shiprocket account", "Go to Settings → API", "Copy your Email and Password", "Paste them below"],
  },
  whatsapp: {
    benefit: "Send automatic delivery updates to your customers on WhatsApp",
    setupHelp: "You'll need a WhatsApp Business account. We'll guide you through connecting it.",
    setupSteps: ["Open your WhatsApp Business account", "Go to Settings → Business Tools → API", "Copy the Phone Number ID and Access Token", "Paste them below"],
  },
  tally_prime: {
    benefit: "Keep your stock levels in sync with your TallyPrime accounting automatically",
    setupHelp: "You'll need TallyPrime running on your office computer with the REST API enabled.",
    setupSteps: ["Open TallyPrime on your office computer", "Press Ctrl+Alt+R to enable REST API", "Copy the local URL (usually http://localhost:9000)", "Paste it below"],
  },
  gstn_eway_bill: {
    benefit: "Generate e-way bills directly when you create shipments — no need to log into the GST portal separately",
    setupHelp: "You'll need your GSTIN credentials registered on the e-way bill portal.",
    setupSteps: ["Go to ewaybillgst.gov.in and login", "Go to API Registration", "Generate API credentials", "Copy your Client ID and Secret"],
  },
  razorpay: {
    benefit: "Accept UPI, cards, and net banking payments from customers. Track COD payments and settlements.",
    setupHelp: "You'll need a Razorpay account. Sign up is free and takes 2 minutes.",
    setupSteps: ["Go to razorpay.com and create an account", "Complete KYC verification", "Go to Settings → API Keys", "Copy Key ID and Key Secret"],
  },
  google_sheets: {
    benefit: "Connect your existing Excel or Google Sheets spreadsheets — data flows automatically both ways",
    setupHelp: "You'll need a Google account and the Google Sheet you want to connect.",
    setupSteps: ["Open your Google Sheet", "Click Share (top right)", "Set sharing to 'Anyone with link can edit'", "Paste the sheet link below"],
  },
  generic_webhook: {
    benefit: "Get data from any other software you use — TMS, WMS, ERP, or custom tools",
    setupHelp: "We'll give you a URL. Paste it into your other software's webhook/integration settings.",
    setupSteps: ["Copy the webhook URL we generate for you", "Open your other software's settings", "Find 'Webhooks' or 'API' section", "Paste the URL there"],
  },
  fedex: {
    benefit: "Ship internationally with FedEx — track packages, get rates, and print labels",
    setupHelp: "You'll need a FedEx developer account and API credentials.",
    setupSteps: ["Go to FedEx Developer Portal", "Create a new project", "Get your API Key and Secret Key", "Also copy your Account Number"],
  },
  shopify: {
    benefit: "Automatically import orders from your Shopify store into Lanework for fulfillment",
    setupHelp: "You'll need your Shopify store URL and admin access.",
    setupSteps: ["Login to your Shopify admin", "Go to Settings → Apps → Develop apps", "Create a new app with order read/write access", "Copy the Admin API token"],
  },
  mapmyindia: {
    benefit: "Plan delivery routes, calculate distances, and find exact addresses across India",
    setupHelp: "You'll need a MapmyIndia API key. Sign up is free for basic usage.",
    setupSteps: ["Go to mapmyindia.com and sign up", "Go to Dashboard → API Keys", "Copy your API key", "Paste it below"],
  },
  csv_import: {
    benefit: "Upload your existing Excel or CSV files — shipments, inventory, or orders all at once",
    setupHelp: "No setup needed! Just prepare your file and upload it.",
    setupSteps: ["Download our template (click below)", "Fill in your data", "Upload the file"],
  },
  csv_export: {
    benefit: "Export any data from Lanework to Excel for your own records or reports",
    setupHelp: "No setup needed! Just click to export any data you need.",
    setupSteps: ["Choose what data you want", "Click Export", "Open the downloaded file in Excel"],
  },
};

// ─── Action labels in plain language ───
const ACTIONS_MAP: Record<string, { label: string; icon: any; desc: string; action: string; resultParser?: (data: any) => string }[]> = {
  shiprocket: [
    { label: "Find a package", icon: Search, desc: "Enter a tracking number to see where your package is right now", action: "track_shipment",
      resultParser: (d: any) => d.shipments?.[0]
        ? `📦 Package **${d.shipments[0].tracking_number}** · ${d.shipments[0].carrier} · Status: **${(d.shipments[0].status || "unknown").replace(/_/g, " ")}** · Going to ${JSON.parse(d.shipments[0].destination || "{}").city || "destination"}`
        : `📦 Tracking results loaded` },
    { label: "Compare delivery prices", icon: IndianRupee, desc: "See which courier gives the best rate for your route and weight", action: "compare_rates" },
    { label: "Create a new shipment", icon: Plus, desc: "Book a delivery — we'll find the best courier for your budget", action: "create_shipment" },
    { label: "Import tracking numbers", icon: Upload, desc: "Upload an Excel file with multiple tracking numbers to track all at once", action: "bulk_awb" },
  ],
  whatsapp: [
    { label: "Send a test message", icon: Send, desc: "Send a sample WhatsApp message to check everything's working", action: "send_test" },
    { label: "Set notification rules", icon: Settings, desc: "Choose which events send WhatsApp updates — pickup, transit, delivery", action: "notification_rules" },
    { label: "View message history", icon: Clock, desc: "See all WhatsApp messages sent to customers and their status", action: "message_log" },
  ],
  tally_prime: [
    { label: "Update stock levels", icon: RefreshCw, desc: "Pull the latest inventory counts from TallyPrime", action: "sync_inventory",
      resultParser: (d: any) => d.items ? `✅ Updated ${d.items.length} items from TallyPrime` : `✅ Inventory sync completed` },
    { label: "Send orders to Tally", icon: Upload, desc: "Push completed orders from Lanework to Tally as sales entries", action: "push_orders" },
    { label: "Check an account", icon: Eye, desc: "Look up any ledger or account balance in TallyPrime", action: "check_ledger" },
    { label: "Check stock level", icon: Package, desc: "Quickly check how much stock you have for any item", action: "check_stock",
      resultParser: (d: any) => d.sku ? `📦 ${d.name || d.sku}: **${d.qty}** units in stock${d.needsReorder ? " ⚠️ Time to reorder!" : ""}` : `Stock check completed` },
  ],
  gstn_eway_bill: [
    { label: "Create e-way bill", icon: FileText, desc: "Generate a new e-way bill from a shipment or invoice", action: "generate_ewb" },
    { label: "Verify a GST number", icon: BadgeCheck, desc: "Check if a customer's GSTIN is valid and active", action: "validate_gstin" },
    { label: "View all e-way bills", icon: Eye, desc: "See every e-way bill you've generated and their current status", action: "view_ewb" },
  ],
  razorpay: [
    { label: "Reconcile payments", icon: RefreshCw, desc: "Match your COD collections with Razorpay settlements", action: "reconcile" },
    { label: "View transactions", icon: BarChart3, desc: "See all payments received and pending", action: "view_transactions" },
    { label: "Send payment link", icon: Send, desc: "Share a payment link with a customer via SMS or WhatsApp", action: "send_link" },
  ],
  google_sheets: [
    { label: "Sync with Sheets now", icon: RefreshCw, desc: "Pull the latest data from your connected Google Sheet", action: "sync_sheet" },
    { label: "Export data to Sheets", icon: Upload, desc: "Push Lanework data to your Google Sheet", action: "export_sheet" },
    { label: "Map your columns", icon: Settings, desc: "Tell us which spreadsheet columns match which fields", action: "configure_sheet" },
  ],
  generic_webhook: [
    { label: "Copy connection URL", icon: Copy, desc: "Get the URL to paste into your other software", action: "copy_webhook" },
    { label: "Test connection", icon: Play, desc: "Send a test to verify data is flowing correctly", action: "test_webhook" },
    { label: "View received data", icon: Eye, desc: "See all data that has come in through this connection", action: "view_log" },
  ],
  csv_import: [
    { label: "Upload a file", icon: Upload, desc: "Upload your CSV or Excel file with shipment or inventory data", action: "upload_csv" },
    { label: "Download template", icon: Download, desc: "Get a blank template with the correct column headers", action: "download_template" },
    { label: "View last upload", icon: Eye, desc: "See what was imported last time and fix any errors", action: "view_history" },
  ],
  csv_export: [
    { label: "Export shipments", icon: Download, desc: "Download all your shipment data as Excel", action: "export_shipments" },
    { label: "Export inventory", icon: Download, desc: "Download stock levels as Excel", action: "export_inventory" },
    { label: "Export orders", icon: Download, desc: "Download order data as Excel", action: "export_orders" },
  ],
  fedex: [
    { label: "Track a package", icon: Search, desc: "Enter a FedEx tracking number to find your package", action: "track_shipment" },
    { label: "Get shipping rates", icon: IndianRupee, desc: "See FedEx rates for your route and weight", action: "get_rates" },
    { label: "Create shipment", icon: Plus, desc: "Book a FedEx shipment and print labels", action: "create_shipment" },
  ],
  shopify: [
    { label: "Import orders", icon: Download, desc: "Pull all new orders from your Shopify store", action: "sync_orders" },
    { label: "Update inventory", icon: RefreshCw, desc: "Push stock levels from Lanework back to Shopify", action: "sync_inventory" },
    { label: "View products", icon: Eye, desc: "See all Shopify products linked to your inventory", action: "list_products" },
  ],
  mapmyindia: [
    { label: "Find address coordinates", icon: MapPin, desc: "Convert any Indian address to GPS coordinates", action: "geocode" },
    { label: "Plan best route", icon: Navigation, desc: "Find the fastest route with multiple delivery stops", action: "optimize_route" },
    { label: "Calculate distances", icon: MapPinHouse, desc: "Get time and distance between multiple locations", action: "distance_matrix" },
  ],
};

const ICON_MAP: Record<string, any> = {
  "file-spreadsheet": FileSpreadsheet, download: Download, "message-circle": MessageCircle,
  sheet: Sheet, webhook: Globe, rocket: Rocket, calculator: Calculator,
  "file-check": FileCheck, "credit-card": CreditCard, building: Building,
  "map-pin": MapPin, "shopping-cart": ShoppingCart, "shopping-bag": ShoppingBag,
  package: Package, truck: Truck, navigation: Navigation, activity: Activity,
};

const QUICK_CONNECT = ["shiprocket", "whatsapp", "tally_prime", "google_sheets"];

// Categories in plain language with better grouping
const CATEGORY_LABELS: Record<string, { label: string; icon: any; desc: string }> = {
  "Carrier Aggregator": { label: "Shipping & Delivery", icon: Truck, desc: "Send packages across India and internationally" },
  "Communication": { label: "Customer Messaging", icon: MessageCircle, desc: "Keep customers updated via WhatsApp" },
  "Accounting": { label: "Accounting & Books", icon: Calculator, desc: "Sync with your accounting software" },
  "Compliance": { label: "GST & Compliance", icon: FileCheck, desc: "Handle e-way bills and GST requirements" },
  "Payments": { label: "Payments", icon: CreditCard, desc: "Accept and track customer payments" },
  "Data Sync": { label: "Spreadsheets & Data", icon: Sheet, desc: "Connect Excel and Google Sheets" },
  "API / Webhook": { label: "Other Software", icon: Globe, desc: "Connect any software that supports webhooks" },
  "Route Planning": { label: "Maps & Routes", icon: MapPin, desc: "Plan delivery routes and find addresses" },
  "Data Import": { label: "Import Data", icon: Upload, desc: "Bring your existing data into Lanework" },
  "Data Export": { label: "Export Data", icon: Download, desc: "Download your data as Excel files" },
  "E-commerce": { label: "Online Store", icon: ShoppingCart, desc: "Connect your online store" },
  "Fleet Management": { label: "Vehicles & Fleet", icon: Truck, desc: "Track vehicles and manage your fleet" },
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
  const [showSetupWizard, setShowSetupWizard] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState(0);

  useEffect(() => { fetchIntegrations(); }, []);
  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch {}
    setLoading(false);
  };

  const flash = (text: string, type: "success" | "error") => {
    setToast({ text, type }); setTimeout(() => setToast(null), 3500);
  };

  const handleConnect = async (id: string, name: string) => {
    setConnecting(id);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: id, config: {} }),
      });
      const data = await res.json();
      if (data.success) {
        flash(`${name} is now connected! 🎉`, "success");
        setShowSetupWizard(null);
        setExpandedIntegration(id);
      } else {
        flash(data.error || "Couldn't connect. Please try again.", "error");
      }
      fetchIntegrations();
    } catch { flash("Connection failed — check your internet and try again.", "error"); }
    setConnecting(null);
  };

  const handleDisconnect = async (id: string, name: string) => {
    setDisconnecting(id);
    try {
      await fetch(`/api/integrations/${id}`, { method: "DELETE" });
      flash(`${name} has been disconnected.`, "success");
      setExpandedIntegration(null);
      fetchIntegrations();
    } catch { flash("Couldn't disconnect. Please try again.", "error"); }
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
      const parsed = parser ? parser(data) : (data.success ? `✅ ${label} completed successfully.` : `⚠️ ${label} ran with some issues.`);
      setActionResult({ raw: data, parsed });
      flash(`${label} done!`, data.success ? "success" : "error");
    } catch {
      flash(`Couldn't complete ${label}. Is ${integrationId} configured with your account details?`, "error");
    }
    setActionRunning(null);
  };

  const openSetupWizard = (id: string) => {
    setShowSetupWizard(id);
    setSetupStep(0);
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
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in flex items-center gap-2 ${
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
              <p className="mt-1 text-[#1a1a2e]/60">Connect the tools you already use. One click and your data flows automatically.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a2e]/5 text-sm text-[#1a1a2e]/70">
                <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-semibold text-emerald-600">{connectedCount}</span>
                <span>connected</span>
                <span className="mx-1">·</span>
                <span className="font-medium">{integrations.length - connectedCount}</span>
                <span>available</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* First-time banner */}
        {connectedCount === 0 && (
          <div className="mb-8 p-8 rounded-2xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-emerald-100">
                <Zap className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-[#1a1a2e]">Welcome! Let's get you connected.</h2>
                <p className="mt-2 text-[#1a1a2e]/60 leading-relaxed max-w-2xl">
                  Lanework works with the tools you already use — shipping, accounting, WhatsApp, spreadsheets, and more. 
                  Connect them once and your data flows automatically. No technical knowledge needed — we'll walk you through each step.
                </p>
                <p className="mt-3 text-sm text-[#1a1a2e]/40">
                  🟢 Green cards below = ready to use. Click any one to get started.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1a1a2e]/30" />
            <input type="text" placeholder="Search for a tool or service…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full bg-white border border-[#e5e7eb] text-sm placeholder:text-[#1a1a2e]/30 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
          </div>
          {connectedCount > 0 && (
            <span className="text-sm text-[#1a1a2e]/40">{filtered.length} of {integrations.length} tools shown</span>
          )}
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-[#1a1a2e]/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search className="h-14 w-14 text-[#1a1a2e]/10 mx-auto" />
            <p className="mt-4 text-[#1a1a2e]/50 text-lg">No tools found matching "{search}"</p>
            <button onClick={() => setSearch("")} className="mt-2 text-sm text-emerald-600 hover:underline">Clear search</button>
          </div>
        ) : (
          categories.map(cat => {
            const catItems = filtered.filter(i => i.category === cat);
            if (catItems.length === 0) return null;
            const catMeta = CATEGORY_LABELS[cat] || { label: cat, icon: Zap, desc: "" };
            const CatIcon = catMeta.icon;

            return (
              <div key={cat} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#1a1a2e]/5">
                    <CatIcon className="h-4 w-4 text-[#1a1a2e]/60" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1a1a2e]">{catMeta.label}</h3>
                    <p className="text-xs text-[#1a1a2e]/40">{catMeta.desc}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {catItems.map(integ => {
                    const ICO = ICON_MAP[integ.icon] || Zap;
                    const isConnected = integ.status === "connected";
                    const isBusy = connecting === integ.id || disconnecting === integ.id;
                    const isExpanded = expandedIntegration === integ.id;
                    const isSetupWizard = showSetupWizard === integ.id;
                    const plainInfo = PLAIN_SPEAK[integ.id];
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
                          {/* Status dot */}
                          <div className="absolute top-4 right-4 flex items-center gap-1.5">
                            {isConnected ? (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Connected
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-[#1a1a2e]/35 bg-[#1a1a2e]/5 px-2 py-1 rounded-full">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#1a1a2e]/20" />
                                Available
                              </div>
                            )}
                          </div>

                          {/* Card content */}
                          <div onClick={() => isConnected && hasActions && setExpandedIntegration(isExpanded ? null : integ.id)}
                            className={`p-6 ${isConnected && hasActions ? "cursor-pointer" : ""}`}>
                            <div className={`grid h-12 w-12 place-items-center rounded-xl mb-4 ${isConnected ? "bg-emerald-100" : "bg-[#1a1a2e]/5"}`}>
                              <ICO className={`h-6 w-6 ${isConnected ? "text-emerald-600" : "text-[#1a1a2e]/60"}`} />
                            </div>
                            <h4 className="font-semibold text-[#1a1a2e]">{integ.name}</h4>
                            <p className="mt-1.5 text-sm text-[#1a1a2e]/55 leading-relaxed">
                              {plainInfo?.benefit || integ.desc}
                            </p>

                            {/* Buttons */}
                            <div className="flex items-center gap-2 mt-4">
                              {isConnected ? (
                                <div className="flex items-center gap-2">
                                  {hasActions ? (
                                    <button onClick={() => setExpandedIntegration(isExpanded ? null : integ.id)}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-all">
                                      {isExpanded ? "Close" : "Use this tool"}
                                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    </button>
                                  ) : (
                                    <span className="text-sm text-emerald-600 font-medium">Connected ✓</span>
                                  )}
                                  <button disabled={isBusy} onClick={(e) => { e.stopPropagation(); handleDisconnect(integ.id, integ.name); }}
                                    className="inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600 disabled:opacity-50">
                                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}
                                    Disconnect
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button disabled={isBusy} onClick={() => plainInfo ? openSetupWizard(integ.id) : handleConnect(integ.id, integ.name)}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition-all">
                                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                    Connect
                                  </button>
                                  {plainInfo?.setupHelp && (
                                    <button onClick={() => openSetupWizard(integ.id)}
                                      className="text-xs text-[#1a1a2e]/40 hover:text-[#1a1a2e]/60">
                                      <HelpCircle className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Connected timestamp */}
                            {isConnected && integ.connectedAt && (
                              <p className="mt-2 text-xs text-[#1a1a2e]/30">
                                Connected {new Date(integ.connectedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Setup Wizard (for not-yet-connected integrations) */}
                        {isSetupWizard && !isConnected && plainInfo && (
                          <div className="mt-2 p-6 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-sm animate-fade-in">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-semibold text-[#1a1a2e] flex items-center gap-2">
                                  <HelpCircle className="h-5 w-5 text-blue-600" />
                                  What you need to connect {integ.name}
                                </h4>
                                <p className="text-sm text-[#1a1a2e]/60 mt-1">{plainInfo.setupHelp}</p>
                              </div>
                              <button onClick={() => setShowSetupWizard(null)} className="text-[#1a1a2e]/30 hover:text-[#1a1a2e]/60">
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="space-y-2 mb-5">
                              {plainInfo.setupSteps.map((step, i) => (
                                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${
                                  i === setupStep ? "bg-blue-100 border border-blue-200 font-medium" : "text-[#1a1a2e]/60"
                                }`}>
                                  <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                                    i < setupStep ? "bg-emerald-500 text-white" : i === setupStep ? "bg-blue-600 text-white" : "bg-[#1a1a2e]/10 text-[#1a1a2e]/50"
                                  }`}>
                                    {i < setupStep ? <Check className="h-3 w-3" /> : i + 1}
                                  </div>
                                  {step}
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center gap-3">
                              {setupStep > 0 && (
                                <button onClick={() => setSetupStep(s => s - 1)}
                                  className="text-sm text-[#1a1a2e]/50 hover:text-[#1a1a2e]">← Back</button>
                              )}
                              {setupStep < plainInfo.setupSteps.length - 1 ? (
                                <button onClick={() => setSetupStep(s => s + 1)}
                                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                                  Next step
                                </button>
                              ) : (
                                <button disabled={isBusy} onClick={() => handleConnect(integ.id, integ.name)}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                  I've done this — Connect now
                                </button>
                              )}
                              <button onClick={() => handleConnect(integ.id, integ.name)}
                                className="text-sm text-[#1a1a2e]/30 hover:text-[#1a1a2e]/50 underline">
                                Skip, just connect
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Expanded Action Panel */}
                        {isExpanded && isConnected && hasActions && (
                          <div className="mt-2 p-5 rounded-2xl border border-emerald-200 bg-white shadow-sm animate-fade-in">
                            <h4 className="text-sm font-semibold text-[#1a1a2e] mb-1">
                              What would you like to do with {integ.name}?
                            </h4>
                            <p className="text-xs text-[#1a1a2e]/50 mb-4">
                              Click any option below. Your {integ.name} account is connected and ready.
                            </p>

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
                                      <div className="text-xs text-[#1a1a2e]/50 mt-0.5 leading-relaxed">{act.desc}</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Human-readable result */}
                            {actionResult && (
                              <div className={`mt-4 p-4 rounded-xl border ${
                                actionResult.raw?.success ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                              }`}>
                                <div className="flex items-center gap-2 mb-2">
                                  {actionResult.raw?.success
                                    ? <Check className="h-4 w-4 text-emerald-600" />
                                    : <AlertCircle className="h-4 w-4 text-amber-600" />
                                  }
                                  <span className="text-xs font-semibold text-[#1a1a2e]/60">RESULT</span>
                                </div>
                                <p className="text-sm text-[#1a1a2e]/80 leading-relaxed">{actionResult.parsed}</p>
                                <details className="mt-2">
                                  <summary className="text-xs text-[#1a1a2e]/30 cursor-pointer hover:text-[#1a1a2e]/50">Show details</summary>
                                  <pre className="mt-2 text-xs text-[#1a1a2e]/50 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto bg-[#1a1a2e]/3 p-2 rounded-lg">
                                    {JSON.stringify(actionResult.raw, null, 2)}
                                  </pre>
                                </details>
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
