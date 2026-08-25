"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Command, ArrowRight, Package, Map, Truck, BarChart3, Settings, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: any;
  href: string;
  category: string;
}

const COMMANDS: CommandItem[] = [
  { id: "chat", label: "Open Chat", description: "Talk to your AI copilot", icon: MessageSquare, href: "/chat", category: "Navigation" },
  { id: "shipments", label: "Shipments", description: "Track and manage shipments", icon: Package, href: "/shipment", category: "Navigation" },
  { id: "inventory", label: "Inventory", description: "Check stock levels", icon: BarChart3, href: "/inventory", category: "Navigation" },
  { id: "fleet", label: "Fleet", description: "Track vehicles and drivers", icon: Truck, href: "/fleet", category: "Navigation" },
  { id: "routes", label: "Routes", description: "Optimize delivery routes", icon: Map, href: "/routes", category: "Navigation" },
  { id: "dashboard", label: "Dashboard", description: "Overview of operations", icon: BarChart3, href: "/dashboard", category: "Navigation" },
  { id: "agents", label: "AI Agents", description: "Manage autonomous agents", icon: Settings, href: "/agents", category: "Navigation" },
  { id: "integrations", label: "Integrations", description: "Connect external services", icon: Settings, href: "/integrations", category: "Navigation" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleOpen();
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleOpen]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const execute = (cmd: CommandItem) => {
    setOpen(false);
    router.push(cmd.href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter" && filtered[selectedIndex]) execute(filtered[selectedIndex]);
            }}
            className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 outline-none bg-transparent"
            placeholder="Search pages, actions, or type a command..."
            aria-label="Search commands"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-400 font-mono">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => execute(cmd)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                    i === selectedIndex ? "bg-gray-100" : "hover:bg-gray-50"
                  )}
                  aria-selected={i === selectedIndex}
                  role="option"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gray-50">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{cmd.label}</p>
                    {cmd.description && <p className="text-xs text-gray-400 truncate">{cmd.description}</p>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center gap-4 text-[10px] text-gray-400">
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono">Enter</kbd> Select</span>
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
