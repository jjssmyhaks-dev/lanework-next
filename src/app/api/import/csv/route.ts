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
            // origin/destination are JSONB in live DB
            const originVal = row.origin || row.from || "";
            const destVal = row.destination || row.to || "";
            await sql`
              INSERT INTO shipments (id, tracking_number, carrier, status, origin, destination, estimated_delivery, customer_name, customer_phone)
              VALUES (
                ${id},
                ${row.tracking_number || row.trackingNumber || row.awb || ""},
                ${row.carrier || "Manual"},
                ${row.status || "pending"},
                ${JSON.stringify({ address: originVal })}::jsonb,
                ${JSON.stringify({ address: destVal })}::jsonb,
                ${row.estimated_delivery || row.eta || null},
                ${row.customer_name || row.customerName || ""},
                ${row.customer_phone || row.customerPhone || ""}
              )
              ON CONFLICT (id) DO UPDATE SET
                status = ${row.status || "pending"},
                origin = ${JSON.stringify({ address: originVal })}::jsonb,
                destination = ${JSON.stringify({ address: destVal })}::jsonb,
                updated_at = NOW()
            `;
            break;
          }
          case "inventory": {
            const id = row.id || crypto.randomUUID();
            // Target inventory_items (full-featured table) instead of inventory
            await sql`
              INSERT INTO inventory_items (
                id, sku, name, category, quantity_on_hand, quantity_available,
                unit_of_measure, warehouse_id, reorder_point, reorder_quantity
              )
              VALUES (
                ${id},
                ${row.sku || row.SKU || ""},
                ${row.name || row.product_name || ""},
                ${row.category || null},
                ${parseInt(row.quantity) || 0},
                ${parseInt(row.quantity) || 0},
                ${row.unit || row.unit_of_measure || "pcs"},
                ${row.warehouse_id || row.warehouseId || null},
                ${parseInt(row.reorder_point) || 0},
                ${parseInt(row.reorder_quantity) || 0}
              )
              ON CONFLICT (id) DO UPDATE SET
                quantity_on_hand = ${parseInt(row.quantity) || 0},
                quantity_available = ${parseInt(row.quantity) || 0},
                updated_at = NOW()
            `;
            break;
          }
          case "order": {
            const id = row.id || crypto.randomUUID();
            // items is jsonb; customer name goes inside it (orders table has no customer_name column)
            const customerName = row.customer_name || row.customerName || "";
            let itemsVal: any = row.items || [];
            if (typeof itemsVal === "string") {
              try { itemsVal = JSON.parse(itemsVal); } catch { itemsVal = [{ name: itemsVal }]; }
            }
            if (customerName && !Array.isArray(itemsVal)) {
              itemsVal = { ...itemsVal, customer_name: customerName };
            }
            if (customerName && Array.isArray(itemsVal) && itemsVal.length === 0) {
              itemsVal = [{ name: "Order item", customer_name: customerName }];
            }
            await sql`
              INSERT INTO orders (id, order_number, status, total_amount, items, created_at)
              VALUES (
                ${id}, ${row.order_number || row.orderNumber || ""},
                ${row.status || "pending"}, ${parseFloat(row.total_amount) || 0},
                ${JSON.stringify(itemsVal)}::jsonb, NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                status = ${row.status || "pending"},
                items = ${JSON.stringify(itemsVal)}::jsonb,
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

/** Split a CSV line into fields, respecting double-quoted values (incl. embedded commas). */
function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Doubled quote inside a quoted field is an escaped quote
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map(f => f.trim());
}

export function parseCSV(text: string): any[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVLine(lines[i]);
    const row: any = {};
    headers.forEach((h, j) => {
      row[h] = values[j] || "";
    });
    rows.push(row);
  }

  return rows;
}