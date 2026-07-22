import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId") || "default";
    const sql = neon(process.env.DATABASE_URL!);

    const integrations = await sql`SELECT * FROM integrations WHERE org_id = ${orgId} ORDER BY type`;
    // Return defaults if empty
    if (!integrations.length) {
      return NextResponse.json({
        integrations: [
          { type: "csv_sheets", name: "CSV / Google Sheets Import", status: "disconnected", description: "Upload CSV or connect Google Sheets" },
          { type: "whatsapp", name: "WhatsApp Business API", status: "disconnected", description: "Connect your WhatsApp Business account" },
          { type: "tms_wms", name: "TMS / WMS / ERP", status: "disconnected", description: "Connect via webhook or API" },
          { type: "webhook", name: "Generic Webhook", status: "disconnected", description: "Receive events from any system" },
        ]
      });
    }
    return NextResponse.json({ integrations });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, type, name, config } = body;
    if (!orgId || !type || !name) {
      return NextResponse.json({ error: "orgId, type, and name are required" }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO integrations (id, org_id, type, name, status, config, connected_at)
      VALUES (${id}, ${orgId}, ${type}, ${name}, 'connected', ${JSON.stringify(config || {})}, NOW())
    `;
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
