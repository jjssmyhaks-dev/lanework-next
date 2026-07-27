"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Where is my shipment #SH-2024?",
  "Show me low-stock inventory items",
  "Optimize routes for today's deliveries",
  "Generate a warehouse task summary",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Hi! I'm your logistics AI copilot. Ask me about shipments, inventory, routes, or anything logistics. How can I help?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reasoning",
          data: { agentId: "copilot", taskType: "user_query", context: msg }
        }),
      });
      if (res.status === 401) {
        setMessages(prev => [...prev, { role: "assistant", content: "Please sign in to use the copilot." }]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.result || data.error || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[#e5e7eb] bg-white">
        <Link href="/dashboard" className="text-[#6b7280] hover:text-[#1a1a2e]"><ArrowLeft className="h-5 w-5" /></Link>
        <Bot className="h-5 w-5 text-[#1a1a2e]" />
        <h1 className="text-lg font-semibold text-[#1a1a2e]">Chat Copilot</h1>
        <span className="ml-auto text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Online</span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1a1a2e]"><Bot className="h-4 w-4 text-white" /></div>}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%] ${
                m.role === "user" ? "bg-[#1a1a2e] text-white" : "bg-[#f3f4f6] text-[#1a1a2e]"
              }`}>{m.content}</div>
              {m.role === "user" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#6b7280]"><User className="h-4 w-4 text-white" /></div>}
            </div>
          ))}
          {loading && <div className="flex gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1a1a2e]"><Bot className="h-4 w-4 text-white" /></div><div className="rounded-2xl px-4 py-3 bg-[#f3f4f6]"><Loader2 className="h-4 w-4 animate-spin text-[#6b7280]" /></div></div>}
          <div ref={endRef} />
        </div>

        {/* Empty state suggestions */}
        {messages.length <= 1 && (
          <div className="max-w-2xl mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} className="text-left p-3 rounded-xl border border-[#e5e7eb] text-sm text-[#6b7280] hover:border-[#1a1a2e] hover:text-[#1a1a2e] transition-all">{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-[#e5e7eb] bg-white">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            className="flex-1 rounded-full border border-[#d1d5db] px-5 py-3 text-sm text-[#1a1a2e] placeholder:text-[#9ca3af] focus:border-[#1a1a2e] focus:outline-none focus:ring-1 focus:ring-[#1a1a2e]"
            placeholder="Ask about shipments, inventory, routes..." />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#1a1a2e] text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
