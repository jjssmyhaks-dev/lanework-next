// @ts-nocheck — MCP SDK types resolved at build time in project context
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
 * Graceful fallback: when MAPMYINDIA_API_KEY missing, returns DB-cached routes
 * from routes table; geocode returns approximate coords from customer addresses.
 * Each result includes `mode: "live" | "simulated" | "db-fallback"`.
 *
 * ENV: MAPMYINDIA_API_KEY, MAPMYINDIA_LICENSE_KEY
 */

// @ts-nocheck � MCP SDK types resolved at build time
import { LaneworkMCPServer, isDirectRun } from "../shared/server.ts";
import crypto from "crypto";

export class MapmyIndiaMCP extends LaneworkMCPServer {
  private apiKey: string = "";
  private licenseKey: string = "";
  private baseUrl = "https://apis.mapmyindia.com/advancedmaps/v1";
  private hasCredentials: boolean = false;

  constructor() { super("route-optimization"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.apiKey = this.getEnv("MAPMYINDIA_API_KEY");
    this.licenseKey = process.env.MAPMYINDIA_LICENSE_KEY || this.config.MAPMYINDIA_LICENSE_KEY || this.apiKey;
    this.hasCredentials = this.hasEnv("MAPMYINDIA_API_KEY");
  }

  private async mmiReq(path: string, params: Record<string, string> = {}): Promise<any> {
    if (!this.hasCredentials) return null;

    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("lic_key", this.licenseKey);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const result = await this.safeApiCall<any>(
      `MapmyIndia ${path}`,
      url.toString(),
      {},
      null,
    );

    return result.data;
  }

  async geocode(address: string): Promise<{
    mode: string; address: string; lat: number; lng: number; eLoc: string;
    confidence: number; message?: string;
  }> {
    if (!this.hasCredentials) {
      // Try DB fallback: customer addresses
      try {
        const rows: any[] = await this.sql`
          SELECT address FROM customers WHERE address::text ILIKE ${"%" + address + "%"} LIMIT 1
        `;
        if (rows.length > 0) {
          const c = rows[0];
          const addr = typeof c.address === "string" ? c.address : (c.address?.address || "");
          return {
            mode: "db-fallback",
            address: addr || address,
            lat: 0,
            lng: 0,
            eLoc: "",
            confidence: 50,
            message: "📍 Matched a customer address in the DB. Set MAPMYINDIA_API_KEY for live geocoding.",
          };
        }
      } catch { /* DB may not exist */ }

      // Also try shipments destination
      try {
        const rows: any[] = await this.sql`
          SELECT destination FROM shipments WHERE destination::text ILIKE ${"%" + address + "%"} LIMIT 1
        `;
        if (rows.length > 0) {
          // Approximate: use pincode-derived coordinates
          const dest = typeof rows[0].destination === "string" ? rows[0].destination : (rows[0].destination?.address || "");
          const pincodeMatch = dest.match(/\b\d{6}\b/);
          if (pincodeMatch) {
            const [pincodeRow] = await this.sql`SELECT lat, lng FROM pincodes WHERE pincode = ${pincodeMatch[0]} LIMIT 1`;
            if (pincodeRow) {
              return {
                mode: "db-fallback",
                address,
                lat: parseFloat(String(pincodeRow.lat || "0")),
                lng: parseFloat(String(pincodeRow.lng || "0")),
                eLoc: "",
                confidence: 40,
                message: "📍 Approximate from pincode DB. Set MAPMYINDIA_API_KEY for precise geocoding.",
              };
            }
          }
        }
      } catch { /* DB fallback best-effort */ }

      return {
        mode: "simulated",
        address,
        lat: 0, lng: 0, eLoc: "", confidence: 0,
        message: "⚠️ MAPMYINDIA_API_KEY not configured. Set in Vercel env vars for live geocoding.",
      };
    }

    const data = await this.mmiReq(`/${this.apiKey}/geo_code`, { addr: address });

    if (!data) {
      // API failed — try DB
      try {
        const rows: any[] = await this.sql`
          SELECT address FROM customers WHERE address::text ILIKE ${"%" + address + "%"} LIMIT 1
        `;
        if (rows.length > 0) {
          const c = rows[0];
          const addr = typeof c.address === "string" ? c.address : (c.address?.address || "");
          return {
            mode: "db-fallback",
            address: addr || address,
            lat: 0,
            lng: 0,
            eLoc: "",
            confidence: 50,
            message: "📍 Returned from DB — MapmyIndia API unreachable.",
          };
        }
      } catch { /* DB fallback best-effort */ }

      return {
        mode: "simulated",
        address, lat: 0, lng: 0, eLoc: "", confidence: 0,
        message: "⚠️ MapmyIndia API unavailable and no cached data found.",
      };
    }

    const cp = data.copResults || data.results?.[0];
    return {
      mode: "live",
      address: cp?.address || address,
      lat: parseFloat(cp?.latitude || "0"),
      lng: parseFloat(cp?.longitude || "0"),
      eLoc: cp?.eLoc || "",
      confidence: cp?.confidenceScore || 0,
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<{
    mode: string; address: string; houseNumber: string; street: string;
    city: string; state: string; pincode: string; message?: string;
  }> {
    if (!this.hasCredentials) {
      return {
        mode: "simulated",
        address: `${lat}, ${lng}`,
        houseNumber: "", street: "", city: "", state: "", pincode: "",
        message: "⚠️ MAPMYINDIA_API_KEY not configured. Set in Vercel env vars for reverse geocoding.",
      };
    }

    const data = await this.mmiReq(`/${this.apiKey}/rev_geocode`, { lat: String(lat), lng: String(lng) });

    if (!data) {
      return {
        mode: "simulated",
        address: `${lat}, ${lng}`,
        houseNumber: "", street: "", city: "", state: "", pincode: "",
        message: "⚠️ MapmyIndia API unavailable.",
      };
    }

    const res = data.results?.[0] || {};
    return {
      mode: "live",
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
    mode: string; totalDistance: number; totalTime: number;
    optimizedOrder: number[];
    etaPerStop: Array<{ label: string; arrivalTime: string; distanceFromStart: number }>;
    polyline: string; message?: string;
  }> {
    await this.logAction("optimize_route", "started", params);

    if (!this.hasCredentials) {
      // DB fallback: routes table
      try {
        const firstLabel = params.waypoints[0]?.label || "";
        const lastLabel = params.waypoints[params.waypoints.length - 1]?.label || "";

        const rows: any[] = await this.sql`
          SELECT * FROM routes WHERE name ILIKE ${"%" + firstLabel + "%"}
          OR name ILIKE ${"%" + lastLabel + "%"} ORDER BY created_at DESC LIMIT 1
        `;
        if (rows.length > 0) {
          const r = rows[0];
          const cachedWaypoints = typeof r.waypoints === "string" ? JSON.parse(r.waypoints as string) : (r.waypoints || []);
          const etaPerStop = cachedWaypoints.map((w: any, i: number) => ({
            label: w.label || `Stop ${i + 1}`,
            arrivalTime: "N/A",
            distanceFromStart: 0,
          }));

          return {
            mode: "db-fallback",
            totalDistance: parseFloat(String(r.distance_km || "0")),
            totalTime: parseInt(String(r.estimated_duration_min || "0")),
            optimizedOrder: cachedWaypoints.map((_: any, i: number) => i),
            etaPerStop,
            polyline: "",
            message: "📦 Returned cached route from DB. Set MAPMYINDIA_API_KEY for live route optimization.",
          };
        }
      } catch { /* DB fallback best-effort */ }

      await this.logAction("optimize_route", "completed", { source: "simulated" });
      return {
        mode: "simulated",
        totalDistance: 0, totalTime: 0,
        optimizedOrder: params.waypoints.map((_, i) => i),
        etaPerStop: params.waypoints.map((w, i) => ({
          label: w.label || `Stop ${i + 1}`,
          arrivalTime: "N/A",
          distanceFromStart: 0,
        })),
        polyline: "",
        message: "⚠️ MAPMYINDIA_API_KEY not configured and no cached routes found. Set API key in Vercel env vars.",
      };
    }

    const pts = params.waypoints.map(w => `${w.lat},${w.lng}`).join(";");
    const data = await this.mmiReq(`/${this.apiKey}/route_adv`, {
      waypoints: pts,
      resource: "route",
      profile: params.vehicleType === "truck" ? "driving" : "driving",
      overview: "full",
    });

    if (!data) {
      // API failed — DB fallback
      try {
        const rows: any[] = await this.sql`
          SELECT * FROM routes ORDER BY created_at DESC LIMIT 1
        `;
        if (rows.length > 0) {
          const r = rows[0];
          const cachedWaypoints = typeof r.waypoints === "string" ? JSON.parse(r.waypoints as string) : (r.waypoints || []);
          const etaPerStop = cachedWaypoints.map((w: any, i: number) => ({
            label: w.label || `Stop ${i + 1}`,
            arrivalTime: "N/A",
            distanceFromStart: 0,
          }));

          await this.logAction("optimize_route", "completed", { source: "db-fallback" });
          return {
            mode: "db-fallback",
            totalDistance: parseFloat(String(r.distance_km || "0")),
            totalTime: parseInt(String(r.estimated_duration_min || "0")),
            optimizedOrder: cachedWaypoints.map((_: any, i: number) => i),
            etaPerStop,
            polyline: "",
            message: "⚠️ MapmyIndia API unavailable. Returned most recent cached route.",
          };
        }
      } catch { /* DB fallback best-effort */ }

      await this.logAction("optimize_route", "failed", { error: "api-unavailable" });
      return {
        mode: "simulated",
        totalDistance: 0, totalTime: 0,
        optimizedOrder: params.waypoints.map((_, i) => i),
        etaPerStop: params.waypoints.map((w, i) => ({
          label: w.label || `Stop ${i + 1}`,
          arrivalTime: "N/A",
          distanceFromStart: 0,
        })),
        polyline: "",
        message: "⚠️ MapmyIndia API unavailable and no cached data.",
      };
    }

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

    // Save to DB for caching
    try {
      const routeId = crypto.randomUUID();
      const originLabel = params.waypoints[0]?.label || "Start";
      const destLabel = params.waypoints[params.waypoints.length - 1]?.label || "End";
      await this.sql`
        INSERT INTO routes (id, name, status, total_distance_km, total_duration_minutes, total_stops, constraints, metrics, created_at)
        VALUES (${routeId}, 'Optimized Route', 'active',
          ${Math.round((route.distance || 0) / 1000 * 10) / 10},
          ${Math.round((route.duration || 0) / 60)},
          ${params.waypoints.length},
          ${JSON.stringify({ origin: originLabel, destination: destLabel })}::jsonb,
          ${JSON.stringify({ waypoints: params.waypoints })}::jsonb, NOW())
      `;
    } catch { /* DB insert best-effort */ }

    await this.logAction("optimize_route", "completed", { routeId: "live" });
    return {
      mode: "live",
      totalDistance: Math.round((route.distance || 0) / 1000 * 10) / 10,
      totalTime: Math.round((route.duration || 0) / 60),
      optimizedOrder: legs.map((_: any, i: number) => i),
      etaPerStop,
      polyline: route.geometry || "",
    };
  }

  async distanceMatrix(
    origins: Array<{ lat: number; lng: number }>,
    destinations: Array<{ lat: number; lng: number }>,
  ): Promise<{
    mode: string;
    matrix: Array<Array<{ distance: number; time: number }>>;
    message?: string;
  }> {
    if (!this.hasCredentials) {
      return {
        mode: "simulated",
        matrix: origins.map(() => destinations.map(() => ({ distance: 0, time: 0 }))),
        message: "⚠️ MAPMYINDIA_API_KEY not configured. Set in Vercel env vars for distance matrix.",
      };
    }

    const src = origins.map(o => `${o.lat},${o.lng}`).join(";");
    const dst = destinations.map(d => `${d.lat},${d.lng}`).join(";");

    const data = await this.mmiReq(`/${this.apiKey}/distance_matrix/driving/${src}/${dst}`);

    if (!data) {
      return {
        mode: "simulated",
        matrix: origins.map(() => destinations.map(() => ({ distance: 0, time: 0 }))),
        message: "⚠️ MapmyIndia API unavailable.",
      };
    }

    const matrix = ((data.results || []) as any[]).map((row: any) =>
      (row.elements || []).map((el: any) => ({
        distance: Math.round((el.distance || 0) / 1000 * 10) / 10,
        time: Math.round((el.duration || 0) / 60),
      })),
    );

    return { mode: "live", matrix };
  }
}

async function main(): Promise<void> {
const SDK = "@modelcontextprotocol/sdk";
  const { Server } = await import(`${SDK}/server/index.js`);
  const { StdioServerTransport } = await import(`${SDK}/server/stdio.js`);
  const { CallToolRequestSchema, ListToolsRequestSchema } = await import(`${SDK}/types.js`);
  
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
  
}

// Run only when executed directly (tsx index.ts), not when imported by the app.
if (isDirectRun(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
