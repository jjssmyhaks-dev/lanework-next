/**
 * Dock Scheduler MCP Server
 * Granular dock appointment booking, real-time gate availability, carrier coordination
 *
 * Tools:
 * - book_dock: Book a dock slot for incoming/outgoing trailer
 * - get_dock_availability: Real-time availability for a date range
 * - check_in_carrier: Carrier arrives → log check-in, assign dock
 * - release_dock: Carrier departs → release dock, log dwell time
 *
 * ENV: (uses Neon DB as primary source — no external API required)
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class DockSchedulerMCP extends LaneworkMCPServer {
  constructor() { super("warehouse-operations"); }

  async init(): Promise<void> { await this.loadConfig(); }

  /** ─── TOOLS ─── */

  async bookDock(params: {
    warehouseId: string;
    dockId: string;
    carrierName: string;
    vehicleReg: string;
    bookingType: "inbound" | "outbound";
    shipmentId?: string;
    requestedTime: string; // ISO datetime
    durationMin?: number;
    priority?: "normal" | "high" | "express";
  }): Promise<{
    bookingId: string; dockId: string; status: string;
    assignedTime: string; estimatedDuration: number;
    qrCode: string; message: string;
  }> {
    await this.logAction("book_dock", "started", params);

    // Check for conflicts
    const requestedTime = new Date(params.requestedTime);
    const duration = params.durationMin || 60;
    const endTime = new Date(requestedTime.getTime() + duration * 60000);

    const conflicts = await this.sql`
      SELECT * FROM dock_bookings
      WHERE dock_id = ${params.dockId}
        AND status IN ('confirmed', 'in_progress')
        AND requested_time < ${endTime.toISOString()}
        AND (requested_time + (duration_min || 60) * INTERVAL '1 minute') > ${requestedTime.toISOString()}
    `;

    if (conflicts.length > 0) {
      // Find next available slot
      const latestEnd = new Date(Math.max(...conflicts.map((c: any) =>
        new Date(c.requested_time).getTime() + (c.duration_min || 60) * 60000
      )));

      return {
        bookingId: "", dockId: params.dockId, status: "conflict",
        assignedTime: latestEnd.toISOString(),
        estimatedDuration: duration,
        qrCode: "",
        message: `⚠️ Slot occupied. Suggested time: ${latestEnd.toLocaleTimeString()}. Confirm to rebook?`,
      };
    }

    const bookingId = crypto.randomUUID();
    const qrCode = crypto.randomUUID().slice(0, 12);

    await this.sql`
      INSERT INTO dock_bookings (id, warehouse_id, dock_id, carrier_name, vehicle_reg, booking_type,
        shipment_id, requested_time, duration_min, priority, status, qr_code, created_at)
      VALUES (${bookingId}, ${params.warehouseId}, ${params.dockId}, ${params.carrierName},
        ${params.vehicleReg}, ${params.bookingType}, ${params.shipmentId || ""},
        ${params.requestedTime}, ${duration}, ${params.priority || "normal"},
        'confirmed', ${qrCode}, NOW())
    `;

    await this.logAction("book_dock", "completed", { bookingId, dockId: params.dockId });
    return {
      bookingId, dockId: params.dockId, status: "confirmed",
      assignedTime: params.requestedTime, estimatedDuration: duration,
      qrCode,
      message: `✅ ${params.dockId} booked — ${params.carrierName} | ${params.vehicleReg} | ${new Date(params.requestedTime).toLocaleTimeString()}`,
    };
  }

  async getDockAvailability(params: {
    warehouseId: string;
    dateFrom: string;
    dateTo: string;
  }): Promise<Array<{
    dockId: string; dockName: string; type: string; capacity: string;
    todayBookings: number; availableSlots: number;
    nextAvailableSlot: string | null;
    bookings: Array<{ time: string; carrier: string; vehicleReg: string; type: string; status: string; qrCode: string }>;
  }>> {
    const docks = await this.sql`
      SELECT * FROM docks WHERE warehouse_id = ${params.warehouseId}
    `;

    if (docks.length === 0) {
      // Generate default dock configuration
      const defaultDocks = ["Dock-A", "Dock-B", "Dock-C", "Dock-D", "Dock-E", "Dock-F", "Gate-1", "Gate-2"];
      const types = ["loading", "unloading", "both", "both", "loading", "unloading", "entry", "exit"];
      const capacities = [
        "40ft container", "40ft container", "20ft container", "LTL",
        "40ft container", "LTL", "all", "all",
      ];

      for (let i = 0; i < defaultDocks.length; i++) {
        await this.sql`
          INSERT INTO docks (id, warehouse_id, name, type, capacity, status, created_at)
          VALUES (${crypto.randomUUID()}, ${params.warehouseId}, ${defaultDocks[i]}, ${types[i]},
            ${capacities[i]}, 'active', NOW())
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Re-query after creation
    const allDocks = await this.sql`SELECT * FROM docks WHERE warehouse_id = ${params.warehouseId}`;

    const results: Array<any> = [];
    for (const dock of allDocks) {
      const bookings = await this.sql`
        SELECT * FROM dock_bookings
        WHERE dock_id = ${dock.id}
          AND requested_time BETWEEN ${params.dateFrom} AND ${params.dateTo}
          AND status IN ('confirmed', 'in_progress')
        ORDER BY requested_time ASC
      `;

      const now = new Date();
      const nextSlot = bookings.find((b: any) => new Date(b.requested_time) > now);

      results.push({
        dockId: dock.id, dockName: dock.name, type: dock.type, capacity: dock.capacity,
        todayBookings: bookings.length,
        availableSlots: Math.max(0, 8 - bookings.length), // 8 slots per day per dock
        nextAvailableSlot: nextSlot ? null : new Date().toISOString(),
        bookings: bookings.map((b: any) => ({
          time: b.requested_time?.toISOString() || "",
          carrier: b.carrier_name || "", vehicleReg: b.vehicle_reg || "",
          type: b.booking_type || "", status: b.status || "",
          qrCode: b.qr_code || "",
        })),
      });
    }

    return results;
  }

  async checkInCarrier(params: {
    bookingId?: string;
    qrCode?: string;
    vehicleReg: string;
    carrierName: string;
    checkedInBy: string;
  }): Promise<{
    checkInId: string; status: string; assignedDock: string | null;
    waitTimeMin: number; position: number; message: string;
  }> {
    await this.logAction("check_in_carrier", "started", params);

    // Find booking by QR code or booking ID
    let booking: any = null;
    if (params.qrCode) {
      [booking] = await this.sql`SELECT * FROM dock_bookings WHERE qr_code = ${params.qrCode} AND status = 'confirmed'`;
    }
    if (!booking && params.bookingId) {
      [booking] = await this.sql`SELECT * FROM dock_bookings WHERE id = ${params.bookingId}`;
    }

    const checkInId = crypto.randomUUID();

    if (booking) {
      // Check in with existing booking
      await this.sql`
        UPDATE dock_bookings SET status = 'in_progress', checked_in_at = NOW(), checked_in_by = ${params.checkedInBy}
        WHERE id = ${booking.id}
      `;

      // Update dock status
      await this.sql`
        UPDATE docks SET status = 'occupied', current_vehicle = ${params.vehicleReg}, updated_at = NOW()
        WHERE id = ${booking.dock_id}
      `;

      await this.logAction("check_in_carrier", "completed", { checkInId, dockId: booking.dock_id });
      return {
        checkInId, status: "checked_in",
        assignedDock: booking.dock_id,
        waitTimeMin: 0, position: 0,
        message: `🚛 ${params.carrierName} (${params.vehicleReg}) → ${booking.dock_id} — Checked in with booking`,
      };
    }

    // Walk-in / no booking — find first available dock
    const [availableDock] = await this.sql`
      SELECT * FROM docks WHERE status = 'active' AND (current_vehicle IS NULL OR current_vehicle = '')
      LIMIT 1
    `;

    // Count queue position
    const [queue] = await this.sql`SELECT COUNT(*) as count FROM dock_bookings WHERE status = 'waiting'`;

    if (availableDock) {
      await this.sql`
        INSERT INTO dock_bookings (id, warehouse_id, dock_id, carrier_name, vehicle_reg, booking_type,
          status, checked_in_at, checked_in_by, created_at)
        VALUES (${checkInId}, 'default', ${availableDock.id}, ${params.carrierName}, ${params.vehicleReg},
          'inbound', 'in_progress', NOW(), ${params.checkedInBy}, NOW())
      `;

      await this.sql`UPDATE docks SET status = 'occupied', current_vehicle = ${params.vehicleReg}, updated_at = NOW() WHERE id = ${availableDock.id}`;

      return {
        checkInId, status: "checked_in",
        assignedDock: availableDock.id,
        waitTimeMin: 0, position: 0,
        message: `🚛 ${params.carrierName} (${params.vehicleReg}) → ${availableDock.name || availableDock.id} — Assigned immediately`,
      };
    }

    // Queue — no docks available
    await this.sql`
      INSERT INTO dock_bookings (id, warehouse_id, carrier_name, vehicle_reg, booking_type,
        status, checked_in_at, checked_in_by, created_at)
      VALUES (${checkInId}, 'default', ${params.carrierName}, ${params.vehicleReg},
        'inbound', 'waiting', NOW(), ${params.checkedInBy}, NOW())
    `;

    const position = (queue?.count || 0) + 1;
    return {
      checkInId, status: "waiting",
      assignedDock: null,
      waitTimeMin: position * 15, position,
      message: `⏳ ${params.carrierName} (${params.vehicleReg}) — Queue position ${position}. Estimated wait: ${position * 15} min`,
    };
  }

  async releaseDock(params: {
    bookingId: string;
    releasedBy: string;
    notes?: string;
  }): Promise<{
    bookingId: string; dockReleased: string;
    dwellTimeMin: number; message: string;
  }> {
    const [booking] = await this.sql`SELECT * FROM dock_bookings WHERE id = ${params.bookingId}`;
    if (!booking) return { bookingId: params.bookingId, dockReleased: "", dwellTimeMin: 0, message: "Booking not found" };

    const checkedIn = new Date(booking.checked_in_at || booking.requested_time).getTime();
    const dwellTime = Math.round((Date.now() - checkedIn) / 60000);

    await this.sql`
      UPDATE dock_bookings SET status = 'completed', checked_out_at = NOW(),
        dwell_time_min = ${dwellTime}, notes = ${params.notes || ""}
      WHERE id = ${params.bookingId}
    `;

    await this.sql`
      UPDATE docks SET status = 'active', current_vehicle = NULL, updated_at = NOW()
      WHERE id = ${booking.dock_id}
    `;

    // Auto-assign next waiting carrier
    const [nextInQueue] = await this.sql`
      SELECT * FROM dock_bookings WHERE status = 'waiting' ORDER BY created_at ASC LIMIT 1
    `;
    if (nextInQueue) {
      await this.sql`
        UPDATE dock_bookings SET status = 'in_progress', dock_id = ${booking.dock_id}, checked_in_at = NOW()
        WHERE id = ${nextInQueue.id}
      `;
      await this.sql`
        UPDATE docks SET status = 'occupied', current_vehicle = ${nextInQueue.vehicle_reg}, updated_at = NOW()
        WHERE id = ${booking.dock_id}
      `;
    }

    await this.logAction("release_dock", "completed", { bookingId: params.bookingId, dwellTimeMin: dwellTime });
    return {
      bookingId: params.bookingId, dockReleased: booking.dock_id || "",
      dwellTimeMin: dwellTime,
      message: `✅ ${booking.dock_id || "Dock"} released. Dwell time: ${dwellTime} min${nextInQueue ? ` — ${nextInQueue.carrier_name} now assigned` : ""}`,
    };
  }
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new DockSchedulerMCP();
const server = new Server({ name: "lanework-dock-scheduler", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "book_dock", description: "Book a dock slot for incoming/outgoing trailer", inputSchema: { type: "object", properties: { warehouseId: { type: "string" }, dockId: { type: "string" }, carrierName: { type: "string" }, vehicleReg: { type: "string" }, bookingType: { type: "string", enum: ["inbound", "outbound"] }, shipmentId: { type: "string" }, requestedTime: { type: "string" }, durationMin: { type: "number" }, priority: { type: "string", enum: ["normal", "high", "express"] } }, required: ["warehouseId", "dockId", "carrierName", "vehicleReg", "bookingType", "requestedTime"] } },
    { name: "get_dock_availability", description: "Real-time dock availability for a date range", inputSchema: { type: "object", properties: { warehouseId: { type: "string" }, dateFrom: { type: "string" }, dateTo: { type: "string" } }, required: ["warehouseId", "dateFrom", "dateTo"] } },
    { name: "check_in_carrier", description: "Carrier arrives → log check-in, assign dock or queue", inputSchema: { type: "object", properties: { bookingId: { type: "string" }, qrCode: { type: "string" }, vehicleReg: { type: "string" }, carrierName: { type: "string" }, checkedInBy: { type: "string" } }, required: ["vehicleReg", "carrierName", "checkedInBy"] } },
    { name: "release_dock", description: "Carrier departs → release dock, auto-assign next in queue", inputSchema: { type: "object", properties: { bookingId: { type: "string" }, releasedBy: { type: "string" }, notes: { type: "string" } }, required: ["bookingId", "releasedBy"] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "book_dock": return { content: [{ type: "text", text: JSON.stringify(await mcp.bookDock(args as any), null, 2) }] };
      case "get_dock_availability": return { content: [{ type: "text", text: JSON.stringify(await mcp.getDockAvailability(args as any), null, 2) }] };
      case "check_in_carrier": return { content: [{ type: "text", text: JSON.stringify(await mcp.checkInCarrier(args as any), null, 2) }] };
      case "release_dock": return { content: [{ type: "text", text: JSON.stringify(await mcp.releaseDock(args as any), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[DockSchedulerMCP] Ready — 4 tools available");
