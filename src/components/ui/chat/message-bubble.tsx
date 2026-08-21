"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, User, ThumbsUp, ThumbsDown, Clock, Copy, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import ToolResultCard from "./tool-result-card";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolResult?: {
    type: "shipment" | "inventory" | "route" | "integration" | "error" | "report";
    data: any;
  } | null;
  onRetry?: () => void;
  onFeedback?: (type: "up" | "down") => void;
  isStreaming?: boolean;
}

// Simple markdown renderer supporting bold, italic, links, code, lists
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const rendered: React.ReactNode[] = [];
  let i = 0;
  let listItems: React.ReactNode[] = [];
  let inList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      rendered.push(<ul key={`list-${rendered.length}`} className="list-disc pl-4 space-y-1 my-2">{listItems}</ul>);
      listItems = [];
    }
    inList = false;
  };

  const renderInline = (line: string): React.ReactNode => {
    // Bold: **text**
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Process inline elements
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
      const codeMatch = remaining.match(/^(.*?)`([^`]+)`/);
      const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/);
      const italicMatch = remaining.match(/^(.*?)\*(.+?)\*/);

      // Find earliest match
      const candidates = [
        { match: boldMatch, type: "bold" as const },
        { match: codeMatch, type: "code" as const },
        { match: linkMatch, type: "link" as const },
        { match: italicMatch, type: "italic" as const },
      ].filter(c => c.match);

      if (candidates.length === 0) {
        if (remaining) {
          parts.push(<span key={key++}>{remaining}</span>);
        }
        break;
      }

      candidates.sort((a, b) => (a.match![1]?.length || 0) - (b.match![1]?.length || 0));
      const candidate = candidates[0];
      const m = candidate.match!;

      if (m[1]) parts.push(<span key={key++}>{m[1]}</span>);

      if (candidate.type === "bold") {
        parts.push(<strong key={key++}>{m[2]}</strong>);
      } else if (candidate.type === "code") {
        parts.push(<code key={key++} className="text-[13px] font-mono bg-gray-100 px-1 py-0.5 rounded">{m[2]}</code>);
      } else if (candidate.type === "link") {
        parts.push(<a key={key++} href={m[3]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{m[2]}</a>);
      } else if (candidate.type === "italic") {
        parts.push(<em key={key++}>{m[2]}</em>);
      }

      remaining = remaining.slice(m[0].length);
    }

    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block
    if (trimmed.startsWith("```")) {
      flushList();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      rendered.push(
        <pre key={`code-${rendered.length}`} className="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto">
          <code className="text-xs font-mono text-gray-700">{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      inList = true;
      listItems.push(<li key={listItems.length} className="text-sm">{renderInline(ulMatch[1])}</li>);
      i++;
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      flushList();
      const olItems: React.ReactNode[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\d+\.\s+(.+)/);
        if (!m) break;
        olItems.push(<li key={olItems.length} className="text-sm">{renderInline(m[1])}</li>);
        i++;
      }
      rendered.push(<ol key={`ol-${rendered.length}`} className="list-decimal pl-4 space-y-1 my-2">{olItems}</ol>);
      continue;
    }

    // Not a list item — flush any pending list
    if (inList) flushList();

    // Heading
    if (trimmed.startsWith("### ")) {
      rendered.push(<h3 key={`h3-${rendered.length}`} className="text-sm font-bold text-gray-800 mt-3 mb-1">{renderInline(trimmed.slice(4))}</h3>);
    } else if (trimmed.startsWith("## ")) {
      rendered.push(<h2 key={`h2-${rendered.length}`} className="text-base font-bold text-gray-800 mt-3 mb-1">{renderInline(trimmed.slice(3))}</h2>);
    } else if (trimmed.startsWith("# ")) {
      rendered.push(<h1 key={`h1-${rendered.length}`} className="text-lg font-bold text-gray-800 mt-3 mb-1">{renderInline(trimmed.slice(2))}</h1>);
    } else if (trimmed === "") {
      rendered.push(<div key={`br-${rendered.length}`} className="h-2" />);
    } else {
      rendered.push(<p key={`p-${rendered.length}`} className="text-sm leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }

  if (inList) flushList();

  return <>{rendered}</>;
}

// Streaming text animation
function StreamingText({ text, speed }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) { setDone(true); return; }

    const words = text.split(/(\s+)/);
    const delay = speed || 8;
    let idx = 0;

    const interval = setInterval(() => {
      if (idx >= words.length) {
        clearInterval(interval);
        setDone(true);
        return;
      }
      setDisplayed(prev => prev + words[idx]);
      idx++;
    }, delay);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <div>
      <SimpleMarkdown text={displayed} />
      {!done && <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" />}
    </div>
  );
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  toolResult,
  onRetry,
  onFeedback,
  isStreaming,
}: MessageBubbleProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFeedback = (type: "up" | "down") => {
    setFeedback(type);
    onFeedback?.(type);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const relativeTime = (ts: string) => {
    if (!ts) return "";
    try {
      const diff = Date.now() - new Date(ts).getTime();
      if (diff < 60000) return "just now";
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return new Date(ts).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch { return ts; }
  };

  return (
    <div className={cn("flex gap-3", role === "user" ? "justify-end" : "justify-start")}>
      {/* Avatar */}
      {role === "assistant" && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={cn("flex flex-col gap-1 max-w-[85%] sm:max-w-[75%]")}>
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            role === "user"
              ? "bg-black text-white rounded-br-md"
              : "bg-gray-100 text-gray-800 rounded-bl-md"
          )}
        >
          {role === "user" ? (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          ) : isStreaming ? (
            <StreamingText text={content} />
          ) : (
            <SimpleMarkdown text={content} />
          )}
        </div>

        {/* Tool result card */}
        {toolResult && (
          <div className="mt-1">
            <ToolResultCard
              type={toolResult.type}
              data={toolResult.data}
              onRetry={onRetry}
            />
          </div>
        )}

        {/* Timestamp & actions */}
        <div className={cn(
          "flex items-center gap-2 group",
          role === "user" ? "justify-end" : "justify-start"
        )}>
          <span className="text-[10px] text-gray-400" title={timestamp}>
            {relativeTime(timestamp)}
          </span>

          {/* Copy button — always visible */}
          <button
            onClick={handleCopy}
            className="p-0.5 rounded hover:bg-gray-100 transition-colors text-gray-300 hover:text-gray-600"
            title="Copy message"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>

          {role === "assistant" && !isStreaming && onRetry && (
            <button
              onClick={onRetry}
              className="p-0.5 rounded hover:bg-gray-100 transition-colors text-gray-300 hover:text-gray-600"
              title="Regenerate"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}

          {role === "assistant" && !isStreaming && onFeedback && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => handleFeedback("up")}
                className={cn(
                  "p-0.5 rounded hover:bg-gray-100 transition-colors",
                  feedback === "up" ? "text-emerald-600" : "text-gray-300"
                )}
                title="Helpful"
              >
                <ThumbsUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleFeedback("down")}
                className={cn(
                  "p-0.5 rounded hover:bg-gray-100 transition-colors",
                  feedback === "down" ? "text-red-600" : "text-gray-300"
                )}
                title="Not helpful"
              >
                <ThumbsDown className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User avatar */}
      {role === "user" && (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-400 flex-shrink-0">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
}
