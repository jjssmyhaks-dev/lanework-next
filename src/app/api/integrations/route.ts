import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const CATALOG = [
  { id: "csv_sheets", name: "CSV / Google Sheets Import", desc: "Upload CSV or connect Google Sheets", icon: "table" },
  { id: "whatsapp", name: "WhatsApp Business API", desc: "Connect your WhatsApp Business account", icon: "message-circle" },
  { id: "tms_wms", name: "TMS / WMS / ERP", desc: "Connect via webhook or API", icon: "link" },
  { id: "webhook", name: "Generic Webhook", desc: "Receive events from any system", icon: "webhook" },
];

export async function GET() {
  return NextResponse.json({ integrations: CATALOG.map(c => ({ ...c, status: "disconnected" })) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name } = body;
    if (!type || !name) {
      return NextResponse.json({ error: "type and name are required" }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!);
    const id = crypto.randomUUID();
    await sql`INSERT INTO integrations (id, type, name, status, config) VALUES (${id}, ${type}, ${name}, 'connected', '{}')`;
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
