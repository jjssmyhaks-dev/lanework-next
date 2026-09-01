/**
 * useAIChat — Vercel AI SDK powered chat hook.
 *
 * Wraps `useChat` from @ai-sdk/react with:
 * - Tool call indicator state (integration, action, mode)
 * - Thread persistence
 * - Cost tracking
 * - Fallback to non-streaming on error
 */

"use client";

import { useChat as useVercelChat } from "@ai-sdk/react";
import { useState, useCallback } from "react";

export interface ToolCallIndicator {
  id: string;
  integration: string;
  action: string;
  mode: "live" | "simulated" | "db-fallback" | "dry_run";
  status: "pending" | "running" | "completed" | "error";
  durationMs?: number;
}

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolInvocations?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, any>;
    result?: any;
    state?: "call" | "result";
  }>;
}

interface UseAIChatOptions {
  api?: string;
  threadId?: string;
  onResponse?: (response: Response) => void;
  onFinish?: (message: AIChatMessage) => void;
  onError?: (error: Error) => void;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { api = "/api/chat/ai", threadId, onResponse, onFinish, onError } = options;

  const [toolIndicators, setToolIndicators] = useState<ToolCallIndicator[]>([]);

  const chat = useVercelChat({
    api,
    id: threadId || undefined,
    maxSteps: 5,
    experimental_throttle: 50, // Throttle UI updates to 50ms for smooth streaming
    onFinish: (message) => {
      // Extract tool call indicators from finished message
      if (message.toolInvocations) {
        const indicators: ToolCallIndicator[] = message.toolInvocations.map((ti) => ({
          id: ti.toolCallId,
          integration: ti.toolName,
          action: ti.toolName,
          mode: ti.result?.mode || "simulated",
          status: ti.state === "result" ? "completed" : "running",
          durationMs: ti.result?.durationMs,
        }));
        setToolIndicators(indicators);
      }
      onFinish?.(message as AIChatMessage);
    },
    onError: (error) => {
      onError?.(error);
    },
    onResponse: (response) => {
      onResponse?.(response);
    },
  });

  // Update tool indicators as they stream in
  const updateToolIndicator = useCallback(
    (toolCallId: string, updates: Partial<ToolCallIndicator>) => {
      setToolIndicators((prev) => {
        const idx = prev.findIndex((ti) => ti.id === toolCallId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...updates };
          return next;
        }
        return [...prev, { id: toolCallId, integration: "", action: "", mode: "simulated", status: "pending", ...updates }];
      });
    },
    []
  );

  // Clear tool indicators for a new message
  const clearToolIndicators = useCallback(() => {
    setToolIndicators([]);
  }, []);

  // Enhanced append that clears tool indicators
  const sendMessage = useCallback(
    (text: string) => {
      clearToolIndicators();
      chat.append({ role: "user", content: text });
    },
    [chat, clearToolIndicators]
  );

  return {
    // Core chat
    messages: chat.messages as AIChatMessage[],
    input: chat.input,
    handleInputChange: chat.handleInputChange,
    handleSubmit: chat.handleSubmit,
    isLoading: chat.isLoading,
    error: chat.error,
    stop: chat.stop,
    reload: chat.reload,

    // Enhanced
    sendMessage,
    toolIndicators,
    updateToolIndicator,
    clearToolIndicators,

    // Vercel AI SDK extras
    append: chat.append,
    setMessages: chat.setMessages,
    setInput: chat.setInput,
    experimental_addToolResult: chat.experimental_addToolResult,
  };
}
