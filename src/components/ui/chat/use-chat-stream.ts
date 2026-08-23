/**
 * useChatStream — React hook for SSE-based chat streaming.
 *
 * Connects to /api/chat/stream via fetch + ReadableStream,
 * receives tool_call and token events, and builds the reply incrementally.
 *
 * Usage:
 *   const { send, streaming, content, toolCalls, error } = useChatStream();
 *   send("Where's my shipment?");
 *   // streaming === true while receiving
 *   // content builds up token by token
 *   // toolCalls populates as tools execute
 */

"use client";

import { useState, useRef, useCallback } from "react";

export interface StreamToolCall {
  integration: string;
  action: string;
  mode: string;
  durationMs: number;
}

export interface StreamResult {
  threadId: string;
  messageId: string;
  content: string;
  toolCalls: StreamToolCall[];
}

interface UseChatStreamOptions {
  onToken?: (token: string) => void;
  onToolCall?: (tc: StreamToolCall) => void;
  onDone?: (result: StreamResult) => void;
  onError?: (error: string) => void;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const { onToken, onToolCall, onDone, onError } = options;

  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState("");
  const [toolCalls, setToolCalls] = useState<StreamToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StreamResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef("");

  const send = useCallback(
    async (message: string, threadId?: string) => {
      if (streaming) return;

      // Get auth token from localStorage
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("lanework-token") || localStorage.getItem("token")
          : null;

      if (!token) {
        const errMsg = "Not authenticated — please log in again.";
        setError(errMsg);
        onError?.(errMsg);
        return;
      }

      setStreaming(true);
      setContent("");
      setToolCalls([]);
      setError(null);
      setResult(null);
      contentRef.current = "";

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message, threadId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: "Stream failed" }));
          const errMsg = errBody.error || `HTTP ${res.status}`;
          setError(errMsg);
          onError?.(errMsg);
          setStreaming(false);
          return;
        }

        // Read SSE stream
        const reader = res.body?.getReader();
        if (!reader) {
          setError("No response stream");
          setStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);

              if (currentEvent === "token") {
                try {
                  const data = JSON.parse(dataStr);
                  contentRef.current += data.text;
                  setContent(contentRef.current);
                  onToken?.(data.text);
                } catch {}
              } else if (currentEvent === "tool_call") {
                try {
                  const data = JSON.parse(dataStr);
                  setToolCalls((prev) => [...prev, data]);
                  onToolCall?.(data);
                } catch {}
              } else if (currentEvent === "done") {
                try {
                  const data = JSON.parse(dataStr);
                  setResult(data);
                  onDone?.(data);
                } catch {}
              } else if (currentEvent === "error") {
                try {
                  const data = JSON.parse(dataStr);
                  setError(data.error);
                  onError?.(data.error);
                } catch {}
              }

              currentEvent = "";
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          const errMsg = err.message || "Stream connection failed";
          setError(errMsg);
          onError?.(errMsg);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [streaming, onToken, onToolCall, onDone, onError]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setContent("");
    setToolCalls([]);
    setError(null);
    setResult(null);
    contentRef.current = "";
  }, []);

  return {
    send,
    streaming,
    content,
    toolCalls,
    error,
    result,
    abort,
    reset,
  };
}
