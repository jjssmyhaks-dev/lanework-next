"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Loader2, Bot, Trash2, Plus, MessageSquare,
  Clock, ChevronLeft, PanelLeftClose, PanelLeftOpen,
  Truck, Package, Route as RouteIcon, Warehouse, Users,
  MapPin, ShoppingCart, Calculator, BarChart3, ScanLine,
  AlertTriangle, Wifi, WifiOff, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

type ToolCallSummary = {
  integration: string;
  action: string;
  mode: "live" | "simulated" | "db-fallback" | "error";
  durationMs: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolCalls?: ToolCallSummary[];
};

type Thread = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount?: number;
};

// ── Constants ──

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to **Lanework** — your AI logistics command center.\n\n" +
    "I can help you with:\n\n" +
    "📦 **Track shipments** across 7+ Indian carriers\n" +
    "📊 **Check inventory** and stock levels\n" +
    "🗺️ **Optimize delivery routes** with live traffic\n" +
    "🧾 **Validate GSTIN** and generate e-way bills\n" +
    "🌤️ **Weather alerts** for route planning\n" +
    "🚛 **Fleet tracking** and driver compliance\n" +
    "🛒 **Sync orders** from Shopify, WooCommerce, Tally\n" +
    "📋 **Generate reports** on warehouse performance\n\n" +
    "Just type what you need — or try one of the suggestions below.",
  timestamp: "",
  toolCalls: [],
};

const SUGGESTIONS = [
  { text: "Track shipment SH-2024-001", icon: "📦" },
  { text: "Show me low-stock inventory items", icon: "📊" },
  { text: "Optimize routes for today's deliveries", icon: "🗺️" },
  { text: "Check weather in Mumbai", icon: "🌤️" },
  { text: "Validate GSTIN 27AABCG2196N1Z1", icon: "🧾" },
  { text: "Get shipping rates from 110001 to 400001 for 2kg", icon: "🚚" },
];

const QUICK_ACTIONS = [
  { label: "Track", icon: Truck, color: "text-sky-600", prompt: "Track shipment " },
  { label: "Inventory", icon: Package, color: "text-emerald-600", prompt: "Check inventory " },
  { label: "Routes", icon: RouteIcon, color: "text-amber-600", prompt: "Optimize route " },
  { label: "Weather", icon: MapPin, color: "text-blue-600", prompt: "Weather in " },
  { label: "GST", icon: Calculator, color: "text-violet-600", prompt: "Validate GSTIN " },
  { label: "Fleet", icon: Users, color: "text-indigo-600", prompt: "Track fleet " },
];

// ── Mode Badge ──

function ModeBadge({ mode }: { mode: string }) {
  const styles: Record<string, string> = {
    live: "bg-emerald-50 text-emerald-700 border-emerald-200",
    simulated: "bg-amber-50 text-amber-700 border-amber-200",
    "db-fallback": "bg-blue-50 text-blue-700 border-blue-200",
    error: "bg-red-50 text-red-700 border-red-200",
  };
  const icons: Record<string, any> = {
    live: Wifi,
    simulated: AlertTriangle,
    "db-fallback": Database,
    error: AlertTriangle,
  };
  const Icon = icons[mode] || AlertTriangle;
  const label =
    mode === "live" ? "Live" :
    mode === "db-fallback" ? "Cached" :
    mode === "error" ? "Error" : "Demo";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", styles[mode] || styles.simulated)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ── Tool Call Card ──

function ToolCallCard({ tc }: { tc: ToolCallSummary }) {
  const integrationLabel: Record<string, string> = {
    shiprocket: "Shiprocket",
    tally_prime: "Tally",
    gstn_eway_bill: "E-Way Bill",
    mapmyindia: "MapmyIndia",
    loconav: "Fleet",
    shopify: "Shopify",
    woocommerce: "WooCommerce",
    weather: "Weather",
    compliance: "Compliance",
    email: "Email",
    fedex: "FedEx",
    erp: "SAP B1",
    google_sheets: "Sheets",
    wms: "WMS",
    scanner: "Scanner",
    dockscheduler: "Docks",
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
      <span className="font-medium text-gray-600">
        {integrationLabel[tc.integration] || tc.integration}
      </span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-500">{tc.action.replace(/_/g, " ")}</span>
      <ModeBadge mode={tc.mode} />
      <span className="ml-auto text-gray-400">{tc.durationMs}ms</span>
    </div>
  );
}

// ── Message Bubble ──

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1a1a2e]">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={cn("max-w-[80%] space-y-2", isUser ? "order-1" : "")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-[#1a1a2e] text-white rounded-br-md"
              : "bg-gray-100 text-gray-800 rounded-bl-md"
          )}
        >
          <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
            __html: msg.content
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/\*(.+?)\*/g, "<em>$1</em>")
              .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-black/5 rounded text-xs">$1</code>')
              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline hover:opacity-80">$1</a>')
              .replace(/\n/g, "<br/>")
          }} />
        </div>
        {/* Tool calls */}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="space-y-1">
            {msg.toolCalls.map((tc, i) => (
              <ToolCallCard key={i} tc={tc} />
            ))}
          </div>
        )}
        {msg.timestamp && (
          <p className="text-[10px] text-gray-400 px-1">
            {new Date(msg.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
      {isUser && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-200">
          <span className="text-xs font-medium text-gray-600">You</span>
        </div>
      )}
    </div>
  );
}

// ── Thread Sidebar ──

function ThreadSidebar({
  threads,
  activeThreadId,
  onSelect,
  onNew,
  onDelete,
  loading,
  collapsed,
  onToggle,
}: {
  threads: Thread[];
  activeThreadId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  loading: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <div className="w-12 border-r border-gray-200 bg-gray-50 flex flex-col items-center py-3 gap-3">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500" title="Expand sidebar">
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <button onClick={onNew} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500" title="New chat">
          <Plus className="h-4 w-4" />
        </button>
        {threads.slice(0, 8).map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={cn(
              "p-2 rounded-lg text-xs transition-colors",
              t.id === activeThreadId ? "bg-[#1a1a2e] text-white" : "hover:bg-gray-200 text-gray-500"
            )}
            title={t.title}
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">Conversations</span>
        <div className="flex items-center gap-1">
          <button onClick={onNew} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500" title="New chat">
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500" title="Collapse sidebar">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loading && threads.length === 0 && (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors group flex items-center gap-2",
              t.id === activeThreadId
                ? "bg-white border border-gray-200 text-gray-900 font-medium shadow-sm"
                : "text-gray-600 hover:bg-white hover:border hover:border-gray-100"
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="truncate flex-1">{t.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-opacity"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(true);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load threads on mount ──
  const loadThreads = useCallback(async () => {
    try {
      setThreadsLoading(true);
      const res = await fetch("/api/chat/history?limit=100");
      if (res.ok) {
        const data = await res.json();
        // The history endpoint returns messages; we need threads
        // For now, use a simplified approach — group by thread from messages
      }
    } catch {
      // Silent fail
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Send message ──
  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, threadId: activeThreadId }),
      });

      if (res.status === 401) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: "Please sign in to use the chat.", timestamp: new Date().toISOString() },
        ]);
        return;
      }

      const data = await res.json();

      if (data.threadId && data.threadId !== activeThreadId) {
        setActiveThreadId(data.threadId);
      }

      if (data.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id,
            role: "assistant",
            content: data.message.content,
            timestamp: data.message.timestamp,
            toolCalls: data.message.toolCalls,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Something went wrong. Please try again.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeThreadId]);

  // ── New thread ──
  const newThread = () => {
    setActiveThreadId(null);
    setMessages([WELCOME_MESSAGE]);
  };

  // ── Delete thread ──
  const deleteThread = async (id: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (id === activeThreadId) newThread();
  };

  // ── Keyboard ──
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Thread Sidebar */}
      <ThreadSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelect={(id) => {
          setActiveThreadId(id);
          // TODO: Load thread messages from API
        }}
        onNew={newThread}
        onDelete={deleteThread}
        loading={threadsLoading}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#1a1a2e]">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#1a1a2e] leading-tight">Lanework</h1>
            <p className="text-[10px] text-gray-400">AI logistics command center</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
          </span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
            {/* Empty state */}
            {messages.length <= 1 && !loading && (
              <div className="text-center py-8">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#1a1a2e] mx-auto mb-4">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">What can I help with?</h2>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                  Track shipments, check inventory, optimize routes, validate GSTINs, and more — all through natural language.
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
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1a1a2e]">
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

            <div ref={endRef} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t border-gray-100 bg-white flex-shrink-0">
          <div className="max-w-2xl mx-auto px-4 py-2 flex gap-1 overflow-x-auto">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => { setInput(a.prompt); inputRef.current?.focus(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors whitespace-nowrap"
              >
                <a.icon className={cn("h-3.5 w-3.5", a.color)} />
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white flex-shrink-0">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 5000))}
                onKeyDown={handleKeyDown}
                rows={1}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] resize-none min-h-[48px] max-h-[120px]"
                placeholder="Ask about shipments, inventory, routes, or anything logistics..."
                aria-label="Message input"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className={cn(
                  "grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white transition-colors",
                  loading || !input.trim() ? "bg-gray-300 cursor-not-allowed" : "bg-[#1a1a2e] hover:bg-[#1a1a2e]/90"
                )}
                aria-label="Send message"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
