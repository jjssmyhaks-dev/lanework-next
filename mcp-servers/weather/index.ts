// @ts-nocheck — MCP SDK types resolved at build time in project context
/**
 * Weather MCP Server
 * Monsoon/flood route disruption alerts — critical for Indian logistics
 *
 * Tools:
 * - current_weather: Current conditions at a location
 * - route_weather: Weather along a route (origin → destination with waypoints)
 * - weather_alerts: Active alerts for a region (flood, cyclone, heatwave, etc.)
 * - daily_forecast: 7-day forecast for a location
 *
 * ENV: OPENWEATHER_API_KEY
 */

import { LaneworkMCPServer, isDirectRun } from "../shared/server.ts";
import crypto from "crypto";

export class WeatherMCP extends LaneworkMCPServer {
  private apiKey: string = "";
  private baseUrl = "https://api.openweathermap.org/data/3.0";

  constructor() { super("route-optimization"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.apiKey = this.getEnv("OPENWEATHER_API_KEY");
  }

  private async weatherReq(path: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("appid", this.apiKey);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Weather API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  /** ─── TOOLS ─── */

  async currentWeather(lat: number, lng: number): Promise<{
    location: string; temp: number; feelsLike: number; humidity: number;
    windSpeed: number; conditions: string; icon: string;
    visibility: number; rainMm: number; alerts: string[];
  }> {
    const data = await this.weatherReq("/weather", { lat: String(lat), lon: String(lng), units: "metric" });

    const alerts: string[] = [];
    if (data.visibility < 1000) alerts.push("\u26a0\ufe0f Low visibility — driving hazardous");
    if ((data.rain?.["1h"] || 0) > 10) alerts.push("\ud83c\udf27\ufe0f Heavy rain — flooding risk");
    if (data.wind?.speed > 40) alerts.push("💨 Strong winds — truck stability risk");
    if (data.main?.temp > 45) alerts.push("🔥 Extreme heat — vehicle overheating risk");
    if (data.main?.temp < 2) alerts.push("❄️ Freezing conditions — road ice risk");

    await this.logIntegrationEvent("weather", "current", { lat, lng, alerts: alerts.length });

    return {
      location: `${data.name || ""}, ${data.sys?.country || ""}`,
      temp: data.main?.temp || 0,
      feelsLike: data.main?.feels_like || 0,
      humidity: data.main?.humidity || 0,
      windSpeed: (data.wind?.speed || 0) * 3.6, // m/s → km/h
      conditions: data.weather?.[0]?.description || "",
      icon: data.weather?.[0]?.icon || "",
      visibility: data.visibility || 0,
      rainMm: data.rain?.["1h"] || 0,
      alerts,
    };
  }

  async routeWeather(params: {
    waypoints: Array<{ lat: number; lng: number; label: string }>;
  }): Promise<{
    totalDistance: number;
    weatherAlongRoute: Array<{
      label: string; conditions: string; temp: number; rainMm: number;
      risk: "low" | "medium" | "high"; recommendation: string;
    }>;
    overallRisk: "low" | "medium" | "high";
    recommendedAction: string;
  }> {
    await this.logAction("route_weather", "started", { waypoints: params.waypoints.length });

    const reports = [];
    let highRiskCount = 0;

    for (const wp of params.waypoints) {
      const w = await this.currentWeather(wp.lat, wp.lng);
      let risk: "low" | "medium" | "high" = "low";
      let recommendation = "Proceed normally";

      if (w.rainMm > 25 || w.alerts.some(a => a.includes("flood") || a.includes("storm"))) {
        risk = "high"; recommendation = "⚠️ Reroute — unsafe for trucks";
        highRiskCount++;
      } else if (w.rainMm > 10 || w.windSpeed > 50 || w.alerts.some(a => a.includes("rain") || a.includes("wind"))) {
        risk = "medium"; recommendation = "Drive with caution, reduce speed";
      } else if (w.alerts.length > 0) {
        risk = "medium"; recommendation = "Monitor conditions before departure";
      }

      reports.push({
        label: wp.label,
        conditions: w.conditions,
        temp: w.temp,
        rainMm: w.rainMm,
        risk,
        recommendation,
      });
    }

    const overallRisk = highRiskCount > reports.length * 0.3 ? "high" : highRiskCount > 0 ? "medium" : "low";

    await this.logAction("route_weather", "completed", { overallRisk, waypoints: params.waypoints.length });
    return {
      totalDistance: 0, // filled by MapmyIndia
      weatherAlongRoute: reports,
      overallRisk,
      recommendedAction: overallRisk === "high"
        ? "🚨 Delay or reroute — hazardous weather on route"
        : overallRisk === "medium"
          ? "⚠️ Proceed with caution — monitor weather updates"
          : "✅ Weather favourable — proceed on schedule",
    };
  }

  async weatherAlerts(region: string, stateCode?: string): Promise<Array<{
    type: string; severity: string; title: string; description: string;
    startTime: string; endTime: string; affectedAreas: string[];
  }>> {
    // Use OpenWeatherMap OneCall alerts endpoint
    let lat = 20.5937, lng = 78.9629; // India center default
    if (stateCode) {
      const stateCoords: Record<string, [number, number]> = {
        "MH": [19.7515, 75.7139], "DL": [28.7041, 77.1025], "KA": [15.3173, 75.7139],
        "TN": [11.1271, 78.6569], "GJ": [22.2587, 71.1924], "RJ": [27.0238, 74.2179],
        "UP": [27.8974, 78.0880], "WB": [22.9868, 87.8550], "BR": [25.0961, 85.3131],
        "KL": [10.8505, 76.2711], "AP": [15.9129, 79.7400], "TS": [17.1232, 79.2088],
        "PB": [31.1471, 75.3412], "HR": [29.0588, 76.0856], "MP": [22.9734, 78.6569],
        "OR": [20.9517, 85.0985], "AS": [26.2006, 92.9376], "CG": [21.2787, 81.8661],
      };
      const coords = stateCoords[stateCode.toUpperCase()] || [20.5937, 78.9629];
      lat = coords[0]; lng = coords[1];
    }

    try {
      const data = await this.weatherReq("/onecall", { lat: String(lat), lon: String(lng), exclude: "current,minutely,hourly,daily", units: "metric" });
      const alerts = (data.alerts || []) as any[];
      await this.logIntegrationEvent("weather", "alerts", { region, alertCount: alerts.length });

      return alerts.map(a => ({
        type: a.tags?.[0] || "weather",
        severity: a.tags?.includes("Extreme") ? "extreme" : a.tags?.includes("Severe") ? "severe" : "moderate",
        title: a.event || "",
        description: a.description || "",
        startTime: new Date((a.start || 0) * 1000).toISOString(),
        endTime: new Date((a.end || 0) * 1000).toISOString(),
        affectedAreas: [region],
      }));
    } catch {
      // Graceful fallback: return empty — API might be rate-limited
      return [];
    }
  }

  async dailyForecast(lat: number, lng: number, days: number = 7): Promise<Array<{
    date: string; tempMin: number; tempMax: number; conditions: string;
    rainMm: number; humidity: number; windKph: number; suitable: boolean;
  }>> {
    const data = await this.weatherReq("/forecast/daily", { lat: String(lat), lon: String(lng), cnt: String(Math.min(days, 7)), units: "metric" });

    return (data.list || data.daily || []).map((d: any) => {
      const rain = (d.rain || 0);
      const wind = (d.wind_speed || d.speed || 0) * 3.6;
      return {
        date: new Date((d.dt || 0) * 1000).toISOString().slice(0, 10),
        tempMin: d.temp?.min || 0,
        tempMax: d.temp?.max || 0,
        conditions: d.weather?.[0]?.description || "",
        rainMm: rain,
        humidity: d.humidity || 0,
        windKph: Math.round(wind * 10) / 10,
        suitable: rain < 15 && wind < 60 && (d.temp?.max || 100) < 48,
      };
    });
  }
}

async function main(): Promise<void> {
const SDK = "@modelcontextprotocol/sdk";
  const { Server } = await import(`${SDK}/server/index.js`);
  const { StdioServerTransport } = await import(`${SDK}/server/stdio.js`);
  const { CallToolRequestSchema, ListToolsRequestSchema } = await import(`${SDK}/types.js`);
  
  const mcp = new WeatherMCP();
  const server = new Server({ name: "lanework-weather", version: "1.0.0" }, { capabilities: { tools: {} } });
  
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      { name: "current_weather", description: "Current weather at a location with logistics risk assessment", inputSchema: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } }, required: ["lat", "lng"] } },
      { name: "route_weather", description: "Weather along entire route — origin to destination with all stops", inputSchema: { type: "object", properties: { waypoints: { type: "array", items: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" }, label: { type: "string" } }, required: ["lat", "lng", "label"] } } }, required: ["waypoints"] } },
      { name: "weather_alerts", description: "Active weather alerts (flood, cyclone, heatwave) for a region", inputSchema: { type: "object", properties: { region: { type: "string" }, stateCode: { type: "string" } }, required: ["region"] } },
      { name: "daily_forecast", description: "7-day forecast for route planning", inputSchema: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" }, days: { type: "number" } }, required: ["lat", "lng"] } },
    ],
  }));
  
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    await mcp.init();
    try {
      switch (name) {
        case "current_weather": return { content: [{ type: "text", text: JSON.stringify(await mcp.currentWeather(args.lat as number, args.lng as number), null, 2) }] };
        case "route_weather": return { content: [{ type: "text", text: JSON.stringify(await mcp.routeWeather(args as any), null, 2) }] };
        case "weather_alerts": return { content: [{ type: "text", text: JSON.stringify(await mcp.weatherAlerts(args.region as string, args.stateCode as string), null, 2) }] };
        case "daily_forecast": return { content: [{ type: "text", text: JSON.stringify(await mcp.dailyForecast(args.lat as number, args.lng as number, (args.days as number) || 7), null, 2) }] };
        default: throw new Error(`Unknown tool: ${name}`);
      }
    } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
  });
  
  const transport = new StdioServerTransport();
  await mcp.init();
  await server.connect(transport);
  console.error("[WeatherMCP] Ready — 4 tools available");
  
}

// Run only when executed directly (tsx index.ts), not when imported by the app.
if (isDirectRun(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
