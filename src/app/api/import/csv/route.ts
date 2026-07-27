import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/**
 * CSV Import API
 * POST /api/import/csv
 * Accepts CSV file upload or JSON array, maps to shipments/inventory/orders
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const sql = neon(process.env.DATABASE_URL!);

    let rows: any[] = [];
    let entityType = "shipment"; // default

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      entityType = (formData.get("entity_type") as string) || "shipment";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const text = await file.text();
      rows = parseCSV(text);
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      entityType = body.entity_type || "shipment";
      rows = body.rows || body.data || [];
    } else {
      return NextResponse.json({ error: "Unsupported content type. Use multipart/form-data or application/json" }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data rows found" }, { status: 400 });
    }

    const results = { total: rows.length, imported: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      try {
        switch (entityType) {
          case "shipment": {
            const id = row.id || crypto.randomUUID();
            await sql`
              INSERT INTO shipments (id, tracking_number, carrier, status, origin, destination, estimated_delivery, customer_name, customer_phone)
              VALUES (
                ${id},
                ${row.tracking_number || row.trackingNumber || row.awb || ""},
                ${row.carrier || "Manual"},
                ${row.status || "pending"},
                ${row.origin || row.from || ""},
                ${row.destination || row.to || ""},
                ${row.estimated_delivery || row.eta || null},
                ${row.customer_name || row.customerName || ""},
                ${row.customer_phone || row.customerPhone || ""}
              )
              ON CONFLICT (id) DO UPDATE SET
                status = ${row.status || "pending"},
                origin = ${row.origin || row.from || ""},
                destination = ${row.destination || row.to || ""},
                updated_at = NOW()
            `;
            break;
          }
          case "inventory": {
            const id = row.id || crypto.randomUUID();
            await sql`
              INSERT INTO inventory (id, sku, name, category, quantity, unit, warehouse_id, reorder_point, reorder_quantity)
              VALUES (
                ${id}, ${row.sku || row.SKU || ""}, ${row.name || row.product_name || ""},
                ${row.category || ""}, ${parseInt(row.quantity) || 0}, ${row.unit || "pcs"},
                ${row.warehouse_id || row.warehouseId || null},
                ${parseInt(row.reorder_point) || 0}, ${parseInt(row.reorder_quantity) || 0}
              )
              ON CONFLICT (id) DO UPDATE SET
                quantity = ${parseInt(row.quantity) || 0},
                category = ${row.category || ""},
                updated_at = NOW()
            `;
            break;
          }
          case "order": {
            const id = row.id || crypto.randomUUID();
            await sql`
              INSERT INTO orders (id, order_number, customer_name, status, total_amount, items, created_at)
              VALUES (
                ${id}, ${row.order_number || row.orderNumber || ""}, ${row.customer_name || row.customerName || ""},
                ${row.status || "pending"}, ${parseFloat(row.total_amount) || 0},
                ${row.items ? JSON.stringify(row.items) : "[]"}, NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                status = ${row.status || "pending"},
                updated_at = NOW()
            `;
            break;
          }
          default:
            results.errors.push(`Unknown entity type: ${entityType}`);
            continue;
        }
        results.imported++;
      } catch (rowErr: any) {
        results.skipped++;
        results.errors.push(`Row ${results.imported + results.skipped}: ${rowErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      entity_type: entityType,
      ...results,
      message: `Imported ${results.imported} of ${results.total} ${entityType} records`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function parseCSV(text: string): any[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: any = {};
    headers.forEach((h, j) => {
      row[h] = values[j] || "";
    });
    rows.push(row);
  }

  return rows;
}