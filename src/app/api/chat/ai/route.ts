// @ts-nocheck — Vercel AI SDK tool() types are complex; runtime is correct
/**
 * POST /api/chat/ai — Vercel AI SDK endpoint for useChat hook.
 *
 * Handles streaming tool calls with MCP integrations.
 * Supports both OpenAI and Anthropic Claude (via AI_MODEL env var).
 */

import { NextRequest } from "next/server";
import { streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { withAuth } from "@/lib/auth";
import { callMcpAction } from "@/lib/mcp";
import { neon } from "@neondatabase/serverless";
import { getKBAgentContext } from "@/lib/knowledge";
import { logger } from "@/lib/logger";

const sql = neon(process.env.DATABASE_URL!);
const log = logger.child({ module: "chat-ai" });

// ── MCP Tool Definitions ──

const MCP_TOOLS = {
  trackShipment: tool({
    description: "Track a shipment by AWB number. Returns real-time status, location, and scan history.",
    parameters: {
      type: "object" as const,
      properties: {
        awb: { type: "string", description: "The AWB / tracking number" },
      },
      required: ["awb"],
    },
    execute: async ({ awb }: { awb: string }) => {
      return await callMcpAction("shiprocket", "track_shipment", { awb }) || { error: "Could not track shipment" };
    },
  }),

  compareShippingRates: tool({
    description: "Compare shipping rates across carriers for a route.",
    parameters: {
      type: "object" as const,
      properties: {
        pickupPincode: { type: "string", description: "6-digit pickup pincode" },
        deliveryPincode: { type: "string", description: "6-digit delivery pincode" },
        weight: { type: "number", description: "Package weight in kg" },
      },
      required: ["pickupPincode", "deliveryPincode"],
    },
    execute: async ({ pickupPincode, deliveryPincode, weight }: { pickupPincode: string; deliveryPincode: string; weight?: number }) => {
      return await callMcpAction("shiprocket", "compare_rates", {
        pickup_pincode: pickupPincode, delivery_pincode: deliveryPincode, weight: weight || 1,
      }) || { error: "Could not fetch rates" };
    },
  }),

  checkStock: tool({
    description: "Check inventory stock level for a specific SKU.",
    parameters: {
      type: "object" as const,
      properties: { sku: { type: "string", description: "The SKU or product code" } },
      required: ["sku"],
    },
    execute: async ({ sku }: { sku: string }) => {
      return await callMcpAction("tally_prime", "check_stock", { sku }) || { error: "Could not check stock" };
    },
  }),

  syncInventory: tool({
    description: "Sync inventory from TallyPrime or accounting system.",
    parameters: { type: "object" as const, properties: {} },
    execute: async () => {
      return await callMcpAction("tally_prime", "sync_inventory", {}) || { error: "Could not sync inventory" };
    },
  }),

  getWeather: tool({
    description: "Get current weather conditions for a location.",
    parameters: {
      type: "object" as const,
      properties: {
        lat: { type: "number", description: "Latitude" },
        lng: { type: "number", description: "Longitude" },
      },
    },
    execute: async ({ lat, lng }: { lat: number; lng: number }) => {
      return await callMcpAction("weather", "current_weather", { lat, lng }) || { error: "Could not fetch weather" };
    },
  }),

  getRouteWeather: tool({
    description: "Get weather conditions along a route (origin to destination).",
    parameters: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Origin city" },
        destination: { type: "string", description: "Destination city" },
      },
      required: ["origin", "destination"],
    },
    execute: async ({ origin, destination }: { origin: string; destination: string }) => {
      return await callMcpAction("weather", "route_weather", { origin, destination }) || { error: "Could not fetch route weather" };
    },
  }),

  optimizeRoute: tool({
    description: "Optimize a delivery route with multiple stops.",
    parameters: {
      type: "object" as const,
      properties: {
        origin: { type: "string" },
        destination: { type: "string" },
        stops: { type: "array", items: { type: "string" } },
      },
      required: ["origin", "destination"],
    },
    execute: async ({ origin, destination, stops }: { origin: string; destination: string; stops?: string[] }) => {
      return await callMcpAction("mapmyindia", "optimize_route", { origin, destination, stops: stops || [] }) || { error: "Could not optimize route" };
    },
  }),

  validateGSTIN: tool({
    description: "Validate an Indian GSTIN number.",
    parameters: {
      type: "object" as const,
      properties: { gstin: { type: "string", description: "15-character GSTIN" } },
      required: ["gstin"],
    },
    execute: async ({ gstin }: { gstin: string }) => {
      return await callMcpAction("gstn_eway_bill", "validate_gstin", { gstin }) || { error: "Could not validate GSTIN" };
    },
  }),

  trackFleet: tool({
    description: "Get fleet status — all vehicles, locations, alerts.",
    parameters: { type: "object" as const, properties: {} },
    execute: async () => {
      return await callMcpAction("loconav", "track_all", {}) || { error: "Could not fetch fleet" };
    },
  }),

  checkDriverLicense: tool({
    description: "Verify a driver's license.",
    parameters: {
      type: "object" as const,
      properties: { licenseNumber: { type: "string" } },
      required: ["licenseNumber"],
    },
    execute: async ({ licenseNumber }: { licenseNumber: string }) => {
      return await callMcpAction("compliance", "check_license", { license_number: licenseNumber }) || { error: "Could not verify license" };
    },
  }),

  checkVehicleRegistration: tool({
    description: "Verify a vehicle's RC (registration).",
    parameters: {
      type: "object" as const,
      properties: { registrationNumber: { type: "string" } },
      required: ["registrationNumber"],
    },
    execute: async ({ registrationNumber }: { registrationNumber: string }) => {
      return await callMcpAction("compliance", "check_registration", { registration_number: registrationNumber }) || { error: "Could not verify registration" };
    },
  }),

  syncOrders: tool({
    description: "Sync orders from Shopify or WooCommerce.",
    parameters: {
      type: "object" as const,
      properties: { platform: { type: "string", enum: ["shopify", "woocommerce"] } },
    },
    execute: async ({ platform }: { platform: string }) => {
      const integration = platform === "woocommerce" ? "woocommerce" : "shopify";
      return await callMcpAction(integration, "sync_orders", {}) || { error: "Could not sync orders" };
    },
  }),

  syncGoogleSheets: tool({
    description: "Sync data to/from Google Sheets.",
    parameters: {
      type: "object" as const,
      properties: { action: { type: "string", enum: ["read", "write"] }, sheetName: { type: "string" } },
    },
    execute: async ({ action, sheetName }: { action: string; sheetName?: string }) => {
      const mcpAction = action === "write" ? "write_sheet" : "read_sheet";
      return await callMcpAction("google_sheets", mcpAction, { sheetName: sheetName || "Sheet1" }) || { error: "Could not sync Sheets" };
    },
  }),
};

// ── System Prompt ──

function getSystemPrompt(kbContext?: string): string {
  return `You are Lanework Copilot, an AI logistics assistant for Indian MSMEs.

You help with: package tracking, inventory management, route optimization, fleet management, e-way bills, compliance checking, weather alerts, e-commerce sync, Google Sheets, and warehouse operations.

Rules:
- Always mention the data mode (live/simulated/db-fallback) when showing results
- For Indian context: use ₹ for currency, IST for times
- Be concise but helpful — logistics operators are busy
- If unsure, ask for clarification
- Never fabricate tracking numbers
${kbContext ? `\n\nKnowledge Base Context:\n${kbContext}` : ""}`;
}

// ── POST Handler ──

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: string; content: string }> };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages required", { status: 400 });
    }

    // Get KB context from last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    let kbContext = "";
    if (lastUserMsg) {
      try {
        const kb = await getKBAgentContext(lastUserMsg.content);
        if (kb.toolRecommendations.length > 0) {
          kbContext += `Available tools: ${kb.toolRecommendations.map((r) => r.tool).join(", ")}\n`;
        }
      } catch { /* best effort */ }
    }

    // Select model based on env
    const model = process.env.AI_MODEL === "claude"
      ? anthropic("claude-3-5-sonnet-20241022")
      : openai("gpt-4o-mini");

    const result = streamText({
      model,
      system: getSystemPrompt(kbContext),
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      tools: MCP_TOOLS,
      maxSteps: 5,
      temperature: 0.3,
      maxTokens: 2000,
    });

    return result.toDataStreamResponse();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log.error({ err: msg }, "Chat AI endpoint failed");
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
