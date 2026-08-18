#!/usr/bin/env node
/**
 * Demo-data seeder.
 * Run:  node scripts/seed.mjs        (uses DATABASE_URL from .env.local)
 *       DATABASE_URL=... node scripts/seed.mjs
 *       node scripts/seed.mjs --force  (wipe demo tables first)
 *
 * Idempotent: skips a table if it already has rows.
 */
import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import crypto from "crypto";

function loadUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.resolve(".env.local");
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, "utf8").match(/^DATABASE_URL="?(.*?)"?$/m);
    if (m) return m[1];
  }
  console.error("No DATABASE_URL found (checked env and .env.local). Aborting.");
  process.exit(1);
}

const FORCE = process.argv.includes("--force");
const sql = neon(loadUrl());
const uid = () => crypto.randomUUID();
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

const carriers = ["BlueDart", "Delhivery", "DTDC", "Ecom Express", "XpressBees", "Shiprocket", "FedEx"];
const cities = [
  ["Mumbai, MH", "Delhi, DL"], ["Delhi, DL", "Bengaluru, KA"], ["Bengaluru, KA", "Chennai, TN"],
  ["Chennai, TN", "Kolkata, WB"], ["Kolkata, WB", "Hyderabad, TS"], ["Hyderabad, TS", "Pune, MH"],
  ["Pune, MH", "Ahmedabad, GJ"], ["Ahmedabad, GJ", "Jaipur, RJ"], ["Jaipur, RJ", "Lucknow, UP"],
  ["Lucknow, UP", "Mumbai, MH"],
];
const statuses = ["in_transit", "delivered", "pending", "in_transit", "delayed", "out_for_delivery"];
const firstNames = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Ananya", "Rohan", "Kavya", "Arjun", "Meera"];
const lastNames = ["Sharma", "Patel", "Reddy", "Iyer", "Singh", "Gupta", "Nair", "Das", "Menon", "Kulkarni"];
const products = [
  ["MOB-001", "Wireless Earbuds"], ["MOB-002", "Smart Watch"], ["ACC-001", "Laptop Sleeve"],
  ["ACC-002", "USB-C Hub"], ["APP-001", "Cotton T-Shirt"], ["APP-002", "Denim Jacket"],
  ["HOM-001", "LED Desk Lamp"], ["HOM-002", "Ceramic Mug Set"], ["ELC-001", "Bluetooth Speaker"],
  ["ELC-002", "Power Bank 20K"], ["KIT-001", "Spice Rack"], ["KIT-002", "Non-stick Pan"],
];

const SEED_TABLES = ["shipments", "inventory_items", "orders", "customers", "routes", "fleet_vehicles", "fleet_drivers", "warehouse", "agent_tasks"];

async function tableCount(table) {
  if (!SEED_TABLES.includes(table)) throw new Error(`Unexpected table name: ${table}`);
  const [r] = await sql.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
  return r?.c ?? 0;
}

async function seedShipments() {
  if ((await tableCount("shipments")) > 0 && !FORCE) return console.log("  shipments: skip (has data)");
  for (let i = 0; i < 20; i++) {
    const [from, to] = cities[i % cities.length];
    const f = firstNames[i % firstNames.length], l = lastNames[(i * 3) % lastNames.length];
    await sql`
      INSERT INTO shipments (id, tracking_number, order_number, carrier, status, origin, destination,
        customer_name, customer_phone, customer_email, estimated_delivery, package_count, metadata, created_at, updated_at)
      VALUES (${uid()}, ${`LX-2026-${String(1000 + i)}`}, ${`ORD-${String(5000 + i)}`}, ${carriers[i % carriers.length]},
        ${statuses[i % statuses.length]},
        ${JSON.stringify({ address: from })}::jsonb, ${JSON.stringify({ address: to })}::jsonb,
        ${`${f} ${l}`}, ${`+91 98${String(10000000 + i * 137913)}`}, ${`${f.toLowerCase()}.${l.toLowerCase()}@example.com`},
        ${daysFromNow(1 + (i % 5))}, ${1 + (i % 3)}, ${JSON.stringify({ source: "seed" })}::jsonb, NOW(), NOW())
    `;
  }
  console.log("  shipments: 20 rows");
}

async function seedInventory() {
  if ((await tableCount("inventory_items")) > 0 && !FORCE) return console.log("  inventory_items: skip (has data)");
  for (let i = 0; i < products.length; i++) {
    const [sku, name] = products[i];
    const qty = [0, 4, 12, 25, 40, 80][i % 6];
    await sql`
      INSERT INTO inventory_items (id, sku, name, category, quantity_on_hand, quantity_reserved, quantity_available,
        reorder_point, reorder_quantity, unit_of_measure, low_stock_alert, status, last_updated, created_at, updated_at)
      VALUES (${uid()}, ${sku}, ${name}, ${["Mobile", "Mobile", "Accessories", "Accessories", "Apparel", "Apparel", "Home", "Home", "Electronics", "Electronics", "Kitchen", "Kitchen"][i]},
        ${qty}, 0, ${qty}, 10, 20, 'pcs', ${qty <= 10}, 'active', NOW(), NOW(), NOW())
    `;
  }
  console.log("  inventory_items: 12 rows");
}

async function seedOrders() {
  if ((await tableCount("orders")) > 0 && !FORCE) return console.log("  orders: skip (has data)");
  for (let i = 0; i < 8; i++) {
    const f = firstNames[i % firstNames.length], l = lastNames[(i * 5) % lastNames.length];
    const [sku, name] = products[i % products.length];
    const amount = 500 + i * 250;
    await sql`
      INSERT INTO orders (id, order_number, status, items, total_amount, payment_mode, created_at, updated_at)
      VALUES (${uid()}, ${`ORD-${String(6000 + i)}`}, ${["pending", "completed", "shipped", "completed"][i % 4]},
        ${JSON.stringify([{ sku, name, qty: 1 + (i % 3), price: amount }])}::jsonb,
        ${amount}, ${i % 2 === 0 ? "COD" : "Prepaid"}, NOW(), NOW())
    `;
  }
  console.log("  orders: 8 rows");
}

async function seedCustomers() {
  if ((await tableCount("customers")) > 0 && !FORCE) return console.log("  customers: skip (has data)");
  for (let i = 0; i < 6; i++) {
    const f = firstNames[i % firstNames.length], l = lastNames[(i * 7) % lastNames.length];
    await sql`
      INSERT INTO customers (id, name, email, phone, whatsapp_phone, address, status, tags, created_at, updated_at)
      VALUES (${uid()}, ${`${f} ${l}`}, ${`${f.toLowerCase()}.${l.toLowerCase()}@example.com`},
        ${`+91 98${String(20000000 + i * 113137)}`}, ${`+91 98${String(20000000 + i * 113137)}`},
        ${JSON.stringify({ city: cities[i % cities.length][1] })}::jsonb,
        ${["active", "active", "vip", "active", "vip", "inactive"][i]},
        '{seed}', NOW(), NOW())
    `;
  }
  console.log("  customers: 6 rows");
}

async function seedRoutes() {
  if ((await tableCount("routes")) > 0 && !FORCE) return console.log("  routes: skip (has data)");
  for (let i = 0; i < 4; i++) {
    const [from, to] = cities[i % cities.length];
    await sql`
      INSERT INTO routes (id, name, status, total_distance_km, total_duration_minutes, total_stops, constraints, metrics, created_at, updated_at)
      VALUES (${uid()}, ${`Route ${["Mumbai-Delhi", "Delhi-Bengaluru", "Bengaluru-Chennai", "Pune-Ahmedabad"][i]}`},
        ${["active", "active", "completed", "pending"][i]}, ${150 + i * 120}, ${180 + i * 90}, ${5 + i * 2},
        ${JSON.stringify({ origin: from, destination: to })}::jsonb,
        ${JSON.stringify({ on_time: i % 2 === 0 })}::jsonb, NOW(), NOW())
    `;
  }
  console.log("  routes: 4 rows");
}

async function seedFleet() {
  if ((await tableCount("fleet_vehicles")) > 0 && !FORCE) return console.log("  fleet_vehicles: skip (has data)");
  const types = ["truck", "truck", "van", "van", "bike", "bike"];
  for (let i = 0; i < 6; i++) {
    await sql`
      INSERT INTO fleet_vehicles (id, user_id, plate, type, status, mileage_km, created_at, updated_at)
      VALUES (${uid()}, 'default', ${`MH-12-AB-${String(1000 + i)}`}, ${types[i]},
        ${["active", "active", "maintenance", "active", "active", "available"][i]}, ${20000 + i * 5000}, NOW(), NOW())
    `;
  }
  for (let i = 0; i < 5; i++) {
    await sql`
      INSERT INTO fleet_drivers (id, user_id, name, license, status, hours_driven, max_hours, assigned_vehicle, created_at, updated_at)
      VALUES (${uid()}, 'default', ${`${firstNames[i]} ${lastNames[i]}`}, ${`DL-${String(4000 + i)}`},
        ${["available", "on_route", "available", "on_route", "off_duty"][i]}, ${3 + i}, 11, null, NOW(), NOW())
    `;
  }
  console.log("  fleet_vehicles: 6 rows, fleet_drivers: 5 rows");
}

async function seedWarehouse() {
  if ((await tableCount("warehouse")) > 0 && !FORCE) return console.log("  warehouse: skip (has data)");
  const tasks = [
    ["pick", "high", "pending", "Dock 3"], ["pack", "medium", "pending", "Dock 1"],
    ["ship", "high", "in_progress", "Dock 2"], ["receive", "low", "completed", "Dock 4"],
    ["putaway", "medium", "pending", "Dock 1"],
  ];
  for (const [type, priority, status, dock] of tasks) {
    await sql`
      INSERT INTO warehouse (id, user_id, type, priority, status, dock, metadata, created_at, updated_at)
      VALUES (${uid()}, 'default', ${type}, ${priority}, ${status}, ${dock}, ${JSON.stringify({ source: "seed" })}::jsonb, NOW(), NOW())
    `;
  }
  console.log("  warehouse: 5 rows");
}

async function seedAgentTasks() {
  if ((await tableCount("agent_tasks")) > 0 && !FORCE) return console.log("  agent_tasks: skip (has data)");
  const tasks = [
    ["shipment-tracking", "track", "completed", "Shipment LX-2026-1000 is in transit, ETA in 2 days."],
    ["inventory-management", "check_stock", "completed", "3 SKUs below reorder point; recommend restocking earbuds."],
    ["route-optimization", "optimize", "completed", "Reordered 6 stops saving 42 minutes."],
    ["warehouse-operations", "summary", "pending_approval", "3 tasks pending, dock 2 busy until 4 PM."],
    ["fleet-management", "track_all", "completed", "6 vehicles active, 1 in maintenance."],
  ];
  for (const [agentType, actionType, status, reasoning] of tasks) {
    await sql`
      INSERT INTO agent_tasks (id, agent_type, action_type, status, trust_level, reasoning_trace, input_data, created_at, updated_at)
      VALUES (${uid()}, ${agentType}, ${actionType}, ${status}, 'propose_only', ${reasoning}, ${JSON.stringify({})}::jsonb, NOW(), NOW())
    `;
  }
  console.log("  agent_tasks: 5 rows");
}

async function main() {
  console.log("Seeding demo data" + (FORCE ? " (--force: existing demo rows will be wiped first)" : "") + "...");
  if (FORCE) {
    for (const t of SEED_TABLES) {
      try { await sql.query(`DELETE FROM "${t}"`); } catch (e) { console.log(`  ${t}: wipe skipped (${e.message})`); }
    }
  }
  await seedShipments();
  await seedInventory();
  await seedOrders();
  await seedCustomers();
  await seedRoutes();
  await seedFleet();
  await seedWarehouse();
  await seedAgentTasks();
  console.log("Done. Dashboards will now show realistic demo data.");
}

main().catch((e) => { console.error("Seed failed:", e.message); process.exit(1); });
