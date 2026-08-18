import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/**
 * CSV Export API
 * GET /api/export/csv?entity=shipments&format=csv
 * Exports data as CSV or JSON
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity") || "shipments";
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10000"), 50000);

    const sql = neon(process.env.DATABASE_URL!);
    let rows: any[] = [];
    let headers: string[] = [];

    /** Readable string from a jsonb address cell */
    const addr = (v: any): string => {
      if (v == null) return "";
      if (typeof v === "string") return v;
      if (typeof v === "object") return v.address || v.city || v.name || JSON.stringify(v);
      return String(v);
    };

    switch (entity) {
      case "shipments": {
        let query = sql`SELECT * FROM shipments`;
        if (status) query = sql`SELECT * FROM shipments WHERE status = ${status}`;
        rows = await sql`SELECT * FROM shipments LIMIT ${limit}`;
        headers = ["id", "tracking_number", "order_number", "carrier", "status", "origin", "destination", "estimated_delivery", "customer_name", "customer_phone", "created_at"];
        rows = rows.map((r: any) => ({ ...r, origin: addr(r.origin), destination: addr(r.destination) }));
        break;
      }
      case "inventory": {
        rows = await sql`SELECT * FROM inventory LIMIT ${limit}`;
        headers = ["id", "sku", "name", "quantity", "reorder_point", "warehouse", "location", "created_at"];
        break;
      }
      case "orders": {
        rows = await sql`SELECT * FROM orders LIMIT ${limit}`;
        headers = ["id", "order_number", "status", "total_amount", "payment_mode", "external_id", "created_at"];
        rows = rows.map((r: any) => ({ ...r, items: JSON.stringify(r.items || []) }));
        break;
      }
      case "routes": {
        rows = await sql`SELECT * FROM routes LIMIT ${limit}`;
        rows = rows.map((r: any) => ({ ...r, origin: (r.constraints || {}).origin, destination: (r.constraints || {}).destination }));
        headers = ["id", "name", "origin", "destination", "total_distance_km", "total_duration_minutes", "total_stops", "driver_name", "vehicle_name", "status", "created_at"];
        break;
      }
      case "drivers": {
        rows = await sql`SELECT * FROM drivers LIMIT ${limit}`;
        headers = ["id", "name", "phone", "email", "license_number", "license_state", "license_expiry", "status", "created_at"];
        break;
      }
      case "vehicles": {
        rows = await sql`SELECT * FROM vehicles LIMIT ${limit}`;
        headers = ["id", "name", "license_plate", "vehicle_type", "status", "odometer", "fuel_type", "registration", "last_seen_at", "created_at"];
        break;
      }
      case "customers": {
        rows = await sql`SELECT * FROM customers LIMIT ${limit}`;
        headers = ["id", "name", "email", "phone", "whatsapp_phone", "account_number", "status", "tags", "created_at"];
        rows = rows.map((r: any) => ({ ...r, address: addr(r.address), tags: Array.isArray(r.tags) ? r.tags.join("; ") : r.tags }));
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown entity: ${entity}. Available: shipments, inventory, orders, routes, drivers, vehicles, customers` }, { status: 400 });
    }

    if (format === "json") {
      return NextResponse.json({ entity, count: rows.length, data: rows });
    }

    // Build CSV
    const escapeCsv = (val: any) => {
      const str = val === null || val === undefined ? "" : String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const csvRows = rows.map(row =>
      headers.map(h => escapeCsv(row[h])).join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${entity}_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
