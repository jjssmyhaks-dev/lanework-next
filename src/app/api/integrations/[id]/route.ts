import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT * FROM integrations WHERE id = ${id} OR integration_type = ${id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }
    return NextResponse.json({ integration: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, config } = body;
    const sql = neon(process.env.DATABASE_URL!);

    const existing = await sql`SELECT * FROM integrations WHERE id = ${id} OR integration_type = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const realId = existing[0].id;

    if (config) {
      const merged = { ...(existing[0].config || {}), ...config };
      await sql`UPDATE integrations SET config = ${JSON.stringify(merged)}, updated_at = NOW() WHERE id = ${realId}`;
      return NextResponse.json({ success: true, config: merged });
    }
    if (status) {
      await sql`UPDATE integrations SET status = ${status}, updated_at = NOW() WHERE id = ${realId}`;
      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = neon(process.env.DATABASE_URL!);

    // Try by UUID first (id), fall back to integration_type lookup
    let existing: any[] = [];
    try {
      existing = await sql`SELECT * FROM integrations WHERE id::text = ${id}`;
    } catch {}
    if (existing.length === 0) {
      try {
        existing = await sql`SELECT * FROM integrations WHERE integration_type = ${id}`;
      } catch {}
    }

    if (existing.length === 0) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const realId = existing[0].id;
    const realType = existing[0].integration_type || existing[0].type || id;

    try { await sql`DELETE FROM webhooks WHERE integration_id = ${realId}`; } catch {}
    await sql`DELETE FROM integrations WHERE id = ${realId}`;

    return NextResponse.json({ success: true, type: realType, message: `${realType} integration disconnected` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
