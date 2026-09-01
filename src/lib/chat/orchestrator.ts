/**
 * Chat Orchestrator — Vercel AI SDK powered.
 *
 * Features:
 * - Multi-turn conversation context (message history from DB)
 * - Streaming LLM output with tool calls
 * - MCP tool execution with parallel capability
 * - Knowledge base context injection
 * - Cost tracking per conversation
 */

import { generateText, streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { callMcpAction, listMcpCoverage } from "@/lib/mcp";
import { getKBAgentContext } from "@/lib/knowledge";
import { neon } from "@neondatabase/serverless";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "chat-orchestrator" });

// ── Types ──

export interface ToolCallRecord {
  integration: string;
  action: string;
  input: Record<string, any>;
  output: any;
  mode: "live" | "simulated" | "db-fallback" | "error" | "dry_run";
  durationMs: number;
  errorMessage?: string;
}

export interface OrchestratorResult {
  reply: string;
  toolCalls: ToolCallRecord[];
  intent: string;
  requiresAuth: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: any;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ── Message History ──

export async function getThreadMessages(
  threadId: string,
  limit: number = 20
): Promise<ChatMessage[]> {
  try {
    const rows = await sql`
      SELECT id, role, content, tool_calls, metadata, created_at
      FROM chat_messages
      WHERE thread_id = ${threadId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.reverse().map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant" | "system",
      content: r.content,
      toolCalls: r.tool_calls,
      metadata: r.metadata,
      createdAt: r.created_at,
    }));
  } catch (e: unknown) {
    log.error({ err: e instanceof Error ? e.message : "unknown" }, "Failed to fetch thread messages");
    return [];
  }
}

// ── MCP Tool Definitions for Vercel AI ──

const MCP_TOOL_DEFINITIONS = {
  trackShipment: tool({
    description:
      "Track a shipment by AWB number. Returns real-time status, location, and scan history.",
    parameters: {
      type: "object" as const,
      properties: {
        awb: {
          type: "string",
          description: "The AWB / tracking number",
        },
      },
      required: ["awb"],
    },
    execute: async ({ awb }) => {
      const result = await callMcpAction("shiprocket", "track_shipment", {
        awb,
      });
      return result || { error: "Could not track shipment" };
    },
  }),

  compareShippingRates: tool({
    description:
      "Compare shipping rates across carriers for a route. Returns rates from multiple carriers.",
    parameters: {
      type: "object" as const,
      properties: {
        pickupPincode: {
          type: "string",
          description: "6-digit pickup pincode",
        },
        deliveryPincode: {
          type: "string",
          description: "6-digit delivery pincode",
        },
        weight: {
          type: "number",
          description: "Package weight in kg",
        },
      },
      required: ["pickupPincode", "deliveryPincode"],
    },
    execute: async ({ pickupPincode, deliveryPincode, weight }) => {
      const result = await callMcpAction("shiprocket", "compare_rates", {
        pickup_pincode: pickupPincode,
        delivery_pincode: deliveryPincode,
        weight: weight || 1,
      });
      return result || { error: "Could not fetch rates" };
    },
  }),

  checkStock: tool({
    description:
      "Check inventory stock level for a specific SKU or product.",
    parameters: {
      type: "object" as const,
      properties: {
        sku: {
          type: "string",
          description: "The SKU or product code",
        },
      },
      required: ["sku"],
    },
    execute: async ({ sku }) => {
      const result = await callMcpAction("tally_prime", "check_stock", {
        sku,
      });
      return result || { error: "Could not check stock" };
    },
  }),

  syncInventory: tool({
    description:
      "Sync inventory from TallyPrime or accounting system.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
    execute: async () => {
      const result = await callMcpAction("tally_prime", "sync_inventory", {});
      return result || { error: "Could not sync inventory" };
    },
  }),

  getWeather: tool({
    description:
      "Get current weather conditions for a location. Useful for route risk assessment.",
    parameters: {
      type: "object" as const,
      properties: {
        lat: { type: "number", description: "Latitude" },
        lng: { type: "number", description: "Longitude" },
        city: { type: "string", description: "City name (if lat/lng unknown)" },
      },
    },
    execute: async ({ lat, lng, city }) => {
      if (lat && lng) {
        const result = await callMcpAction("weather", "current_weather", {
          lat,
          lng,
        });
        return result || { error: "Could not fetch weather" };
      }
      return { error: "Please provide coordinates or a valid city name" };
    },
  }),

  getRouteWeather: tool({
    description:
      "Get weather conditions along a route (origin to destination). Shows risk assessment for each segment.",
    parameters: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Origin city" },
        destination: { type: "string", description: "Destination city" },
      },
      required: ["origin", "destination"],
    },
    execute: async ({ origin, destination }) => {
      const result = await callMcpAction("weather", "route_weather", {
        origin,
        destination,
      });
      return result || { error: "Could not fetch route weather" };
    },
  }),

  optimizeRoute: tool({
    description:
      "Optimize a delivery route with multiple stops. Returns the best order of stops.",
    parameters: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Starting location" },
        destination: { type: "string", description: "Final destination" },
        stops: {
          type: "array",
          items: { type: "string" },
          description: "Intermediate stops",
        },
      },
      required: ["origin", "destination"],
    },
    execute: async ({ origin, destination, stops }) => {
      const result = await callMcpAction("mapmyindia", "optimize_route", {
        origin,
        destination,
        stops: stops || [],
      });
      return result || { error: "Could not optimize route" };
    },
  }),

  validateGSTIN: tool({
    description: "Validate an Indian GSTIN number and return business details.",
    parameters: {
      type: "object" as const,
      properties: {
        gstin: {
          type: "string",
          description: "15-character GSTIN number",
        },
      },
      required: ["gstin"],
    },
    execute: async ({ gstin }) => {
      const result = await callMcpAction("gstn_eway_bill", "validate_gstin", {
        gstin,
      });
      return result || { error: "Could not validate GSTIN" };
    },
  }),

  generateEwayBill: tool({
    description: "Generate an e-way bill for a shipment.",
    parameters: {
      type: "object" as const,
      properties: {
        shipmentId: { type: "string" },
        fromGstin: { type: "string" },
        toGstin: { type: "string" },
        invoiceValue: { type: "number" },
        hsnCode: { type: "string" },
      },
    },
    execute: async (params) => {
      const result = await callMcpAction(
        "gstn_eway_bill",
        "generate_ewb",
        params
      );
      return result || { error: "Could not generate e-way bill" };
    },
  }),

  trackFleet: tool({
    description:
      "Get fleet status — all vehicles, their locations, and alerts.",
    parameters: {
      type: "object" as const,
      properties: {},
    },
    execute: async () => {
      const result = await callMcpAction("loconav", "track_all", {});
      return result || { error: "Could not fetch fleet status" };
    },
  }),

  checkDriverLicense: tool({
    description: "Verify a driver's license and check validity.",
    parameters: {
      type: "object" as const,
      properties: {
        licenseNumber: { type: "string", description: "License number" },
      },
      required: ["licenseNumber"],
    },
    execute: async ({ licenseNumber }) => {
      const result = await callMcpAction("compliance", "check_license", {
        license_number: licenseNumber,
      });
      return result || { error: "Could not verify license" };
    },
  }),

  checkVehicleRegistration: tool({
    description: "Verify a vehicle's RC (registration) and compliance status.",
    parameters: {
      type: "object" as const,
      properties: {
        registrationNumber: {
          type: "string",
          description: "Vehicle registration number",
        },
      },
      required: ["registrationNumber"],
    },
    execute: async ({ registrationNumber }) => {
      const result = await callMcpAction(
        "compliance",
        "check_registration",
        { registration_number: registrationNumber }
      );
      return result || { error: "Could not verify registration" };
    },
  }),

  syncOrders: tool({
    description:
      "Sync orders from Shopify, WooCommerce, or other e-commerce platforms.",
    parameters: {
      type: "object" as const,
      properties: {
        platform: {
          type: "string",
          enum: ["shopify", "woocommerce"],
          description: "E-commerce platform",
        },
      },
    },
    execute: async ({ platform }) => {
      const integration = platform === "woocommerce" ? "woocommerce" : "shopify";
      const result = await callMcpAction(integration, "sync_orders", {});
      return result || { error: "Could not sync orders" };
    },
  }),

  syncGoogleSheets: tool({
    description: "Sync data to/from Google Sheets.",
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["read", "write"],
        },
        sheetName: { type: "string" },
      },
    },
    execute: async ({ action, sheetName }) => {
      const mcpAction = action === "write" ? "write_sheet" : "read_sheet";
      const result = await callMcpAction("google_sheets", mcpAction, {
        sheetName: sheetName || "Sheet1",
      });
      return result || { error: "Could not sync Google Sheets" };
    },
  }),
};

// ── System Prompt ──

function buildSystemPrompt(kbContext?: string): string {
  return `You are Lanework Copilot, an AI logistics assistant for Indian MSMEs.

You help with:
- Package tracking (Shiprocket, FedEx, DHL)
- Inventory management (TallyPrime, ERP)
- Route optimization (MapmyIndia)
- Fleet management (LocoNav, FleetX)
- E-way bill generation (GSTN)
- Compliance checking (license, RC, challans)
- Weather-based route risk assessment
- E-commerce order sync (Shopify, WooCommerce)
- Google Sheets data sync
- Warehouse operations

Rules:
- Always mention the data mode (live/simulated/db-fallback) when showing results
- For Indian context: use ₹ for currency, IST for times, Indian city names
- Be concise but helpful — logistics operators are busy
- If unsure, ask for clarification rather than guessing
- Never fabricate tracking numbers or shipment status
${kbContext ? `\n\nKnowledge Base Context:\n${kbContext}` : ""}`;
}

// ── Main Orchestrator with Vercel AI SDK ──

export async function orchestrate(
  userMessage: string,
  userId: string,
  threadId?: string
): Promise<OrchestratorResult> {
  const toolCalls: ToolCallRecord[] = [];

  // 1. Get conversation history for multi-turn context
  let messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (threadId) {
    const history = await getThreadMessages(threadId, 10);
    messages = history.map((m) => ({
      role: m.role === "system" ? "user" : m.role,
      content: m.content,
    }));
  }

  // Add current message
  messages.push({ role: "user", content: userMessage });

  // 2. Get knowledge base context
  let kbContext = "";
  try {
    const kb = await getKBAgentContext(userMessage);
    if (kb.toolRecommendations.length > 0) {
      kbContext += `Tool recommendations: ${kb.toolRecommendations.map((r) => r.tool).join(", ")}\n`;
    }
    if (kb.mentionedEntities.length > 0) {
      kbContext += `Related entities: ${kb.mentionedEntities.join(", ")}\n`;
    }
  } catch {
    // Best effort
  }

  // 3. Generate with Vercel AI SDK — try OpenAI first, fallback to Claude
  const model = process.env.AI_MODEL === "claude" ? anthropic("claude-3-5-sonnet-20241022") : openai("gpt-4o-mini");
  try {
    const result = await generateText({
      model,
      system: buildSystemPrompt(kbContext),
      messages,
      tools: MCP_TOOL_DEFINITIONS,
      maxSteps: 5, // Allow up to 5 sequential tool calls
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Extract tool calls from the result
    for (const step of result.steps) {
      for (const toolCall of step.toolCalls) {
        // Find the matching tool execution result
        const toolResult = step.toolResults?.find(
          (r: any) => r.toolCallId === toolCall.toolCallId
        );
        toolCalls.push({
          integration: toolCall.toolName,
          action: toolCall.toolName,
          input: toolCall.args as Record<string, any>,
          output: toolResult?.result || null,
          mode: toolResult?.result?.mode || "simulated",
          durationMs: 0,
        });
      }
    }

    return {
      reply: result.text,
      toolCalls,
      intent: toolCalls.length > 0 ? toolCalls[0].action : "general",
      requiresAuth: false,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log.error({ err: msg }, "AI generation failed");

    // Fallback to rule-based orchestrator
    return orchestrateFallback(userMessage, toolCalls);
  }
}

// ── Streaming Orchestrator ──

export async function orchestrateStream(
  userMessage: string,
  userId: string,
  threadId?: string
) {
  // Get conversation history
  let messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (threadId) {
    const history = await getThreadMessages(threadId, 10);
    messages = history.map((m) => ({
      role: m.role === "system" ? "user" : m.role,
      content: m.content,
    }));
  }

  messages.push({ role: "user", content: userMessage });

  // Get KB context
  let kbContext = "";
  try {
    const kb = await getKBAgentContext(userMessage);
    if (kb.toolRecommendations.length > 0) {
      kbContext += `Available tools: ${kb.toolRecommendations.map((r) => r.tool).join(", ")}\n`;
    }
  } catch {
    // Best effort
  }

  const streamModel = process.env.AI_MODEL === "claude" ? anthropic("claude-3-5-sonnet-20241022") : openai("gpt-4o-mini");
  const stream = streamText({
    model: streamModel,
    system: buildSystemPrompt(kbContext),
    messages,
    tools: MCP_TOOL_DEFINITIONS,
    maxSteps: 5,
    temperature: 0.3,
    maxTokens: 2000,
  });

  return stream;
}

// ── Fallback (rule-based, no AI) ──

async function orchestrateFallback(
  userMessage: string,
  toolCalls: ToolCallRecord[]
): Promise<OrchestratorResult> {
  // Import the old intent detection
  const { detectIntents } = await import("./intent-detect");

  const intents = detectIntents(userMessage);

  if (intents.length === 0) {
    return {
      reply:
        "I can help with that! Could you provide more details? For example, a tracking number, location, or specific item.",
      toolCalls: [],
      intent: "general",
      requiresAuth: false,
    };
  }

  // Execute tool calls in parallel
  const primary = intents[0];
  const executionPromises = intents.map(async (intent) => {
    if (!intent.integration || !intent.action) return null;

    const start = Date.now();
    try {
      const result = await callMcpAction(
        intent.integration,
        intent.action,
        intent.params
      );
      return {
        integration: intent.integration,
        action: intent.action,
        input: intent.params,
        output: result,
        mode: (result?.mode || "simulated") as ToolCallRecord["mode"],
        durationMs: Date.now() - start,
      };
    } catch (e: any) {
      return {
        integration: intent.integration,
        action: intent.action,
        input: intent.params,
        output: null,
        mode: "error" as const,
        durationMs: Date.now() - start,
        errorMessage: e.message,
      };
    }
  });

  const results = await Promise.all(executionPromises);
  for (const r of results) {
    if (r) toolCalls.push(r);
  }

  const reply = generateFallbackReply(primary.intent, toolCalls);

  return {
    reply,
    toolCalls,
    intent: primary.intent,
    requiresAuth: false,
  };
}

// ── Fallback Reply Generator ──

function generateFallbackReply(
  intent: string,
  toolCalls: ToolCallRecord[]
): string {
  if (toolCalls.length === 0) {
    return "I can help with that! Could you provide more details?";
  }

  const tc = toolCalls[0];
  const modeNote =
    tc.mode === "live"
      ? ""
      : tc.mode === "db-fallback"
        ? " _(using cached data)_"
        : tc.mode === "error"
          ? " _(API error — showing fallback)_"
          : " _(demo mode — configure API keys for live data)_";

  const output = tc.output;
  if (!output || output.error) {
    return `I couldn't complete that request. ${output?.error || "Unknown error"} ${modeNote}`;
  }

  return `Here's what I found:\n\n\`\`\`json\n${JSON.stringify(output, null, 2).slice(0, 1500)}\n\`\`\`${modeNote}`;
}
