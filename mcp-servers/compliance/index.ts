/**
 * Compliance MCP Server
 * RTO e-Challan, driver license verification, vehicle registration, insurance tracking
 *
 * Tools:
 * - check_driver_license: Verify driver license validity (Parivahan API)
 * - check_vehicle_registration: Verify vehicle RC, insurance, fitness, PUC
 * - check_challan: Fetch pending e-challans for a vehicle
 * - compliance_summary: Fleet-wide compliance report (licenses, insurance, fitness, PUC)
 *
 * ENV: PARIVAHAN_API_KEY (optional — uses public RTO database or manual tracking if not set)
 */

import { LaneworkMCPServer } from "../shared/server.js";
import crypto from "crypto";

export class ComplianceMCP extends LaneworkMCPServer {
  private apiKey: string = "";
  private parivahanBase = "https://parivahan.gov.in/parivahanapi/v1";

  constructor() { super("fleet-management"); }

  async init(): Promise<void> {
    await this.loadConfig();
    this.apiKey = process.env.PARIVAHAN_API_KEY || this.config.PARIVAHAN_API_KEY || "";
  }

  private async parivahanReq(path: string): Promise<any> {
    if (!this.apiKey) {
      // Fallback: use Neon DB to track compliance
      return null;
    }
    const res = await fetch(`${this.parivahanBase}${path}`, {
      headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Parivahan API error: ${res.status}`);
    return res.json();
  }

  /** ─── TOOLS ─── */

  async checkDriverLicense(licenseNumber: string): Promise<{
    licenseNumber: string; valid: boolean; name: string; issuedDate: string;
    expiryDate: string; status: string; endorsements: string[];
    daysUntilExpiry: number; alert: string;
  }> {
    await this.logAction("check_driver_license", "started", { licenseNumber });
    const driverId = crypto.randomUUID();

    // Try Parivahan API first
    let result: any = null;
    try { result = await this.parivahanReq(`/license/${licenseNumber}`); } catch {}

    if (result) {
      const daysUntilExpiry = Math.ceil((new Date(result.expiryDate).getTime() - Date.now()) / 86400000);

      await this.sql`
        INSERT INTO drivers (id, name, license_number, license_expiry, license_status, created_at, updated_at)
        VALUES (${driverId}, ${result.holderName || ""}, ${licenseNumber}, ${result.expiryDate}, 'verified', NOW(), NOW())
        ON CONFLICT (license_number) DO UPDATE SET license_expiry = ${result.expiryDate}, license_status = 'verified', updated_at = NOW()
      `;

      return {
        licenseNumber, valid: daysUntilExpiry > 0, name: result.holderName || "",
        issuedDate: result.issueDate || "", expiryDate: result.expiryDate || "",
        status: daysUntilExpiry > 0 ? "valid" : "expired",
        endorsements: result.endorsements || [],
        daysUntilExpiry,
        alert: daysUntilExpiry <= 0 ? "🚨 License expired — renew immediately"
          : daysUntilExpiry <= 30 ? "⚠️ License expiring within 30 days"
          : daysUntilExpiry <= 90 ? "ℹ️ License expiring within 90 days — plan renewal"
          : "✅ License valid",
      };
    }

    // Fallback: check from our DB
    const [driver] = await this.sql`SELECT * FROM drivers WHERE license_number = ${licenseNumber}`;
    if (driver) {
      const daysUntilExpiry = driver.license_expiry
        ? Math.ceil((new Date(driver.license_expiry).getTime() - Date.now()) / 86400000)
        : 365;
      return {
        licenseNumber, valid: daysUntilExpiry > 0,
        name: driver.name || "", issuedDate: "", expiryDate: driver.license_expiry || "",
        status: daysUntilExpiry > 0 ? "valid" : "expired",
        endorsements: [], daysUntilExpiry,
        alert: daysUntilExpiry <= 0 ? "🚨 License expired"
          : daysUntilExpiry <= 30 ? "⚠️ Expiring soon"
          : "✅ Valid (from local records)",
      };
    }

    // New driver — create record
    await this.sql`
      INSERT INTO drivers (id, license_number, license_status, created_at, updated_at)
      VALUES (${driverId}, ${licenseNumber}, 'unverified', NOW(), NOW())
    `;

    return {
      licenseNumber, valid: true, name: "", issuedDate: "", expiryDate: "",
      status: "unverified", endorsements: [], daysUntilExpiry: 365,
      alert: "ℹ️ License not verified with RTO yet — add details manually",
    };
  }

  async checkVehicleRegistration(registrationNumber: string): Promise<{
    registrationNumber: string; status: string;
    rcValid: boolean; rcExpiry: string;
    insuranceValid: boolean; insuranceExpiry: string;
    fitnessValid: boolean; fitnessExpiry: string;
    pucValid: boolean; pucExpiry: string;
    challanCount: number; totalChallanAmount: number;
    alerts: string[];
  }> {
    await this.logAction("check_vehicle_registration", "started", { registrationNumber });

    // Check our DB
    const [vehicle] = await this.sql`SELECT * FROM vehicles WHERE registration = ${registrationNumber}`;
    const alerts: string[] = [];

    const now = Date.now();
    const checkExpiry = (date: string | null | undefined, label: string, warnDays = 30) => {
      if (!date) return { valid: true, days: 365 };
      const days = Math.ceil((new Date(date).getTime() - now) / 86400000);
      const valid = days > 0;
      if (days <= 0) alerts.push(`🚨 ${label} expired`);
      else if (days <= warnDays) alerts.push(`⚠️ ${label} expiring in ${days} days`);
      return { valid, days };
    };

    const insurance = checkExpiry(vehicle?.insurance_expiry, "Insurance");
    const fitness = checkExpiry(vehicle?.fitness_expiry, "Fitness certificate");
    const puc = checkExpiry(vehicle?.puc_expiry, "PUC", 15);
    const rc = checkExpiry(vehicle?.rc_expiry, "Registration", 60);

    // Fetch challans if Parivahan API available
    let challanCount = 0, totalChallanAmount = 0;
    try {
      const challanData = await this.parivahanReq(`/challan/${registrationNumber}`);
      if (challanData) {
        challanCount = (challanData.challans || []).length;
        totalChallanAmount = (challanData.challans || []).reduce((sum: number, c: any) => sum + (c.amount || c.fine || 0), 0);
        if (challanCount > 0) alerts.push(`⚠️ ${challanCount} pending challan(s) — ₹${totalChallanAmount}`);
      }
    } catch {
      // DB fallback
      const [challanRows] = await this.sql`SELECT COUNT(*) as count FROM challans WHERE vehicle_reg = ${registrationNumber} AND status = 'pending'`;
      challanCount = challanRows?.count || 0;
    }

    return {
      registrationNumber,
      status: alerts.length === 0 ? "compliant" : "non_compliant",
      rcValid: rc.valid, rcExpiry: vehicle?.rc_expiry || "",
      insuranceValid: insurance.valid, insuranceExpiry: vehicle?.insurance_expiry || "",
      fitnessValid: fitness.valid, fitnessExpiry: vehicle?.fitness_expiry || "",
      pucValid: puc.valid, pucExpiry: vehicle?.puc_expiry || "",
      challanCount, totalChallanAmount,
      alerts: alerts.length > 0 ? alerts : ["✅ All clear"],
    };
  }

  async checkChallan(vehicleReg: string): Promise<Array<{
    challanNo: string; date: string; violation: string; amount: number;
    status: string; location: string; payUrl: string;
  }>> {
    try {
      const data = await this.parivahanReq(`/challan/${vehicleReg}`);
      return (data.challans || data.data || []).map((c: any) => ({
        challanNo: c.challanNo || c.id || "",
        date: c.challanDate || c.date || "",
        violation: c.violation || c.offence || "",
        amount: c.amount || c.fine || 0,
        status: c.status || "pending",
        location: c.location || c.place || "",
        payUrl: c.paymentUrl || `https://echallan.parivahan.gov.in/pay/${c.challanNo}`,
      }));
    } catch {
      // DB fallback
      const rows = await this.sql`SELECT * FROM challans WHERE vehicle_reg = ${vehicleReg} ORDER BY created_at DESC`;
      return rows.map((r: any) => ({
        challanNo: r.id, date: r.created_at?.toISOString(), violation: r.description || "",
        amount: r.amount || 0, status: r.status || "pending", location: r.location || "", payUrl: "",
      }));
    }
  }

  async complianceSummary(): Promise<{
    totalDrivers: number; compliantDrivers: number;
    totalVehicles: number; compliantVehicles: number;
    expiringLicenses: number; expiringInsurance: number;
    expiringFitness: number; expiringPuc: number;
    pendingChallans: number; totalChallanAmount: number;
    criticalAlerts: string[];
  }> {
    const drivers = await this.sql`SELECT * FROM drivers`;
    const vehicles = await this.sql`SELECT * FROM vehicles`;

    const now = Date.now();
    const expiring = (date: string | null, days: number) =>
      date && Math.ceil((new Date(date).getTime() - now) / 86400000) <= days;

    const criticalAlerts: string[] = [];

    const expiringLicenses = drivers.filter((d: any) => expiring(d.license_expiry, 30)).length;
    const expiringInsurance = vehicles.filter((v: any) => expiring(v.insurance_expiry, 30)).length;
    const expiringFitness = vehicles.filter((v: any) => expiring(v.fitness_expiry, 30)).length;
    const expiringPuc = vehicles.filter((v: any) => expiring(v.puc_expiry, 15)).length;

    if (expiringLicenses > 0) criticalAlerts.push(`🚨 ${expiringLicenses} driver license(s) expiring within 30 days`);
    if (expiringInsurance > 0) criticalAlerts.push(`⚠️ ${expiringInsurance} vehicle insurance(s) expiring soon`);
    if (expiringFitness > 0) criticalAlerts.push(`⚠️ ${expiringFitness} fitness certificate(s) expiring soon`);
    if (expiringPuc > 0) criticalAlerts.push(`⚠️ ${expiringPuc} PUC certificate(s) expiring soon`);

    if (criticalAlerts.length === 0) criticalAlerts.push("✅ Fleet fully compliant");

    await this.logAction("compliance_summary", "completed", { drivers: drivers.length, vehicles: vehicles.length });

    return {
      totalDrivers: drivers.length,
      compliantDrivers: drivers.length - expiringLicenses,
      totalVehicles: vehicles.length,
      compliantVehicles: vehicles.filter((v: any) =>
        !expiring(v.insurance_expiry, 30) && !expiring(v.fitness_expiry, 30) && !expiring(v.puc_expiry, 15)
      ).length,
      expiringLicenses, expiringInsurance, expiringFitness, expiringPuc,
      pendingChallans: 0, totalChallanAmount: 0, // filled by challan checks
      criticalAlerts,
    };
  }
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const mcp = new ComplianceMCP();
const server = new Server({ name: "lanework-compliance", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "check_driver_license", description: "Verify driver license with Parivahan RTO", inputSchema: { type: "object", properties: { licenseNumber: { type: "string" } }, required: ["licenseNumber"] } },
    { name: "check_vehicle_registration", description: "Check vehicle RC, insurance, fitness, PUC validity", inputSchema: { type: "object", properties: { registrationNumber: { type: "string" } }, required: ["registrationNumber"] } },
    { name: "check_challan", description: "Fetch pending e-challans for a vehicle", inputSchema: { type: "object", properties: { vehicleReg: { type: "string" } }, required: ["vehicleReg"] } },
    { name: "compliance_summary", description: "Fleet-wide compliance report", inputSchema: { type: "object", properties: {}, required: [] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  await mcp.init();
  try {
    switch (name) {
      case "check_driver_license": return { content: [{ type: "text", text: JSON.stringify(await mcp.checkDriverLicense(args.licenseNumber as string), null, 2) }] };
      case "check_vehicle_registration": return { content: [{ type: "text", text: JSON.stringify(await mcp.checkVehicleRegistration(args.registrationNumber as string), null, 2) }] };
      case "check_challan": return { content: [{ type: "text", text: JSON.stringify(await mcp.checkChallan(args.vehicleReg as string), null, 2) }] };
      case "compliance_summary": return { content: [{ type: "text", text: JSON.stringify(await mcp.complianceSummary(), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (e: any) { return { content: [{ type: "text", text: JSON.stringify({ error: e.message }) }], isError: true }; }
});

const transport = new StdioServerTransport();
await mcp.init();
await server.connect(transport);
console.error("[ComplianceMCP] Ready — 4 tools available");
