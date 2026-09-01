"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Loader2, Bot, Trash2, Plus, MessageSquare,
  PanelLeftClose, PanelLeftOpen, Paperclip, Upload,
  AlertCircle, X, CheckCircle2, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INTEGRATION_SETUP, IntegrationSetup } from "@/lib/integration-setup";
import MessageBubble from "@/components/ui/chat/message-bubble";
import QuickActionsBar from "@/components/ui/chat/quick-actions-bar";
import IntegrationPills from "@/components/ui/chat/integration-pills";
import KnowledgeSuggestPopover from "@/components/ui/chat/knowledge-suggest-popover";
import { useKnowledgeSuggest } from "@/components/ui/chat/use-knowledge-suggest";
import { useAIChat } from "@/components/ui/chat/use-ai-chat";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import VoiceInput from "@/components/ui/chat/voice-input";
import { UpgradeBanner, UsageProgressBar } from "@/components/ui/upgrade-banner";
import AgentActivityPanel from "@/components/ui/chat/agent-activity-panel";

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

type Thread = {
  id: string;
  title: string;
  updatedAt: string;
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
const MAX_CHARS = 5000;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your **Lanework logistics copilot**. I can help you with:\n\n" +
    "- **Track shipments** in real-time across 7+ carriers\n" +
    "- **Check inventory** and get low-stock alerts\n" +
    "- **Optimize delivery routes** for your fleet\n" +
    "- **Generate reports** on warehouse performance\n" +
    "- **Connect integrations** like Shiprocket, TallyPrime, Razorpay, and more\n" +
    "- **Upload CSV** files to import shipments, inventory, or orders\n" +
    "- **GST & E-Way Bills** — validate GSTIN, generate e-way bills\n" +
    "- **Weather alerts** for route planning\n\n" +
    "Try one of the suggestions below or just ask me anything!",
  timestamp: "",
  toolResult: null,
};

const SUGGESTIONS = [
  { text: "Track shipment SH-2024-001", icon: "📦" },
  { text: "Show me low-stock inventory items", icon: "📊" },
  { text: "Optimize routes for today's deliveries", icon: "🗺️" },
  { text: "Check weather in Mumbai", icon: "🌤️" },
  { text: "Validate GSTIN 27AABCG2196N1Z1", icon: "🧾" },
  { text: "Get shipping rates from 110001 to 400001 for 2kg", icon: "🚚" },
  { text: "Connect Shiprocket for live tracking", icon: "🔌" },
  { text: "Upload a CSV file", icon: "📎" },
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

async function loadHistory(): Promise<Message[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/chat/history?limit=50");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) return data.messages;
    }
  } catch {}
  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

async function saveHistory(messages: Message[]) {
  if (typeof window === "undefined") return;
  const toSave = messages.slice(-50);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); } catch {}
  try {
    await fetch("/api/chat/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: toSave }),
    });
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

function getResultCardType(action: string, data: any): ToolResult["type"] {
  if (data?.mode === "error" || !data?.success) return "error";
  if (action === "track_shipment") return "shipment";
  if (action === "sync_inventory" || action === "check_stock") return "inventory";
  if (action === "optimize_route" || action === "geocode") return "route";
  if (data?.tracking) return "shipment";
  if (data?.inventory || data?.items) return "inventory";
  if (data?.stops || data?.route || data?.rates) return "route";
  if (action === "generate_report" || action === "export_csv") return "report";
  return "integration";
}

// ── Thread Sidebar ──

function ThreadSidebar({
  threads, activeThreadId, onSelect, onNew, onDelete, loading, collapsed, onToggle,
}: {
  threads: Thread[]; activeThreadId: string | null;
  onSelect: (id: string) => void; onNew: () => void; onDelete: (id: string) => void;
  loading: boolean; collapsed: boolean; onToggle: () => void;
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
          <button key={t.id} onClick={() => onSelect(t.id)}
            className={cn("p-2 rounded-lg text-xs transition-colors", t.id === activeThreadId ? "bg-[#1a1a2e] text-white" : "hover:bg-gray-200 text-gray-500")}
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
          <button key={t.id} onClick={() => onSelect(t.id)}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors group flex items-center gap-2",
              t.id === activeThreadId
                ? "bg-white border border-gray-200 text-gray-900 font-medium shadow-sm"
                : "text-gray-600 hover:bg-white hover:border hover:border-gray-100"
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="truncate flex-1">{t.title}</span>
            <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
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
  const [showActivity, setShowActivity] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    integration: null, step: 0, configValues: {}, connecting: false, result: null,
  });
  const [usageStats, setUsageStats] = useState<{
    plan: string; planName: string;
    limits: Record<string, { current: number; max: number; percent: number; label: string }>;
  } | null>(null);
  const [limitError, setLimitError] = useState<{ blocked: boolean; message: string; upgradeName?: string; upgradePrice?: number } | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Effects ──
  useEffect(() => {
    loadHistory().then((saved) => {
      if (saved.length > 0) setMessages(saved);
      setThreadsLoading(false);
    });
  }, []);

  // ── Fetch usage stats on mount + after each message
  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) setUsageStats(await res.json());
    } catch { /* silent */ }
  }, []);
  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (messages.length > 1) saveHistory(messages); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── API Calls ──
  const callAI = async (userMessage: string): Promise<string> => {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reasoning", data: { agentId: "copilot", taskType: "user_query", context: userMessage } }),
      });
      if (res.status === 401) return "Please sign in to use the copilot.";
      const data = await res.json();
      return data.result || data.error || "Sorry, I couldn't process that request.";
    } catch { return "Something went wrong. Please try again."; }
  };

  const callIntegrationAction = async (integrationId: string, action: string, params: Record<string, any> = {}): Promise<any> => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      });
      return await res.json();
    } catch { return { success: false, mode: "error", error: "Failed to call integration." }; }
  };

  const connectIntegration = async (integrationId: string, config: Record<string, string>): Promise<any> => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      return await res.json();
    } catch { return { success: false, error: "Connection failed." }; }
  };

  // ── Chat API (orchestrator) ──
  const callChatOrchestrator = async (msg: string): Promise<{ reply: string; toolCalls: any[] } | null> => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, threadId: activeThreadId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.blocked || data.limitType) {
          setLimitError({ blocked: true, message: data.error, upgradeName: data.upgradeName, upgradePrice: data.upgradePrice });
          return null;
        }
        return null;
      }
      const data = await res.json();
      setLimitError(null); // clear any previous limit error on success
      if (data.threadId && data.threadId !== activeThreadId) setActiveThreadId(data.threadId);
      return data.message ? { reply: data.message.content, toolCalls: data.message.toolCalls || [] } : null;
    } catch { return null; }
  };

  // ── CSV Upload ──
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadingFile(true);
    addMessage({ id: genId(), role: "user", content: `📎 Uploading ${file.name}...`, timestamp: new Date().toISOString(), toolResult: null });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity_type", file.name.toLowerCase().includes("inventory") ? "inventory" : file.name.toLowerCase().includes("order") ? "order" : "shipment");
      const res = await fetch("/api/import/csv", { method: "POST", body: formData });
      const data = await res.json();
      addMessage({
        id: genId(), role: "assistant",
        content: data.success
          ? `✅ **Import Complete**\n\n• File: ${file.name}\n• Entity: ${data.entity_type}\n• Total rows: ${data.total}\n• Imported: ${data.imported}\n• Skipped: ${data.skipped}\n${data.errors?.length ? `• Errors: ${data.errors.length}` : ""}`
          : `❌ Import failed: ${data.error || "Unknown error"}`,
        timestamp: new Date().toISOString(),
        toolResult: data.success ? { type: "report", data: { mode: "live", message: `Imported ${data.imported}/${data.total} records` } } : { type: "error", data: { message: data.error } },
      });
    } catch (err: any) {
      addMessage({ id: genId(), role: "assistant", content: `❌ Upload failed: ${err.message}`, timestamp: new Date().toISOString(), toolResult: { type: "error", data: { message: err.message } } });
    } finally { setUploadingFile(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  // ── Message Management ──
  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ── Streaming State ──
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingToolCalls, setStreamingToolCalls] = useState<Array<{ integration: string; action: string; mode: string; durationMs: number }>>([]);

  // ── Vercel AI SDK Streaming Hook ──
  const aiChat = useAIChat({
    onFinish: (message) => {
      // Extract tool calls from the finished message
      const toolInvocations = message.toolInvocations || [];
      let toolResult: ToolResult | null = null;
      if (toolInvocations.length > 0) {
        const ti = toolInvocations[0];
        const cardType = getResultCardType(ti.toolName, ti.result);
        toolResult = { type: cardType, data: { ...ti.result, mode: ti.result?.mode || "simulated" } };
      }
      addMessage({ id: message.id, role: "assistant", content: message.content, timestamp: new Date().toISOString(), toolResult });
      setLoading(false);
      fetchUsage();
    },
    onError: () => {
      setLoading(false);
    },
  });

  // ── Send Handler ──
  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    if (limitError?.blocked) return;

    const userMsg: Message = { id: genId(), role: "user", content: msg, timestamp: new Date().toISOString(), toolResult: null };
    addMessage(userMsg);
    setInput("");
    setCharCount(0);
    dismissSuggestions();
    setLoading(true);
    setStreamingContent("");
    setStreamingToolCalls([]);

    try {
      // Use Vercel AI SDK streaming
      aiChat.sendMessage(msg);
      setLoading(true);
    } catch {
      // Fallback to non-streaming if SSE fails
      try {
        const orchestratorResult = await callChatOrchestrator(msg);
        if (orchestratorResult && orchestratorResult.reply) {
          const toolCall = orchestratorResult.toolCalls?.[0];
          let toolResult: ToolResult | null = null;
          if (toolCall) {
            const cardType = getResultCardType(toolCall.action, toolCall.output);
            toolResult = { type: cardType, data: { ...toolCall.output, mode: toolCall.mode } };
          }
          addMessage({ id: genId(), role: "assistant", content: orchestratorResult.reply, timestamp: new Date().toISOString(), toolResult });
        } else {
          const aiResponse = await callAI(msg);
          addMessage({ id: genId(), role: "assistant", content: aiResponse, timestamp: new Date().toISOString(), toolResult: null });
        }
      } catch {
        addMessage({ id: genId(), role: "assistant", content: "Something went wrong. Please try again.", timestamp: new Date().toISOString(), toolResult: { type: "error", data: { message: "An unexpected error occurred." } } });
      }
      setLoading(false);
      fetchUsage();
    }
  }, [input, loading, addMessage, activeThreadId, limitError, fetchUsage, aiChat, callChatOrchestrator]);

  // ── Connection Wizard ──
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
      addMessage({ id: genId(), role: "assistant", content: `✅ **${connection.integration.name}** connected successfully! You can now use it.`, timestamp: new Date().toISOString(), toolResult: { type: "integration", data: { ...result, mode: "live" } } });
    }
  };
  const dismissConnection = () => setConnection({ integration: null, step: 0, configValues: {}, connecting: false, result: null });

  // ── Thread Management ──
  const newThread = () => { setActiveThreadId(null); setMessages([WELCOME_MESSAGE]); };
  const deleteThread = async (id: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (id === activeThreadId) newThread();
  };

  // ── Retry ──
  const handleRetry = (messageIndex: number) => {
    const userMsg = messages.slice(0, messageIndex).reverse().find((m) => m.role === "user");
    if (userMsg) send(userMsg.content);
  };

  // ── Export ──
  const handleExport = () => {
    const text = exportConversation(messages);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lanework-chat-${new Date().toISOString().split("T")[0]}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Clear ──
  const clearConversation = () => { setMessages([WELCOME_MESSAGE]); localStorage.removeItem(STORAGE_KEY); dismissConnection(); };

  // ── Keyboard ──
  // ── Knowledge Suggest ──
  const {
    query: suggestQuery,
    setQuery: setSuggestQuery,
    suggestions,
    loading: suggestLoading,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown: suggestKeyDown,
    dismiss: dismissSuggestions,
  } = useKnowledgeSuggest();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Let the suggest hook handle arrow keys and Tab first
    if (suggestions.length > 0 && ["ArrowUp", "ArrowDown", "Tab", "Escape"].includes(e.key)) {
      if (e.key === "Tab" && selectedIndex >= 0) {
        e.preventDefault();
        const chosen = suggestions[selectedIndex];
        setInput(chosen.title);
        setCharCount(chosen.title.length);
        dismissSuggestions();
        inputRef.current?.focus();
        return;
      }
      suggestKeyDown(e);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      dismissSuggestions();
      e.preventDefault();
      send();
    }
  };

  // ── Integration Handlers ──
  const handleIntegrationSelect = (integration: IntegrationSetup) => {
    setInput(`What can I do with ${integration.name}?`);
    inputRef.current?.focus();
  };
  const handleIntegrationConnect = (integration: IntegrationSetup) => startConnection(integration);

  return (
    <ErrorBoundary>
    <div className="flex h-screen bg-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Thread Sidebar */}
      <ThreadSidebar
        threads={threads} activeThreadId={activeThreadId}
        onSelect={(id) => setActiveThreadId(id)}
        onNew={newThread} onDelete={deleteThread}
        loading={threadsLoading} collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/80 bg-white/80 backdrop-blur-sm flex-shrink-0">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#2d2d4e] shadow-sm">
            <Bot className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#1a1a2e] leading-tight tracking-tight">Lanework</h1>
            <p className="text-[10px] text-gray-400 font-medium">AI logistics command center</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 ml-2 text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setShowActivity(!showActivity)}
              className={cn("p-2 rounded-xl transition-all", showActivity ? "bg-[#1a1a2e] text-white" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100")}
              title="Toggle agent activity feed" aria-label="Toggle agent activity"
            >
              <Activity className="h-4 w-4" />
            </button>
            <button onClick={handleExport} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all" title="Export conversation">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            </button>
            <button onClick={clearConversation} className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Clear conversation">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
            {/* Empty state */}
            {messages.length <= 1 && !loading && (
              <div className="text-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="relative inline-flex mb-6">
                  <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-[#1a1a2e] to-[#2d2d4e] shadow-lg shadow-[#1a1a2e]/20">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 border-2 border-white">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  What can I help with?
                </h2>
                <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto leading-relaxed">
                  Track shipments, check inventory, optimize routes, validate GSTINs, upload CSVs, and more — all through natural language.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={s.text} onClick={() => send(s.text)}
                      className="text-left p-4 rounded-2xl border border-gray-200 text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:shadow-md transition-all duration-200 bg-white group"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <span className="text-lg mr-2 group-hover:scale-110 inline-block transition-transform">{s.icon}</span>
                      <span className="font-medium">{s.text}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-6">
                  Powered by 15 AI integrations • Real-time data • Enterprise-grade security
                </p>
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

            {/* Streaming Response from Vercel AI SDK */}
            {loading && aiChat.isLoading && (
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1a1a2e]">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-gray-100 max-w-[80%]">
                  {/* Tool call indicators */}
                  {aiChat.toolIndicators.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {aiChat.toolIndicators.map((tc) => (
                        <span key={tc.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          <span className={cn("h-1.5 w-1.5 rounded-full", tc.status === "completed" ? "bg-emerald-500" : "bg-blue-500 animate-pulse")} />
                          {tc.integration}/{tc.action}
                          <span className="text-blue-400 text-[10px]">({tc.mode})</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Streaming text from Vercel AI SDK */}
                  {aiChat.messages.length > 0 ? (
                    <MessageBubble role="assistant" content={aiChat.messages[aiChat.messages.length - 1]?.content || ""} timestamp="" isStreaming />
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "200ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "400ms" }} />
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Non-streaming fallback loading */}
            {loading && !aiChat.isLoading && (
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

            {/* File upload indicator */}
            {uploadingFile && (
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1a1a2e]">
                  <Upload className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-gray-100">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
                    <span className="text-sm text-gray-500">Processing file...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Inline Connection Wizard */}
          {connection.integration && (
            <div className="max-w-2xl mx-auto px-4 pb-4">
              <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
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
                        <button onClick={dismissConnection} className="mt-2 text-xs font-medium underline">
                          {connection.result.success ? "Close" : "Try again"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-1 bg-gray-100">
                      <div className="h-full bg-[#1a1a2e] transition-all duration-300" style={{ width: `${(connection.step / connection.integration.setupSteps.length) * 100}%` }} />
                    </div>
                    {(() => {
                      const currentStep = connection.integration.setupSteps[connection.step - 1];
                      if (!currentStep) return null;
                      return (
                        <div className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="grid h-7 w-7 place-items-center rounded-full bg-[#1a1a2e] text-white text-xs font-bold flex-shrink-0">{currentStep.step}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-800">{currentStep.title}</h4>
                              <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap leading-relaxed">{currentStep.instruction}</p>
                              {currentStep.helpUrl && (
                                <a href={currentStep.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline">
                                  Open help page ↗
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
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <button onClick={prevConnectionStep} disabled={connection.step <= 1} className="text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30">← Previous</button>
                            {connection.step === connection.integration.setupSteps.length ? (
                              <button onClick={testConnection} disabled={connection.connecting}
                                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a2e] text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50"
                              >
                                {connection.connecting ? <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Connecting...</span> : "Test Connection"}
                              </button>
                            ) : (
                              <button onClick={advanceConnectionStep} className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a2e] text-white hover:bg-[#1a1a2e]/90">Next →</button>
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

        {/* Upgrade Banner — shown when limit is hit */}
        {limitError?.blocked && (
          <div className="px-4 py-3 bg-white border-t border-gray-200">
            <UpgradeBanner
              limitType="chat_messages"
              message={limitError.message}
              currentUsage={usageStats?.limits?.chatMessagesPerDay?.current || 0}
              limit={usageStats?.limits?.chatMessagesPerDay?.max || 10}
              currentPlan={usageStats?.planName || "Free"}
              upgradeName={limitError.upgradeName}
              upgradePrice={limitError.upgradePrice}
              upgradeUrl="/pricing"
              feature="chatMessagesPerDay"
              blocked={true}
              compact={false}
              onRetry={() => { setLimitError(null); fetchUsage(); }}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200/80 bg-white/80 backdrop-blur-sm flex-shrink-0">
          <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
            {/* Integration Pills */}
            <IntegrationPills onSelect={handleIntegrationSelect} onConnect={handleIntegrationConnect} />
            {/* Quick Actions */}
            <QuickActionsBar onAction={(template) => { setInput(template); inputRef.current?.focus(); }} />
            {/* Usage Progress Bar */}
            {usageStats && usageStats.limits.chatMessagesPerDay.max !== -1 && (
              <UsageProgressBar
                current={usageStats.limits.chatMessagesPerDay.current}
                max={usageStats.limits.chatMessagesPerDay.max}
                label="chats today"
                plan={usageStats.planName}
              />
            )}
            {/* Text Input + File Upload */}              <div className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors disabled:opacity-50"
                title="Upload CSV file" aria-label="Upload file"
              >
                {uploadingFile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
              </button>
              <VoiceInput
                onTranscript={(text) => { setInput(text); setTimeout(() => send(text), 100); }}
                disabled={loading}
              />
              <div className="flex-1 relative">
                <KnowledgeSuggestPopover
                  suggestions={suggestions}
                  loading={suggestLoading}
                  selectedIndex={selectedIndex}
                  onSelect={(s) => {
                    setInput(s.title);
                    setCharCount(s.title.length);
                    dismissSuggestions();
                    inputRef.current?.focus();
                  }}
                  visible={suggestions.length > 0 || suggestLoading}
                />
                <textarea ref={inputRef} value={input}
                  onChange={(e) => { if (e.target.value.length <= MAX_CHARS) { setInput(e.target.value); setCharCount(e.target.value.length); setSuggestQuery(e.target.value); } }}
                  onKeyDown={handleKeyDown} rows={1}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-16 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e] resize-none min-h-[48px] max-h-[120px]"
                  placeholder="Ask about shipments, inventory, routes, or upload a CSV..."
                  aria-label="Type your message"
                />
                <span className={cn("absolute bottom-2 right-2 text-[10px]", charCount > MAX_CHARS * 0.8 ? "text-amber-500" : "text-gray-400")}>
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
              <button onClick={() => send()} disabled={loading || !input.trim() || !!limitError?.blocked}
                className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white transition-all duration-200 shadow-sm",
                  loading || !input.trim() || limitError?.blocked ? "bg-gray-300 cursor-not-allowed" : "bg-gradient-to-br from-[#1a1a2e] to-[#2d2d4e] hover:shadow-md hover:scale-105"
                )}
                aria-label="Send message"
                title={limitError?.blocked ? "Daily chat limit reached — upgrade to continue" : "Send message"}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center">
              Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Shift+Enter</kbd> for new line · 📎 to upload CSV
            </p>
          </div>
        </div>
      </div>

      {/* Agent Activity Panel */}
      {showActivity && <AgentActivityPanel />}
    </div>
    </ErrorBoundary>
  );
}
