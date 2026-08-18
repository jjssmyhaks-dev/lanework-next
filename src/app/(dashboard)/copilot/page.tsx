"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Loader2, Bot, Trash2, Download,
  AlertCircle, Wifi, WifiOff, Database,
  RefreshCw, X, CheckCircle2, Plug, Paperclip, FileText, Upload,
  Truck, Package, Route as RouteIcon, Warehouse, Users, Bot as BotIcon,
  CreditCard, FileCheck, MessageCircle, MapPin, ShoppingCart, Calculator,
  BarChart3, ScanLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INTEGRATION_SETUP, IntegrationSetup } from "@/lib/integration-setup";
import MessageBubble from "@/components/ui/chat/message-bubble";
import QuickActionsBar from "@/components/ui/chat/quick-actions-bar";
import IntegrationPills from "@/components/ui/chat/integration-pills";

// ── Types ──

type ToolResult = {
  type: "shipment" | "inventory" | "route" | "integration" | "error" | "report";
  data: any;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolResult?: ToolResult | null;
};

type ConnectionState = {
  integration: IntegrationSetup | null;
  step: number;
  configValues: Record<string, string>;
  connecting: boolean;
  result: { success?: boolean; message?: string } | null;
};

// ── Constants ──

const STORAGE_KEY = "lanework-chat-history";
const MAX_CHARS = 2000;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your Lanework logistics copilot. I can help you with:\n\n" +
    "- **Track shipments** in real-time across 7+ carriers\n" +
    "- **Check inventory** and get low-stock alerts\n" +
    "- **Optimize delivery routes** for your fleet\n" +
    "- **Generate reports** on warehouse performance\n" +
    "- **Connect integrations** like Shiprocket, TallyPrime, Razorpay, and more\n" +
    "- **Upload CSV** files to import shipments, inventory, or orders\n" +
    "- **GST & E-Way Bills** — validate GSTIN, generate e-way bills\n\n" +
    "Try one of the suggestions below or just ask me anything!",
  timestamp: "",
  toolResult: null,
};

const SUGGESTIONS = [
  { text: "Track shipment SH-2024-001", icon: "📦" },
  { text: "Show me low-stock inventory items", icon: "📊" },
  { text: "Optimize routes for today's deliveries", icon: "🗺️" },
  { text: "Generate a warehouse task summary", icon: "📋" },
  { text: "Connect Shiprocket for live tracking", icon: "🔌" },
  { text: "Check COD reconciliation in Razorpay", icon: "💳" },
  { text: "Validate GSTIN 27AABCG2196N1Z1", icon: "🧾" },
  { text: "Upload a CSV file", icon: "📎" },
];

// Agent shortcuts — quick access to all 6 agent types
const AGENT_SHORTCUTS = [
  { id: "shipment-tracking", label: "Shipment Tracking", icon: Truck, color: "text-sky-600", prompt: "Show me the status of all active shipments" },
  { id: "inventory-management", label: "Inventory", icon: Package, color: "text-emerald-600", prompt: "Check current inventory levels for all items" },
  { id: "route-optimization", label: "Route Optimization", icon: RouteIcon, color: "text-amber-600", prompt: "Optimize delivery routes for today's shipments" },
  { id: "warehouse-operations", label: "Warehouse", icon: Warehouse, color: "text-violet-600", prompt: "Generate a warehouse task summary" },
  { id: "fleet-management", label: "Fleet", icon: Users, color: "text-indigo-600", prompt: "Track all fleet vehicles and drivers" },
  { id: "customer-communication", label: "Customer Comms", icon: MessageCircle, color: "text-rose-600", prompt: "Send a WhatsApp notification to a customer" },
];

// ── Helpers ──

function genId(): string {
  return crypto.randomUUID();
}

function formatTime(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function loadHistory(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

function saveHistory(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch {}
}

function exportConversation(messages: Message[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "You" : "Lanework AI";
      const time = m.timestamp ? ` [${m.timestamp}]` : "";
      let extra = "";
      if (m.toolResult) {
        extra = `\n[Tool Result: ${m.toolResult.type.toUpperCase()} | Mode: ${m.toolResult.data?.mode || "simulated"}]`;
      }
      return `${role}${time}: ${m.content}${extra}`;
    })
    .join("\n\n---\n\n");
}

// ── Intent Detection ──

interface DetectedIntent {
  action: string;
  integration?: string;
  params: Record<string, string>;
}

function detectIntent(text: string): DetectedIntent | null {
  const t = text.toLowerCase();

  // Track shipment
  const trackMatch =
    t.match(/track\s+(?:shipment\s+)?([\w-]+)/i) ||
    t.match(/where\s+(?:is|are)\s+(?:my\s+)?(?:shipment\s+)?([\w-]+)/i) ||
    t.match(/status\s+(?:of\s+)?(?:shipment\s+)?([\w-]+)/i);
  if (trackMatch) {
    const trackingNumber = trackMatch[1].replace(/[#?!.,;:\s]/g, "");
    return {
      action: "track_shipment",
      integration: "shiprocket",
      params: { tracking_number: trackingNumber, awb: trackingNumber },
    };
  }

  // Inventory check
  if (t.includes("inventory") || t.includes("stock level") || t.includes("low stock") || t.includes("check inventory") || t.includes("what's in stock") || t.includes("quantity of")) {
    return { action: "sync_inventory", integration: "tally_prime", params: {} };
  }

  // Route optimization
  if (t.includes("optimize route") || t.includes("plan route") || t.includes("best route") || t.includes("delivery route") || t.includes("route for")) {
    return { action: "optimize_route", params: {} };
  }

  // Generate report
  if (t.includes("generate report") || t.includes("summary report") || t.includes("warehouse summary") || t.includes("task summary") || t.includes("performance report")) {
    return { action: "generate_report", params: {} };
  }

  // Connect integration
  if (t.match(/(?:connect|setup|set up|configure)\s+(.+)/i)) {
    const name = t.match(/(?:connect|setup|set up|configure)\s+(.+)/i)![1].trim();
    const found = Object.values(INTEGRATION_SETUP).find(
      (i) => i.name.toLowerCase().includes(name) || i.id.toLowerCase().includes(name) || name.includes(i.name.toLowerCase())
    );
    if (found) return { action: "connect_integration", integration: found.id, params: {} };
  }

  // Specific actions per integration
  if (t.includes("sync tally") || t.includes("tally sync") || t.includes("tally inventory")) {
    return { action: "sync_inventory", integration: "tally_prime", params: {} };
  }
  if (t.includes("cod reconciliation") || t.includes("razorpay") || t.includes("payment")) {
    return { action: "reconcile", integration: "razorpay", params: {} };
  }
  if (t.includes("gstin") || t.includes("validate gst") || t.includes("gst validation")) {
    const gstMatch = t.match(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])/i);
    return { action: "validate_gstin", integration: "gstn_eway_bill", params: { gstin: gstMatch ? gstMatch[1] : "" } };
  }
  if (t.includes("whatsapp") || t.includes("send notification") || t.includes("notify customer")) {
    return { action: "test_whatsapp", integration: "whatsapp", params: {} };
  }
  if (t.includes("google sheet") || t.includes("sync sheet") || t.includes("spreadsheet")) {
    return { action: "sync_sheet", integration: "google_sheets", params: {} };
  }
  if (t.includes("webhook")) {
    return { action: "test_webhook", integration: "generic_webhook", params: {} };
  }
  if (t.includes("shopify") || t.includes("sync shopify")) {
    return { action: "sync_orders", integration: "shopify", params: {} };
  }
  if (t.includes("woocommerce") || t.includes("woo commerce")) {
    return { action: "sync_orders", integration: "woocommerce", params: {} };
  }
  if (t.includes("fleet") || t.includes("vehicle") || t.includes("track vehicle")) {
    return { action: "track_all", integration: "loconav", params: {} };
  }
  if (t.includes("export") && (t.includes("csv") || t.includes("shipments") || t.includes("inventory"))) {
    return { action: "export_csv", params: {} };
  }

  return null;
}

// ── Main Component ──

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = loadHistory();
    return saved.length > 0 ? saved : [WELCOME_MESSAGE];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    integration: null, step: 0, configValues: {}, connecting: false, result: null,
  });
  const [charCount, setCharCount] = useState(0);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileInputRef] = useState(() => ({ current: null as HTMLInputElement | null }));

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputEl = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (messages.length > 1) saveHistory(messages); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ── AI Reasoning Call ──
  const callAI = async (userMessage: string): Promise<string> => {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reasoning",
          data: { agentId: "copilot", taskType: "user_query", context: userMessage },
        }),
      });
      if (res.status === 401) return "Please sign in to use the copilot.";
      const data = await res.json();
      return data.result || data.error || "Sorry, I couldn't process that request.";
    } catch {
      return "Something went wrong. Please try again.";
    }
  };

  // ── Integration Action Call ──
  const callIntegrationAction = async (integrationId: string, action: string, params: Record<string, any> = {}): Promise<any> => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      });
      return await res.json();
    } catch {
      return { success: false, mode: "error", error: "Failed to call integration. Please try again." };
    }
  };

  // ── Connect Integration ──
  const connectIntegration = async (integrationId: string, config: Record<string, string>): Promise<any> => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      return await res.json();
    } catch {
      return { success: false, error: "Connection failed. Check your network and try again." };
    }
  };

  // ── CSV File Upload ──
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadingFile(true);
    addMessage({
      id: genId(), role: "user", content: `📎 Uploading ${file.name}...`, timestamp: new Date().toISOString(), toolResult: null,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity_type", file.name.toLowerCase().includes("inventory") ? "inventory" : file.name.toLowerCase().includes("order") ? "order" : "shipment");

      const res = await fetch("/api/import/csv", { method: "POST", body: formData });
      const data = await res.json();

      addMessage({
        id: genId(),
        role: "assistant",
        content: data.success
          ? `✅ **Import Complete**\n\n• File: ${file.name}\n• Entity: ${data.entity_type}\n• Total rows: ${data.total}\n• Imported: ${data.imported}\n• Skipped: ${data.skipped}\n${data.errors?.length ? `• Errors: ${data.errors.length}` : ""}\n\n${data.errors?.length ? `**Errors:**\n${data.errors.slice(0, 5).map((e: string) => `  - ${e}`).join("\n")}` : "All records imported successfully!"}`
          : `❌ Import failed: ${data.error || "Unknown error"}`,
        timestamp: new Date().toISOString(),
        toolResult: data.success
          ? { type: "report", data: { mode: "live", message: `Imported ${data.imported}/${data.total} ${data.entity_type} records from ${file.name}` } }
          : { type: "error", data: { message: data.error || "Import failed" } },
      });
    } catch (err: any) {
      addMessage({
        id: genId(), role: "assistant", content: `❌ Upload failed: ${err.message}`,
        timestamp: new Date().toISOString(),
        toolResult: { type: "error", data: { message: err.message } },
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // ── Determine tool result card type ──
  const getResultCardType = (action: string, data: any): ToolResult["type"] => {
    if (data?.mode === "error" || !data?.success) return "error";
    if (action === "track_shipment") return "shipment";
    if (action === "sync_inventory" || action === "check_stock") return "inventory";
    if (action === "optimize_route" || action === "geocode") return "route";
    if (data?.tracking) return "shipment";
    if (data?.inventory || data?.items) return "inventory";
    if (data?.stops || data?.route || data?.rates) return "route";
    if (action === "generate_report" || action === "export_csv") return "report";
    return "integration";
  };

  // ── Main Send Handler ──
  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { id: genId(), role: "user", content: msg, timestamp: new Date().toISOString(), toolResult: null };
    addMessage(userMsg);
    setInput("");
    setCharCount(0);
    setLoading(true);

    try {
      const intent = detectIntent(msg);
      let aiResponse = "";

      // Export CSV
      if (intent?.action === "export_csv") {
        aiResponse = "I'll export your data as CSV. You can download shipments, inventory, or orders.\n\nClick one of the links below to download:\n- [Shipments CSV](/api/export/csv?entity=shipments)\n- [Inventory CSV](/api/export/csv?entity=inventory)\n- [Orders CSV](/api/export/csv?entity=orders)";
        addMessage({ id: genId(), role: "assistant", content: aiResponse, timestamp: new Date().toISOString(), toolResult: { type: "report", data: { mode: "live", message: "CSV export links generated" } } });
        setLoading(false);
        return;
      }

      // Connect integration
      if (intent?.action === "connect_integration" && intent.integration) {
        const setup = INTEGRATION_SETUP[intent.integration];
        if (!setup) {
          aiResponse = await callAI(msg);
        } else {
          setConnection({ integration: setup, step: 0, configValues: {}, connecting: false, result: null });
          aiResponse = `I'll help you connect **${setup.name}**. ${setup.description}\n\nI've opened the setup guide below. Follow the steps to configure your ${setup.name} integration.`;
          setLoading(false);
          return;
        }
      } else if (intent && intent.action && intent.integration) {
        // Integration action — call AI + integration
        aiResponse = await callAI(msg);
        const integrationResult = await callIntegrationAction(intent.integration, intent.action, intent.params);
        const cardType = getResultCardType(intent.action, integrationResult);
        addMessage({ id: genId(), role: "assistant", content: aiResponse, timestamp: new Date().toISOString(), toolResult: { type: cardType, data: integrationResult } });
        setLoading(false);
        return;
      } else if (intent && intent.action === "optimize_route") {
        aiResponse = await callAI(msg);
        addMessage({ id: genId(), role: "assistant", content: aiResponse, timestamp: new Date().toISOString(), toolResult: { type: "route", data: { mode: "simulated", message: "I can optimize your delivery routes. Please provide: pickup location, delivery addresses, and any time constraints.", stops: [] } } });
        setLoading(false);
        return;
      } else if (intent && intent.action === "generate_report") {
        aiResponse = await callAI(msg);
        addMessage({ id: genId(), role: "assistant", content: aiResponse, timestamp: new Date().toISOString(), toolResult: { type: "report", data: { mode: "simulated", message: "Reports are generated based on your data. Common reports:\n- Shipment status summary\n- Inventory stock levels\n- COD reconciliation summary\n- Fleet utilization report\n\nWhat type of report would you like?" } } });
        setLoading(false);
        return;
      } else {
        aiResponse = await callAI(msg);
      }

      addMessage({ id: genId(), role: "assistant", content: aiResponse, timestamp: new Date().toISOString(), toolResult: null });
    } catch {
      addMessage({ id: genId(), role: "assistant", content: "Something went wrong. Please try again.", timestamp: new Date().toISOString(), toolResult: { type: "error", data: { message: "An unexpected error occurred." } } });
    } finally {
      setLoading(false);
    }
  }, [input, loading, addMessage]);

  // ── Connection Flow ──
  const startConnection = (integration: IntegrationSetup) => {
    setConnection({ integration, step: 1, configValues: {}, connecting: false, result: null });
  };
  const advanceConnectionStep = () => setConnection((prev) => prev.integration && prev.step < prev.integration.setupSteps.length ? { ...prev, step: prev.step + 1 } : prev);
  const prevConnectionStep = () => setConnection((prev) => prev.step > 1 ? { ...prev, step: prev.step - 1 } : prev);
  const updateConfigValue = (key: string, value: string) => setConnection((prev) => ({ ...prev, configValues: { ...prev.configValues, [key]: value } }));

  const testConnection = async () => {
    if (!connection.integration) return;
    setConnection((prev) => ({ ...prev, connecting: true, result: null }));
    const result = await connectIntegration(connection.integration.id, connection.configValues);
    setConnection((prev) => ({ ...prev, connecting: false, result: { success: result.success, message: result.success ? `Successfully connected to ${connection.integration?.name}!` : result.error || "Connection failed." } }));
    if (result.success) {
      addMessage({ id: genId(), role: "assistant", content: `✅ **${connection.integration.name}** connected successfully! You can now use it.\n\nTry: "Track a shipment via ${connection.integration.name}" or "Sync ${connection.integration.name} data"`, timestamp: new Date().toISOString(), toolResult: { type: "integration", data: { ...result, mode: "live" } } });
    }
  };

  const dismissConnection = () => setConnection({ integration: null, step: 0, configValues: {}, connecting: false, result: null });

  const handleQuickAction = (template: string) => { setInput(template); inputRef.current?.focus(); };
  const handleIntegrationSelect = (integration: IntegrationSetup) => { setInput(`What can I do with ${integration.name}?`); inputRef.current?.focus(); };
  const handleIntegrationConnect = (integration: IntegrationSetup) => startConnection(integration);

  const clearConversation = () => { setMessages([WELCOME_MESSAGE]); localStorage.removeItem(STORAGE_KEY); dismissConnection(); };

  const handleExport = () => {
    const text = exportConversation(messages);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lanework-chat-${new Date().toISOString().split("T")[0]}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleRetry = (messageIndex: number) => {
    const userMsg = messages.slice(0, messageIndex).reverse().find((m) => m.role === "user");
    if (userMsg) send(userMsg.content);
  };

  const handleAgentClick = (agent: typeof AGENT_SHORTCUTS[0]) => {
    send(agent.prompt);
    setShowAgentPanel(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-black">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-black leading-tight">Lanework Copilot</h1>
          <p className="text-[10px] text-gray-400">Your logistics AI assistant</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
        </span>

        <div className="ml-auto flex items-center gap-1">
          {/* Agent shortcuts toggle */}
          <button
            onClick={() => setShowAgentPanel(!showAgentPanel)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", showAgentPanel ? "bg-black text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900")}
            title="Agent shortcuts"
          >
            <BotIcon className="h-4 w-4" /> Agents
          </button>
          <button onClick={handleExport} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Export conversation">
            <Download className="h-4 w-4" />
          </button>
          <button onClick={clearConversation} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Clear conversation">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Agent Shortcuts Panel */}
      {showAgentPanel && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {AGENT_SHORTCUTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleAgentClick(agent)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm transition-all"
              >
                <agent.icon className={cn("h-5 w-5", agent.color)} />
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{agent.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Empty state */}
          {messages.length <= 1 && !loading && (
            <div className="text-center py-8">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-black mx-auto mb-4">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome to Lanework</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Your AI-powered logistics command center. Ask me anything about shipments, inventory, routes, integrations, or upload a CSV file.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => send(s.text)}
                    className="text-left p-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-all bg-white"
                  >
                    <span className="mr-2">{s.icon}</span>{s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m, idx) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              timestamp={m.timestamp ? formatTime(m.timestamp) : ""}
              toolResult={m.toolResult}
              onRetry={m.toolResult?.type === "error" ? () => handleRetry(idx) : undefined}
              onFeedback={() => {}}
            />
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-gray-100">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "200ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "400ms" }} />
                </div>
              </div>
            </div>
          )}

          {uploadingFile && (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black">
                <Upload className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-gray-100">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Uploading and processing file...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Inline Connection Setup */}
        {connection.integration && (
          <div className="max-w-2xl mx-auto px-4 pb-4">
            <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Plug className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Connect {connection.integration.name}</span>
                  <span className="text-[10px] text-gray-400">Step {connection.step} of {connection.integration.setupSteps.length}</span>
                </div>
                <button onClick={dismissConnection} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {connection.result ? (
                <div className="p-4">
                  <div className={cn("flex items-start gap-3 p-3 rounded-lg", connection.result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {connection.result.success ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{connection.result.success ? "Connected!" : "Connection Failed"}</p>
                      <p className="text-xs mt-1">{connection.result.message}</p>
                      {connection.result.success ? (
                        <button onClick={dismissConnection} className="mt-2 text-xs font-medium underline">Close setup</button>
                      ) : (
                        <button onClick={() => setConnection((prev) => ({ ...prev, result: null, connecting: false }))} className="mt-2 text-xs font-medium underline">Try again</button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-1 bg-gray-100">
                    <div className="h-full bg-black transition-all duration-300" style={{ width: `${(connection.step / connection.integration.setupSteps.length) * 100}%` }} />
                  </div>
                  {(() => {
                    const currentStep = connection.integration.setupSteps[connection.step - 1];
                    if (!currentStep) return null;
                    return (
                      <div className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="grid h-7 w-7 place-items-center rounded-full bg-black text-white text-xs font-bold flex-shrink-0">{currentStep.step}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-800">{currentStep.title}</h4>
                            <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap leading-relaxed">{currentStep.instruction}</p>
                            {currentStep.helpUrl && (
                              <a href={currentStep.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline">
                                Open help page
                              </a>
                            )}
                            {currentStep.envVar && (
                              <div className="mt-3">
                                <label className="text-[10px] font-medium text-gray-500 block mb-1">{currentStep.envVar}</label>
                                <input
                                  type={currentStep.envVar.toLowerCase().includes("password") || currentStep.envVar.toLowerCase().includes("secret") ? "password" : "text"}
                                  value={connection.configValues[currentStep.envVar] || ""}
                                  onChange={(e) => updateConfigValue(currentStep.envVar!, e.target.value)}
                                  placeholder={`Enter ${currentStep.envVar}`}
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <button onClick={prevConnectionStep} disabled={connection.step <= 1} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">← Previous</button>
                          {connection.step === connection.integration.setupSteps.length ? (
                            <button onClick={testConnection} disabled={connection.connecting} className="px-4 py-1.5 rounded-lg text-xs font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50">
                              {connection.connecting ? (<span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Connecting...</span>) : "Test Connection"}
                            </button>
                          ) : (
                            <button onClick={advanceConnectionStep} className="px-4 py-1.5 rounded-lg text-xs font-medium bg-black text-white hover:bg-gray-800">Next</button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          {/* Integration Pills */}
          <IntegrationPills onSelect={handleIntegrationSelect} onConnect={handleIntegrationConnect} />
          {/* Quick Actions */}
          <QuickActionsBar onAction={handleQuickAction} />
          {/* Text Input + File Upload */}
          <div className="flex items-end gap-2">
            {/* File upload button */}
            <input ref={fileInputEl} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
            <button
              onClick={() => fileInputEl.current?.click()}
              disabled={uploadingFile}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors disabled:opacity-50"
              title="Upload CSV file"
              aria-label="Upload file"
            >
              {uploadingFile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => { if (e.target.value.length <= MAX_CHARS) { setInput(e.target.value); setCharCount(e.target.value.length); } }}
                onKeyDown={handleKeyDown}
                rows={1}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-16 text-sm text-gray-700 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-none min-h-[48px] max-h-[120px]"
                placeholder="Ask about shipments, inventory, routes, or upload a CSV..."
                aria-label="Message input"
              />
              <span className={cn("absolute bottom-2 right-2 text-[10px]", charCount > MAX_CHARS * 0.8 ? "text-amber-500" : "text-gray-400")}>
                {charCount}/{MAX_CHARS}
              </span>
            </div>
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white transition-colors", loading || !input.trim() ? "bg-gray-300 cursor-not-allowed" : "bg-black hover:bg-gray-800")}
              aria-label="Send message"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Shift+Enter</kbd> for new line · 📎 to upload CSV
          </p>
        </div>
      </div>
    </div>
  );
}
