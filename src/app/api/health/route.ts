/**
 * GET /api/health — Health check endpoint for monitoring, uptime checks, and load balancers.
 * Returns system status, DB connectivity, and version info.
 */

import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database check
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const dbStart = Date.now();
    await sql`SELECT 1`;
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (e: any) {
    checks.database = { status: "error", error: e.message };
  }

  // Environment check
  const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET"];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  checks.environment = missingVars.length === 0
    ? { status: "ok" }
    : { status: "error", error: `Missing: ${missingVars.join(", ")}` };

  // MCP servers check
  const mcpServers = [
    "shiprocket", "tally", "ewaybill", "mapmyindia", "fleet",
    "fedex", "shopify", "googlesheets", "erp", "compliance",
    "email", "weather", "wms", "scanner", "dockscheduler",
  ];
  const configuredMCPs = mcpServers.filter(s => {
    const envMap: Record<string, string[]> = {
      shiprocket: ["SHIPROCKET_EMAIL"],
      weather: ["OPENWEATHER_API_KEY"],
      mapmyindia: ["MAPMYINDIA_API_KEY"],
      fedex: ["FEDEX_API_KEY"],
      shopify: ["SHOPIFY_ACCESS_TOKEN"],
      googlesheets: ["GOOGLE_SHEETS_API_KEY"],
      erp: ["SAP_SERVICE_LAYER_URL"],
    };
    return (envMap[s] || []).some(k => !!process.env[k]);
  });
  checks.mcpServers = { status: "ok", latencyMs: configuredMCPs.length };

  const overallStatus = Object.values(checks).every(c => c.status === "ok") ? "healthy" : "degraded";

  return NextResponse.json(
    {
      status: overallStatus,
      version: process.env.npm_package_version || "1.0.0",
      uptime: Math.round(process.uptime()),
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
      checks,
      mcpServers: {
        total: mcpServers.length,
        configured: configuredMCPs.length,
        names: configuredMCPs,
      },
    },
    { status: overallStatus === "healthy" ? 200 : 503 }
  );
}
