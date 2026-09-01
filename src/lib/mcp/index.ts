/**
 * MCP Adapter — wires the standalone MCP servers (mcp-servers/*) into the
 * integration action API.
 *
 * Each integration type maps to an MCP server class; each action maps to one
 * of its tool methods. `callMcpAction` instantiates the server, calls init(),
 * invokes the tool with normalized args, and returns a normalized
 * `{ success, mode, ...result }` response — or null when the integration/action
 * isn't covered by an MCP server (caller falls back to inline logic).
 *
 * Errors never propagate: a failing tool returns a graceful simulated result
 * so the chat copilot always has an answer.
 */

import { ShiprocketMCP } from "../../../mcp-servers/shiprocket/index";
import { TallyMCP } from "../../../mcp-servers/tally/index";
import { EwayBillMCP } from "../../../mcp-servers/ewaybill/index";
import { MapmyIndiaMCP } from "../../../mcp-servers/mapmyindia/index";
import { FleetMCP } from "../../../mcp-servers/fleet/index";
import { ShopifyMCP } from "../../../mcp-servers/shopify/index";
import { GoogleSheetsMCP } from "../../../mcp-servers/googlesheets/index";
import { ErpMCP } from "../../../mcp-servers/erp/index";
import { ComplianceMCP } from "../../../mcp-servers/compliance/index";
import { EmailMCP } from "../../../mcp-servers/email/index";
import { FedexMCP } from "../../../mcp-servers/fedex/index";
import { WeatherMCP } from "../../../mcp-servers/weather/index";
import { WmsMCP } from "../../../mcp-servers/wms/index";
import { ScannerMCP } from "../../../mcp-servers/scanner/index";
import { DockSchedulerMCP } from "../../../mcp-servers/dockscheduler/index";

// ── Types ──

type ToolInvoker = (mcp: any, payload: any) => Promise<any>;

function arg(...keys: string[]) {
  return (payload: any) => {
    for (const k of keys) {
      if (payload[k] !== undefined && payload[k] !== null && payload[k] !== "") return payload[k];
    }
    return undefined;
  };
}

function num(...keys: string[]) {
  return (payload: any) => {
    for (const k of keys) {
      const v = payload[k];
      if (v !== undefined && v !== null && v !== "") return Number(v);
    }
    return undefined;
  };
}

function pick(...keys: string[]) {
  return (payload: any) => {
    const out: Record<string, any> = {};
    for (const k of keys) {
      if (payload[k] !== undefined) out[k] = payload[k];
    }
    return out;
  };
}

/** Per-integration action → MCP tool call */
const REGISTRY: Record<string, { create: () => any; actions: Record<string, ToolInvoker> }> = {
  shiprocket: {
    create: () => new ShiprocketMCP(),
    actions: {
      track_shipment: (m, p) => m.trackShipment(arg("awb", "tracking_number", "trackingNumber")(p) || ""),
      create_shipment: (m, p) => m.bookShipment(p),
      compare_rates: (m, p) => m.getRates(arg("pickup_pincode", "pickupPostcode", "pickup")(p) || "", arg("delivery_pincode", "deliveryPostcode", "delivery")(p) || "", num("weight_kg", "weight")(p) || 1),
      cancel_shipment: (m, p) => m.cancelShipment(arg("awb", "shipment_id", "shipmentId")(p) || ""),
      generate_label: (m, p) => m.generateLabel(arg("shipment_id", "shipmentId", "id")(p) || ""),
      handle_webhook: (m, p) => m.handleWebhook(p),
    },
  },
  tally_prime: {
    create: () => new TallyMCP(),
    actions: {
      sync_inventory: (m) => m.syncInventory(),
      sync_orders: (m) => m.syncOrders(),
      push_orders: (m) => m.syncOrders(),
      check_ledger: (m, p) => m.getLedger(arg("ledger_name", "ledgerName", "name")(p) || ""),
      check_stock: (m, p) => m.checkStock(arg("sku", "SKU")(p) || ""),
    },
  },
  gstn_eway_bill: {
    create: () => new EwayBillMCP(),
    actions: {
      generate_ewb: (m, p) => m.generateEwaybill({
        shipmentId: arg("shipment_id", "shipmentId")(p) || "",
        fromGstin: arg("from_gstin", "fromGstin")(p) || "",
        toGstin: arg("to_gstin", "toGstin")(p) || "",
        fromPincode: arg("from_pincode", "fromPincode")(p) || "",
        toPincode: arg("to_pincode", "toPincode")(p) || "",
        invoiceNo: arg("invoice_no", "invoiceNo")(p) || "",
        invoiceValue: num("invoice_value", "invoiceValue")(p) || 0,
        hsnCode: arg("hsn_code", "hsnCode")(p) || "",
        productName: arg("product_name", "productName")(p) || "Item",
        quantity: num("quantity")(p) || 1,
        vehicleNo: arg("vehicle_no", "vehicleNo")(p),
        transporterId: arg("transporter_id", "transporterId")(p),
        transDocNo: arg("trans_doc_no", "transDocNo")(p),
        transDocDate: arg("trans_doc_date", "transDocDate")(p),
      }),
      cancel_ewb: (m, p) => m.cancelEwaybill(arg("ewb_no", "ewbNo", "eway_bill_no")(p) || "", arg("reason")(p) || "Order cancelled"),
      view_ewb: (m, p) => m.getEwaybill(arg("ewb_no", "ewbNo")(p) || ""),
      validate_gstin: (m, p) => m.validateGstin(arg("gstin", "gstin_number")(p) || ""),
    },
  },
  mapmyindia: {
    create: () => new MapmyIndiaMCP(),
    actions: {
      geocode: (m, p) => m.geocode(arg("address", "addr")(p) || ""),
      reverse_geocode: (m, p) => m.reverseGeocode(num("lat")(p) || 0, num("lng", "lon")(p) || 0),
      optimize_route: (m, p) => m.optimizeRoute(p),
      distance_matrix: (m, p) => m.distanceMatrix(p.origins || p.origin || [], p.destinations || p.destination || [], p),
    },
  },
  loconav: {
    create: () => new FleetMCP(),
    actions: {
      track_all: (m) => m.getFleetStatus(),
      track_vehicle: (m, p) => m.trackVehicle(arg("vehicle_id", "vehicleId", "id")(p) || ""),
      maintenance_check: (m) => m.getFleetStatus(),
      schedule_maintenance: (m, p) => m.scheduleMaintenance(p),
      driver_report: (m, p) => m.getDriverReport(arg("driver_id", "driverId", "id")(p) || ""),
    },
  },
  fleetx: {
    create: () => new FleetMCP(),
    actions: {
      track_all: (m) => m.getFleetStatus(),
      track_vehicle: (m, p) => m.trackVehicle(arg("vehicle_id", "vehicleId", "id")(p) || ""),
      maintenance_check: (m) => m.getFleetStatus(),
      schedule_maintenance: (m, p) => m.scheduleMaintenance(p),
      driver_report: (m, p) => m.getDriverReport(arg("driver_id", "driverId", "id")(p) || ""),
    },
  },
  shopify: {
    create: () => new ShopifyMCP(),
    actions: {
      sync_orders: (m, p) => m.syncOrdersShopify(num("limit")(p) || 50),
      sync_inventory: (m) => m.syncInventory(),
      order_status: (m, p) => m.getOrderStatus(arg("order_number", "orderNumber", "order_no")(p) || ""),
    },
  },
  woocommerce: {
    create: () => new ShopifyMCP(),
    actions: {
      sync_orders: (m, p) => m.syncOrdersWooCommerce(num("limit")(p) || 50),
    },
  },
  google_sheets: {
    create: () => new GoogleSheetsMCP(),
    actions: {
      sync_sheet: (m, p) => m.syncToDb(p),
      read_sheet: (m, p) => m.readSheet({ sheetName: arg("sheet_name", "sheetName")(p) || "Sheet1", range: arg("range")(p) }),
      write_sheet: (m, p) => m.writeSheet(p),
      export_sheet: (m, p) => m.syncFromDb(p),
    },
  },
  sap_b1: {
    create: () => new ErpMCP(),
    actions: {
      sync_orders: (m, p) => m.syncOrders(arg("date_from", "dateFrom")(p)),
      sync_inventory: (m) => m.pushInventory(),
      sync_invoices: (m, p) => m.syncInvoices(arg("date_from", "dateFrom")(p)),
      business_partner: (m, p) => m.getBusinessPartner(arg("card_code", "cardCode")(p) || ""),
    },
  },
  erp: {
    create: () => new ErpMCP(),
    actions: {
      sync_orders: (m, p) => m.syncOrders(arg("date_from", "dateFrom")(p)),
      sync_inventory: (m) => m.pushInventory(),
      sync_invoices: (m, p) => m.syncInvoices(arg("date_from", "dateFrom")(p)),
      business_partner: (m, p) => m.getBusinessPartner(arg("card_code", "cardCode")(p) || ""),
    },
  },
  compliance: {
    create: () => new ComplianceMCP(),
    actions: {
      check_license: (m, p) => m.checkDriverLicense(arg("license_number", "licenseNumber", "license")(p) || ""),
      check_registration: (m, p) => m.checkVehicleRegistration(arg("registration_number", "registrationNumber", "registration")(p) || ""),
      check_challan: (m, p) => m.checkChallan(arg("vehicle_reg", "vehicleReg", "registration")(p) || ""),
      summary: (m) => m.complianceSummary(),
      compliance_summary: (m) => m.complianceSummary(),
    },
  },
  email: {
    create: () => new EmailMCP(),
    actions: {
      send_tracking_update: (m, p) => m.sendTrackingUpdate(p),
      auto_reply: (m, p) => m.autoReply(p),
      check_inbox: (m, p) => m.checkInbox(num("limit")(p) || 10),
    },
  },
  fedex: {
    create: () => new FedexMCP(),
    actions: {
      track_fedex: (m, p) => m.trackFedex(arg("tracking_number", "trackingNumber", "awb")(p) || ""),
      create_fedex: (m, p) => m.createFedexShipment(p),
      track_dhl: (m, p) => m.trackDhl(arg("tracking_number", "trackingNumber", "awb")(p) || ""),
      create_dhl: (m, p) => m.createDhlShipment(p),
    },
  },
  weather: {
    create: () => new WeatherMCP(),
    actions: {
      current_weather: (m, p) => m.currentWeather(num("lat")(p) || 0, num("lng", "lon")(p) || 0),
      route_weather: (m, p) => m.routeWeather(p),
      weather_alerts: (m, p) => m.weatherAlerts(arg("region", "state", "city")(p) || "", arg("state_code", "stateCode")(p)),
      daily_forecast: (m, p) => m.dailyForecast(num("lat")(p) || 0, num("lng", "lon")(p) || 0, num("days")(p) || 7),
    },
  },
  wms: {
    create: () => new WmsMCP(),
    actions: {
      dock_schedule: (m, p) => m.getDockSchedule(p),
      assign_pick: (m, p) => m.assignPickTask(p),
      check_inventory: (m, p) => m.checkInventory(p),
      receive_shipment: (m, p) => m.receiveShipment(p),
    },
  },
  scanner: {
    create: () => new ScannerMCP(),
    actions: {
      verify_pick: (m, p) => m.verifyPick(p),
      receive_item: (m, p) => m.receiveItem(p),
      check_sku: (m, p) => m.checkSku(arg("barcode", "sku", "barcode_value")(p) || ""),
      generate_label: (m, p) => m.generateLabel(p),
    },
  },
  dockscheduler: {
    create: () => new DockSchedulerMCP(),
    actions: {
      book_dock: (m, p) => m.bookDock(p),
      availability: (m, p) => m.getDockAvailability(p),
      check_in: (m, p) => m.checkInCarrier(p),
      release_dock: (m, p) => m.releaseDock(p),
    },
  },
};

import { checkCircuit, recordSuccess, recordFailure, type CircuitState } from "@/lib/agents/circuit-breaker";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "mcp-adapter" });

/**
 * Attempt to run an integration action through the MCP servers.
 * Returns null when the integration or action isn't covered by an MCP server
 * (the caller should fall back to its inline logic).
 *
 * Options:
 * - dryRun: if true, returns what WOULD happen without executing
 * - skipCircuitBreaker: if true, bypasses circuit breaker (for testing)
 */
export async function callMcpAction(
  type: string,
  action: string,
  payload: Record<string, any> = {},
  options: { dryRun?: boolean; skipCircuitBreaker?: boolean } = {}
): Promise<Record<string, any> | null> {
  const entry = REGISTRY[type];
  const invoker = entry?.actions?.[action];
  if (!entry || !invoker) return null;

  // ── Dry run mode ──
  if (options.dryRun) {
    return {
      success: true,
      mode: "dry_run",
      message: `[DRY RUN] Would execute ${action} on ${type} with payload: ${JSON.stringify(payload).slice(0, 200)}`,
      integration: type,
      action,
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Circuit breaker check ──
  if (!options.skipCircuitBreaker) {
    const circuit = checkCircuit(type);
    if (!circuit.allowed) {
      return {
        success: false,
        mode: "circuit_open",
        message: `${type} is temporarily unavailable (${circuit.reason}). Try again shortly.`,
        integration: type,
        action,
        circuitState: circuit.state,
      };
    }
  }

  // ── Check tool availability (env vars) ──
  const envKey = `${type.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`;
  const isConfigured = process.env[envKey] || process.env[type.toUpperCase() + "_API_KEY"];
  if (!isConfigured && type !== "scanner" && type !== "dockscheduler") {
    // Still try to init — some MCP servers work without API keys (simulation mode)
    log.warn({ integration: type, envKey }, "No API key found — will use simulation mode");
  }

  let mcp: any;
  try {
    mcp = entry.create();
    await mcp.init();
  } catch (e: any) {
    log.error({ err: e.message, integration: type }, "MCP init failed");
    if (!options.skipCircuitBreaker) recordFailure(type);
    return {
      success: true,
      mode: "simulated",
      message: `${type} is temporarily unavailable (${e.message}). Try again shortly.`,
    };
  }

  try {
    const result = await invoker(mcp, payload || {});
    const mode = typeof result?.mode === "string" ? result.mode : "simulated";
    if (!options.skipCircuitBreaker) recordSuccess(type);
    return { success: true, mode, ...result, source: `mcp:${type}` };
  } catch (e: any) {
    log.error({ err: e.message, integration: type, action }, "MCP action failed");
    if (!options.skipCircuitBreaker) recordFailure(type);
    return {
      success: true,
      mode: "simulated",
      message: `${action} could not be completed (${e.message}). Please check your credentials and try again.`,
      error: e.message,
      source: `mcp:${type}`,
    };
  }
}

/** List which integrations/actions are handled by MCP servers (for diagnostics). */
export function listMcpCoverage(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [type, entry] of Object.entries(REGISTRY)) {
    out[type] = Object.keys(entry.actions);
  }
  return out;
}
