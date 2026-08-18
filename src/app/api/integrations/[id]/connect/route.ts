import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import { getIntegrationSetup } from "@/lib/integration-setup";
import { withAuth } from "@/lib/auth";

/**
 * POST /api/integrations/[id]/connect
 * Connect/save configuration for an integration.
 * Body: { config: Record<string, string> }
 * Validates required env vars for the integration.
 */
export const POST = withAuth(async (request, _user, ctx) => {
  try {
    const { id } = await (ctx!.params! as any);
    const body = await request.json();
    const { config } = body;

    const sql = neon(process.env.DATABASE_URL!);
    const setup = getIntegrationSetup(id);

    if (!setup) {
      return NextResponse.json(
        { success: false, error: `Unknown integration: ${id}` },
        { status: 404 }
      );
    }

    // Validate required config fields
    const missing: string[] = [];
    const normalizedConfig: Record<string, string> = {};

    if (config && typeof config === "object") {
      for (const [key, value] of Object.entries(config)) {
        if (typeof value === "string" && value.trim()) {
          normalizedConfig[key] = value.trim();
        }
      }
    }

    // Check required env vars (if not already in process.env)
    for (const envVar of setup.requiredEnvVars) {
      const inConfig = normalizedConfig[envVar];
      const inEnv = process.env[envVar];
      if (!inConfig && !inEnv) {
        // Check if config has the lowercase or snake-case variant
        const variants = [
          normalizedConfig[envVar.toLowerCase()],
          normalizedConfig[envVar.replace(/_/g, "-")],
        ];
        if (variants.some(v => v)) continue;
        missing.push(envVar);
      }
    }

    if (missing.length > 0 && Object.keys(normalizedConfig).length > 0) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields",
        missingFields: missing,
        message: `Please provide: ${missing.join(", ")}`,
        hint: `Check the setup guide for ${setup.name} to find each value.`,
      });
    }

    // Upsert into integrations table
    const existing = await sql`SELECT id FROM integrations WHERE integration_type = ${id}`;
    let integrationId: string;

    if (existing.length > 0) {
      integrationId = existing[0].id;
      await sql`
        UPDATE integrations 
        SET config = coalesce(config, '{}'::jsonb) || ${JSON.stringify(normalizedConfig)}::jsonb,
            status = 'connected',
            updated_at = NOW()
        WHERE id = ${integrationId}
      `;
    } else {
      integrationId = crypto.randomUUID();
      await sql`
        INSERT INTO integrations (id, integration_type, config, status, created_at, updated_at)
        VALUES (${integrationId}, ${id}, ${JSON.stringify(normalizedConfig)}::jsonb, 'connected', NOW(), NOW())
      `;
    }

    return NextResponse.json({
      success: true,
      mode: "connected",
      integration: {
        id: integrationId,
        type: id,
        name: setup.name,
        config: normalizedConfig,
        status: "connected",
        connectedAt: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, mode: "error", error: e.message },
      { status: 500 }
    );
  }
});

/**
 * GET /api/integrations/[id]/connect
 * Returns the current connection status and setup metadata for an integration.
 */
export const GET = withAuth(async (_request, _user, ctx) => {
  try {
    const { id } = await (ctx!.params! as any);
    const sql = neon(process.env.DATABASE_URL!);
    const setup = getIntegrationSetup(id);

    if (!setup) {
      return NextResponse.json({ error: `Unknown integration: ${id}` }, { status: 404 });
    }

    // Check DB for existing connection
    let connected: any = null;
    try {
      const rows = await sql`SELECT * FROM integrations WHERE integration_type = ${id}`;
      if (rows.length > 0) connected = rows[0];
    } catch {
      // Table may not exist
    }

    // Check which env vars are configured
    const envStatus = [...setup.requiredEnvVars, ...(setup.optionalEnvVars || [])].map(
      (key) => ({
        key,
        configured: !!(process.env[key] || connected?.config?.[key]),
        inEnv: !!process.env[key],
        inConfig: !!(connected?.config?.[key]),
      })
    );

    return NextResponse.json({
      integration: {
        id,
        name: setup.name,
        icon: setup.icon,
        category: setup.category,
        description: setup.description,
        setup,
        connected: !!connected,
        status: connected?.status || "not_connected",
        config: connected?.config || {},
        connectedAt: connected?.updated_at || null,
        requiredEnvVars: setup.requiredEnvVars,
        optionalEnvVars: setup.optionalEnvVars || [],
        envStatus,
        testAction: setup.testAction,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
});
