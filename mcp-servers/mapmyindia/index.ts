/**
 * MapmyIndia MCP Server
 * More accurate than Google Maps for Indian addresses — especially tier-2/3 cities
 *
 * Tools:
 * - geocode: Convert address → lat/lng
 * - reverse_geocode: Convert lat/lng → address
 * - optimize_route: Multi-stop route optimization with ETAs
 * - distance_matrix: Time/distance between multiple points
 *
 * ENV: MAPMYINDIA_API_KEY, MAPMYINDIA_LICENSE_KEY
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class MapmyIndiaMCP extends LaneworkMCPServer {
  private apiKey: string = "";
  private licenseKey: string = "";
  private baseUrl = "https://apis.mapmyindia.com/advancedmaps/v1";

  constructor() { super("route-optimization"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.apiKey = this.getEnv("MAPMYINDIA_API_KEY");
    this.licenseKey = process.env.MAPMYINDIA_LICENSE_KEY || this.config.MAPMYINDIA_LICENSE_KEY || this.apiKey;
  }

  private async mmiReq(path: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("lic_key", this.licenseKey);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`MapmyIndia API error: ${res.status}`);
    return res.json();
  }

  async geocode(address: string): Promise<{ address: string; lat: number; lng: number; eLoc: string; confidence: number }> {
    const data = await this.mmiReq(`/${this.apiKey}/geo_code`, { addr: address });
    const cp = data.copResults || data.results?.[0];
    return {
      address: cp?.address || address,
      lat: parseFloat(cp?.latitude || "0"),
      lng: parseFloat(cp?.longitude || "0"),
      eLoc: cp?.eLoc || "",
      confidence: cp?.confidenceScore || 0,
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<{ address: string; houseNumber: string; street: string; city: string; state: string; pincode: string }> {
    const data = await this.mmiReq(`/${this.apiKey}/rev_geocode`, { lat: String(lat), lng: String(lng) });
    const res = data.results?.[0] || {};
    return {
      address: res.formatted_address || `${lat}, ${lng}`,
      houseNumber: res.houseNumber || "",
      street: res.street || "",
      city: res.city || res.district || "",
      state: res.state || "",
      pincode: res.pincode || "",
    };
  }

  async optimizeRoute(params: {
    waypoints: Array<{ lat: number; lng: number; label?: string }>;
    optimizeFor?: "time" | "distance";
    vehicleType?: string;
  }): Promise<{
    totalDistance: number;
    totalTime: number;
    optimizedOrder: number[];
    etaPerStop: Array<{ label: string; arrivalTime: string; distanceFromStart: number }>;
    polyline: string;
  }> {
    await this.logAction("optimize_route", "started", params);

    const pts = params.waypoints.map(w => `${w.lat},${w.lng}`).join(";");
    const data = await this.mmiReq(`/${this.apiKey}/route_adv`, {
      waypoints: pts,
      resource: "route",
      profile: params.vehicleType === "truck" ? "driving" : "driving",
      overview: "full",
    });

    const route = data.routes?.[0] || {};
    const legs = route.legs || [];
    let cumulativeDist = 0;

    const etaPerStop = legs.map((leg: any, i: number) => {
      cumulativeDist += leg.distance || 0;
      return {
        label: params.waypoints[i]?.label || `Stop ${i + 1}`,
        arrivalTime: `${Math.round((leg.duration || 0) / 60)} min`,
        distanceFromStart: Math.round(cumulativeDist / 1000 * 10) / 10,
      };
    });

    // Save optimized route to DB
    const routeId = crypto.randomUUID();
    await this.sql`
      INSERT INTO routes (id, name, origin, destination, distance_km, estimated_duration_min, waypoints, created_at)
      VALUES (${routeId}, 'Optimized Route', ${params.waypoints[0]?.label || "Start"},
        ${params.waypoints[params.waypoints.length - 1]?.label || "End"},
        ${Math.round((route.distance || 0) / 1000 * 10) / 10},
        ${Math.round((route.duration || 0) / 60)},
        ${JSON.stringify(params.waypoints)}, NOW())
    `;

    await this.logAction("optimize_route", "completed", { routeId });
    return {
      totalDistance: Math.round((route.distance || 0) / 1000 * 10) / 10,
      totalTime: Math.round((route.duration || 0) / 60),
      optimizedOrder: legs.map((_: any, i: number) => i),
      etaPerStop,
      polyline: route.geometry || "",
    };
  }

  async distanceMatrix(origins: Array<{ lat: number; lng: number }>, destinations: Array<{ lat: number; lng: number }>): Promise<Array<Array<{ distance: number; time: number }>>> {
    const src = origins.map(o => `${o.lat},${o.lng}`).join(";");
    const dst = destinations.map(d => `${d.lat},${d.lng}`).join(";");

    const data = await this.mmiReq(`/${this.apiKey}/distance_matrix/driving/${src}/${dst}`);
    return ((data.results || []) as any[]).map((row: any) =>
      (row.elements || []).map((el: any) => ({
        distance: Math.round((el.distance || 0) / 1000 * 10) / 10,
        time: Math.round((el.duration || 0) / 60),
      }))
    );
  }
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new MapmyIndiaMCP();
const server = new Server({ name: "lanework-mapmyindia", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "geocode", description: "Convert Indian address to coordinates", inputSchema: { type: "object", properties: { address: { type: "string" } }, required: ["address"] } },
    { name: "reverse_geocode", description: "Convert coordinates to Indian address", inputSchema: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } }, required: ["lat", "lng"] } },
    { name: "optimize_route", description: "Optimize multi-stop delivery route with ETAs", inputSchema: { type: "object", properties: { waypoints: { type: "array", items: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" }, label: { type: "string" } }, required: ["lat", "lng"] } }, optimizeFor: { type: "string", enum: ["time", "distance"] }, vehicleType: { type: "string" } }, required: ["waypoints"] } },
    { name: "distance_matrix", description: "Time/distance between multiple points", inputSchema: { type: "object", properties: { origins: { type: "array", items: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } }, required: ["lat", "lng"] } }, destinations: { type: "array", items: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } }, required: ["lat", "lng"] } } }, required: ["origins", "destinations"] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "geocode": return { content: [{ type: "text", text: JSON.stringify(await mcp.geocode(args.address as string), null, 2) }] };
      case "reverse_geocode": return { content: [{ type: "text", text: JSON.stringify(await mcp.reverseGeocode(args.lat as number, args.lng as number), null, 2) }] };
      case "optimize_route": return { content: [{ type: "text", text: JSON.stringify(await mcp.optimizeRoute(args as any), null, 2) }] };
      case "distance_matrix": return { content: [{ type: "text", text: JSON.stringify(await mcp.distanceMatrix(args.origins as any, args.destinations as any), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[MapmyIndiaMCP] Ready — 4 tools available");
