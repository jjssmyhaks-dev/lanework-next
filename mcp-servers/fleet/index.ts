/**
 * Fleet Telematics MCP Server
 * Real GPS, fuel monitoring, maintenance alerts, driver behavior from LocoNav/FleetX/Vamosys
 *
 * Tools:
 * - track_vehicle: Real-time GPS position, speed, heading, fuel level
 * - get_fleet_status: All vehicles summary — status, location, alerts
 * - schedule_maintenance: Schedule vehicle maintenance with reminders
 * - get_driver_report: Driver hours, violations, compliance status
 *
 * ENV: FLEET_API_KEY, FLEET_API_SECRET, FLEET_PROVIDER (loconav|fleetx|vamosys)
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class FleetMCP extends LaneworkMCPServer {
  private apiKey: string = "";
  private apiSecret: string = "";
  private provider: string = "";
  private baseUrl: string = "";

  constructor() { super("fleet-management"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.apiKey = this.getEnv("FLEET_API_KEY");
    this.apiSecret = process.env.FLEET_API_SECRET || this.config.FLEET_API_SECRET || "";
    this.provider = process.env.FLEET_PROVIDER || this.config.FLEET_PROVIDER || "loconav";

    const urlMap: Record<string, string> = {
      loconav: "https://api.loconav.com/v1",
      fleetx: "https://api.fleetx.io/v1",
      vamosys: "https://api.vamosys.com/v1",
    };
    this.baseUrl = urlMap[this.provider] || urlMap.loconav;
  }

  private async fleetReq(path: string, body?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "x-api-secret": this.apiSecret,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Fleet API error: ${res.status}`);
    return res.json();
  }

  /** ─── TOOLS ─── */

  async trackVehicle(vehicleId: string): Promise<{
    vehicleId: string; registration: string; status: string;
    lat: number; lng: number; speed: number; heading: number;
    fuelLevel: number; lastUpdated: string; location: string;
  }> {
    const data = await this.fleetReq(`/vehicles/${vehicleId}/location`);
    const loc = data.location || data;

    // Update vehicle table
    await this.sql`
      UPDATE vehicles SET
        last_lat = ${loc.latitude || 0}, last_lng = ${loc.longitude || 0},
        last_location = ${loc.address || loc.formatted_address || ""},
        last_seen_at = NOW()
      WHERE id = ${vehicleId}
    `;

    return {
      vehicleId,
      registration: data.registration || data.regNo || "",
      status: data.status || "active",
      lat: loc.latitude || 0,
      lng: loc.longitude || 0,
      speed: loc.speed || 0,
      heading: loc.heading || 0,
      fuelLevel: loc.fuel || loc.fuelLevel || 0,
      lastUpdated: loc.timestamp || new Date().toISOString(),
      location: loc.address || loc.formatted_address || `${loc.latitude},${loc.longitude}`,
    };
  }

  async getFleetStatus(): Promise<Array<{
    id: string; registration: string; driverName: string;
    status: string; lat: number; lng: number; fuelPercent: number;
    lastSeen: string; alerts: string[];
  }>> {
    const data = await this.fleetReq("/vehicles");
    const vehicles = data.vehicles || data.data || [];

    const result = vehicles.map((v: any) => ({
      id: v.id || v.vehicleId,
      registration: v.registration || v.regNo || "",
      driverName: v.driverName || v.assignedDriver || "",
      status: v.status || (v.ignition ? "running" : "parked"),
      lat: v.latitude || v.lat || 0,
      lng: v.longitude || v.lng || 0,
      fuelPercent: v.fuelPercent || v.fuel || 0,
      lastSeen: v.lastSeen || v.lastUpdated || new Date().toISOString(),
      alerts: v.alerts || [],
    }));

    // Sync to DB
    for (const v of result) {
      await this.sql`
        INSERT INTO vehicles (id, registration, status, last_lat, last_lng, last_seen_at, created_at, updated_at)
        VALUES (${v.id}, ${v.registration}, ${v.status}, ${v.lat}, ${v.lng}, NOW(), NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET status = ${v.status}, last_lat = ${v.lat}, last_lng = ${v.lng}, last_seen_at = NOW(), updated_at = NOW()
      `;
    }

    return result;
  }

  async scheduleMaintenance(params: {
    vehicleId: string; type: string; description: string;
    scheduledDate: string; priority: "low" | "medium" | "high";
  }): Promise<{ maintenanceId: string; status: string }> {
    const id = crypto.randomUUID();
    await this.sql`
      INSERT INTO maintenance_schedules (id, vehicle_id, type, description, scheduled_date, priority, status, created_at)
      VALUES (${id}, ${params.vehicleId}, ${params.type}, ${params.description},
        ${params.scheduledDate}, ${params.priority}, 'scheduled', NOW())
    `;

    await this.logAction("schedule_maintenance", "completed", params);
    return { maintenanceId: id, status: "scheduled" };
  }

  async getDriverReport(driverId: string): Promise<{
    driverId: string; name: string; licenseNumber: string;
    totalHoursToday: number; totalHoursWeek: number;
    violations: Array<{ type: string; date: string; description: string }>;
    complianceStatus: string;
  }> {
    const data = await this.fleetReq(`/drivers/${driverId}`);

    const [dbDriver] = await this.sql`SELECT * FROM drivers WHERE id = ${driverId}`;

    return {
      driverId,
      name: dbDriver?.name || data.name || "",
      licenseNumber: dbDriver?.license_number || data.licenseNumber || "",
      totalHoursToday: data.todayHours || 0,
      totalHoursWeek: data.weekHours || 0,
      violations: (data.violations || []).map((v: any) => ({
        type: v.type || v.violationType || "",
        date: v.date || "",
        description: v.description || v.reason || "",
      })),
      complianceStatus: (data.totalHoursWeek || 0) > 60 ? "⚠️ Over limit" : "✅ Compliant",
    };
  }
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new FleetMCP();
const server = new Server({ name: "lanework-fleet", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "track_vehicle", description: "Real-time GPS position, speed, fuel level", inputSchema: { type: "object", properties: { vehicleId: { type: "string" } }, required: ["vehicleId"] } },
    { name: "get_fleet_status", description: "All vehicles summary — status, location, alerts", inputSchema: { type: "object", properties: {}, required: [] } },
    { name: "schedule_maintenance", description: "Schedule vehicle maintenance", inputSchema: { type: "object", properties: { vehicleId: { type: "string" }, type: { type: "string" }, description: { type: "string" }, scheduledDate: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high"] } }, required: ["vehicleId", "type", "description", "scheduledDate", "priority"] } },
    { name: "get_driver_report", description: "Driver hours, violations, compliance status", inputSchema: { type: "object", properties: { driverId: { type: "string" } }, required: ["driverId"] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "track_vehicle": return { content: [{ type: "text", text: JSON.stringify(await mcp.trackVehicle(args.vehicleId as string), null, 2) }] };
      case "get_fleet_status": return { content: [{ type: "text", text: JSON.stringify(await mcp.getFleetStatus(), null, 2) }] };
      case "schedule_maintenance": return { content: [{ type: "text", text: JSON.stringify(await mcp.scheduleMaintenance(args as any), null, 2) }] };
      case "get_driver_report": return { content: [{ type: "text", text: JSON.stringify(await mcp.getDriverReport(args.driverId as string), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[FleetMCP] Ready — 4 tools available");
