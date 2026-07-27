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

    switch (entity) {
      case "shipments": {
        let query = sql`SELECT * FROM shipments`;
        if (status) query = sql`SELECT * FROM shipments WHERE status = ${status}`;
        rows = await sql`SELECT * FROM shipments LIMIT ${limit}`;
        headers = ["id", "tracking_number", "carrier", "status", "origin", "destination", "estimated_delivery", "customer_name", "customer_phone", "created_at"];
        break;
      }
      case "inventory": {
        rows = await sql`SELECT * FROM inventory LIMIT ${limit}`;
        headers = ["id", "sku", "name", "category", "quantity", "unit", "warehouse_id", "reorder_point", "reorder_quantity", "updated_at"];
        break;
      }
      case "orders": {
        rows = await sql`SELECT * FROM orders LIMIT ${limit}`;
        headers = ["id", "order_number", "customer_name", "status", "total_amount", "created_at"];
        break;
      }
      case "routes": {
        rows = await sql`SELECT * FROM routes LIMIT ${limit}`;
        headers = ["id", "name", "origin", "destination", "distance_km", "estimated_duration_min", "status", "driver_id", "vehicle_id", "created_at"];
        break;
      }
      case "drivers": {
        rows = await sql`SELECT * FROM drivers LIMIT ${limit}`;
        headers = ["id", "name", "phone", "license_number", "status", "vehicle_id", "assigned_route_id"];
        break;
      }
      case "vehicles": {
        rows = await sql`SELECT * FROM vehicles LIMIT ${limit}`;
        headers = ["id", "registration", "type", "capacity_kg", "status", "last_maintenance_date"];
        break;
      }
      case "customers": {
        rows = await sql`SELECT * FROM customers LIMIT ${limit}`;
        headers = ["id", "name", "email", "phone", "company", "address", "created_at"];
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
