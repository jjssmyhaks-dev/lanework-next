/**
 * MCP Server Knowledge Entries
 *
 * Comprehensive knowledge base for all 15 MCP servers and their tools.
 * Each entry includes: description, input/output schemas, env vars,
 * modes, and JSON-LD metadata for cross-agent interoperability.
 *
 * Source: mcp-servers/ directory — verified against actual implementations.
 */

import type { KBEntry } from "./types";

export const MCP_ENTRIES: KBEntry[] = [
  // ══════════════════════════════════════════════
  // SHIPROCKET — Indian domestic shipping
  // ══════════════════════════════════════════════
  {
    id: "mcp:shiprocket:track_shipment",
    title: "Track Shipment (Shiprocket)",
    description:
      "Track any shipment by AWB number across 7+ Indian carriers (Delhivery, BlueDart, DTDC, Ecom Express, XpressBees, Shadowfax, etc.). Returns real-time status, current location, estimated delivery, and scan history. Works with any AWB regardless of carrier. Returns mode field: live (API succeeded), simulated (missing credentials), or db-fallback (cached data).",
    category: "mcp_tool",
    subCategory: "tracking",
    tags: ["track", "awb", "shipment", "delivery", "delhivery", "bluedart", "dtdc", "ecom", "xpressbees", "shadowfax", "courier", "package", "where", "status"],
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Shiprocket Shipment Tracking",
      applicationCategory: "LogisticsApplication",
      provider: { "@type": "Organization", name: "Lanework" },
    },
    metadata: {
      integration: "shiprocket",
      indianCarriers: ["Delhivery", "BlueDart", "DTDC", "Ecom Express", "XpressBees", "Shadowfax", "India Post"],
      exampleAWB: "1234567890",
      outputFields: ["awb", "status", "statusCode", "location", "lastUpdate", "scans"],
    },
    mcp: {
      server: "shiprocket",
      toolName: "track_shipment",
      inputSchema: {
        type: "object",
        properties: { awb: { type: "string", description: "AWB/Tracking number" } },
        required: ["awb"],
      },
      requiredEnvVars: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD"],
      modes: ["live", "simulated", "db-fallback"],
      latencyMs: 1200,
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 10,
  },
  {
    id: "mcp:shiprocket:create_shipment",
    title: "Book Shipment (Shiprocket)",
    description:
      "Book a new shipment with the best available Indian carrier. Compares rates across Delhivery, BlueDart, DTDC etc. and assigns the optimal carrier. Supports prepaid and COD payment modes. Returns AWB, courier name, shipping label URL, and tracking URL. Auto-saves to database for tracking.",
    category: "mcp_tool",
    subCategory: "shipping",
    tags: ["book", "shipment", "ship", "send", "courier", "parcel", "dispatch", "cod", "prepaid", "label", "awb"],
    metadata: {
      integration: "shiprocket",
      supportedPaymentModes: ["prepaid", "cod"],
      outputFields: ["shipmentId", "awb", "courier", "labelUrl", "trackingUrl"],
    },
    mcp: {
      server: "shiprocket",
      toolName: "create_shipment",
      inputSchema: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          pickupPincode: { type: "string" },
          deliveryPincode: { type: "string" },
          weight: { type: "number" },
          paymentMode: { type: "string", enum: ["prepaid", "cod"] },
          codAmount: { type: "number" },
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          customerAddress: { type: "string" },
        },
        required: ["orderId", "pickupPincode", "deliveryPincode", "weight", "customerName", "customerPhone", "customerAddress"],
      },
      requiredEnvVars: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD"],
      modes: ["live", "simulated"],
      latencyMs: 2000,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 9,
  },
  {
    id: "mcp:shiprocket:get_rates",
    title: "Compare Shipping Rates (Shiprocket)",
    description:
      "Compare shipping rates across all available Indian carriers for a given route (pickup pincode → delivery pincode) and weight. Returns sorted list of carrier options with rates, estimated delivery days, and recommended carrier. Useful for cost optimization before booking.",
    category: "mcp_tool",
    subCategory: "shipping",
    tags: ["rates", "price", "cost", "compare", "carrier", "shipping", "cheapest", "best", "pincode", "delivery"],
    metadata: {
      integration: "shiprocket",
      outputFields: ["courier", "rate", "estimatedDays", "isRecommended"],
      indianRouteExample: "Mumbai (400001) → Delhi (110001), 5kg",
    },
    mcp: {
      server: "shiprocket",
      toolName: "get_rates",
      inputSchema: {
        type: "object",
        properties: {
          pickupPincode: { type: "string" },
          deliveryPincode: { type: "string" },
          weight: { type: "number" },
        },
        required: ["pickupPincode", "deliveryPincode", "weight"],
      },
      requiredEnvVars: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD"],
      modes: ["live", "simulated"],
      latencyMs: 1500,
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 8,
  },
  {
    id: "mcp:shiprocket:cancel_shipment",
    title: "Cancel Shipment (Shiprocket)",
    description:
      "Cancel an existing shipment by AWB number. Updates the shipment status to 'cancelled' both on the carrier side (via Shiprocket API) and in the local database. If API is unavailable, still updates local DB as db-fallback.",
    category: "mcp_tool",
    subCategory: "shipping",
    tags: ["cancel", "shipment", "awb", "refund", "void"],
    metadata: { integration: "shiprocket" },
    mcp: {
      server: "shiprocket",
      toolName: "cancel_shipment",
      inputSchema: {
        type: "object",
        properties: { awb: { type: "string" } },
        required: ["awb"],
      },
      requiredEnvVars: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD"],
      modes: ["live", "db-fallback"],
      latencyMs: 1000,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 7,
  },

  // ══════════════════════════════════════════════
  // TALLY PRIME — ERP / Accounting
  // ══════════════════════════════════════════════
  {
    id: "mcp:tally:sync_inventory",
    title: "Sync Inventory from TallyPrime",
    description:
      "Pull current stock levels from TallyPrime ERP into Lanework database. Syncs SKU, quantity, warehouse location, and reorder points. Falls back to cached DB data when TallyPrime is not reachable on local network. Useful for keeping inventory counts accurate across systems.",
    category: "mcp_tool",
    subCategory: "inventory",
    tags: ["tally", "inventory", "stock", "sync", "erp", "accounting", "sku", "quantity"],
    metadata: { integration: "tally_prime", erpSystem: "TallyPrime" },
    mcp: {
      server: "tally",
      toolName: "sync_inventory",
      inputSchema: { type: "object", properties: {}, required: [] },
      requiredEnvVars: ["TALLY_HOST", "TALLY_PORT"],
      modes: ["live", "db-fallback"],
      latencyMs: 3000,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "mcp:tally:check_stock",
    title: "Check Stock Level (TallyPrime)",
    description:
      "Quick stock check for a specific SKU from TallyPrime. Returns current quantity, reorder point, and whether reorder is needed. Includes reorder recommendation based on stock level vs reorder threshold.",
    category: "mcp_tool",
    subCategory: "inventory",
    tags: ["stock", "check", "sku", "quantity", "reorder", "tally", "inventory", "level"],
    metadata: { integration: "tally_prime" },
    mcp: {
      server: "tally",
      toolName: "check_stock",
      inputSchema: {
        type: "object",
        properties: { sku: { type: "string" } },
        required: ["sku"],
      },
      requiredEnvVars: ["TALLY_HOST", "TALLY_PORT"],
      modes: ["live", "db-fallback"],
      latencyMs: 800,
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 7,
  },

  // ══════════════════════════════════════════════
  // E-WAY BILL — GST Compliance
  // ══════════════════════════════════════════════
  {
    id: "mcp:ewaybill:generate",
    title: "Generate E-Way Bill",
    description:
      "Generate an e-way bill for goods transport as required by Indian GST law. Requires seller/buyer GSTIN, pincodes, invoice details, HSN code, and product info. E-way bills are mandatory for goods valued above ₹50,000 being transported across state lines in India.",
    category: "mcp_tool",
    subCategory: "compliance",
    tags: ["eway", "ewaybill", "e-way", "gst", "gstin", "invoice", "compliance", "india", "tax", "transport", "goods"],
    metadata: {
      integration: "gstn_eway_bill",
      legalRequirement: "Mandatory for goods > ₹50,000 inter-state",
      requiredFields: ["fromGstin", "toGstin", "invoiceNo", "invoiceValue", "hsnCode", "productName", "quantity"],
    },
    mcp: {
      server: "ewaybill",
      toolName: "generate_ewaybill",
      inputSchema: {
        type: "object",
        properties: {
          shipmentId: { type: "string" },
          fromGstin: { type: "string" },
          toGstin: { type: "string" },
          invoiceNo: { type: "string" },
          invoiceValue: { type: "number" },
          hsnCode: { type: "string" },
          productName: { type: "string" },
          quantity: { type: "number" },
        },
        required: ["shipmentId", "fromGstin", "toGstin", "invoiceNo", "invoiceValue", "hsnCode", "productName", "quantity"],
      },
      requiredEnvVars: ["EWAYBILL_API_KEY"],
      modes: ["live", "simulated"],
      latencyMs: 2000,
    },
    planTier: "growth",
    updatedAt: "2026-08-22",
    weight: 8,
  },
  {
    id: "mcp:ewaybill:validate_gstin",
    title: "Validate GSTIN Number",
    description:
      "Validate a 15-digit Indian GSTIN (Goods and Services Tax Identification Number). Returns validity status, legal name, trade name, state code, and registration date. Useful for verifying business partners before generating e-way bills.",
    category: "mcp_tool",
    subCategory: "compliance",
    tags: ["gstin", "validate", "gst", "tax", "business", "verify", "india", "registration"],
    metadata: { integration: "gstn_eway_bill", gstinFormat: "2 digit state code + 10 char PAN + 1 digit entity + Z + 1 check digit" },
    mcp: {
      server: "ewaybill",
      toolName: "validate_gstin",
      inputSchema: {
        type: "object",
        properties: { gstin: { type: "string" } },
        required: ["gstin"],
      },
      requiredEnvVars: ["EWAYBILL_API_KEY"],
      modes: ["live", "simulated"],
      latencyMs: 800,
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 6,
  },

  // ══════════════════════════════════════════════
  // MAPMYINDIA — Geocoding & Route Optimization
  // ══════════════════════════════════════════════
  {
    id: "mcp:mapmyindia:geocode",
    title: "Geocode Indian Address",
    description:
      "Convert an Indian address or place name to latitude/longitude coordinates using MapmyIndia (CE Solutions) API. Optimized for Indian addresses including pincodes, localities, and regional language names. Used internally for route optimization and delivery tracking.",
    category: "mcp_tool",
    subCategory: "routes",
    tags: ["geocode", "address", "coordinates", "latitude", "longitude", "map", "location", "pincode", "india"],
    metadata: { integration: "mapmyindia", provider: "MapmyIndia/CE Solutions" },
    mcp: {
      server: "mapmyindia",
      toolName: "geocode",
      inputSchema: {
        type: "object",
        properties: { address: { type: "string" } },
        required: ["address"],
      },
      requiredEnvVars: ["MAPMYINDIA_API_KEY"],
      modes: ["live", "simulated"],
      latencyMs: 500,
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 6,
  },
  {
    id: "mcp:mapmyindia:optimize_route",
    title: "Optimize Delivery Route",
    description:
      "Optimize a multi-stop delivery route considering Indian road conditions, traffic, and tolls. Takes an array of waypoints and returns the optimal order, ETAs between stops, total distance, and fuel cost estimates. Supports optimization for time or distance.",
    category: "mcp_tool",
    subCategory: "routes",
    tags: ["route", "optimize", "delivery", "multi-stop", "eta", "distance", "navigation", "drive", "transport"],
    metadata: {
      integration: "mapmyindia",
      optimizationModes: ["time", "distance"],
      maxWaypoints: 25,
    },
    mcp: {
      server: "mapmyindia",
      toolName: "optimize_route",
      inputSchema: {
        type: "object",
        properties: {
          waypoints: { type: "array", items: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" }, label: { type: "string" } } } },
          optimizeFor: { type: "string", enum: ["time", "distance"] },
          vehicleType: { type: "string" },
        },
        required: ["waypoints"],
      },
      requiredEnvVars: ["MAPMYINDIA_API_KEY"],
      modes: ["live", "simulated"],
      latencyMs: 1500,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 8,
  },

  // ══════════════════════════════════════════════
  // FLEET — Vehicle Tracking & Management
  // ══════════════════════════════════════════════
  {
    id: "mcp:fleet:track_vehicle",
    title: "Track Vehicle GPS",
    description:
      "Get real-time GPS position, speed, heading, and fuel level for a specific vehicle. Uses Loconav/FleetX telematics or falls back to database records. Includes last-seen timestamp and alerts for overspeeding or geofence violations.",
    category: "mcp_tool",
    subCategory: "fleet",
    tags: ["vehicle", "track", "gps", "location", "speed", "fuel", "fleet", "truck", "van", "live", "real-time"],
    metadata: { integration: "loconav", gpsProviders: ["Loconav", "FleetX"] },
    mcp: {
      server: "fleet",
      toolName: "track_vehicle",
      inputSchema: {
        type: "object",
        properties: { vehicleId: { type: "string" } },
        required: ["vehicleId"],
      },
      requiredEnvVars: ["LOCONAV_API_KEY"],
      modes: ["live", "db-fallback"],
      latencyMs: 1000,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 8,
  },
  {
    id: "mcp:fleet:get_fleet_status",
    title: "Fleet Status Overview",
    description:
      "Get a summary of all vehicles in the fleet: status (moving/idle/maintenance), current location, alerts, and driver assignments. Useful for fleet managers to get a bird's eye view of operations.",
    category: "mcp_tool",
    subCategory: "fleet",
    tags: ["fleet", "status", "overview", "vehicles", "summary", "dashboard", "manager"],
    metadata: { integration: "loconav" },
    mcp: {
      server: "fleet",
      toolName: "get_fleet_status",
      inputSchema: { type: "object", properties: {}, required: [] },
      requiredEnvVars: ["LOCONAV_API_KEY"],
      modes: ["live", "db-fallback"],
      latencyMs: 1200,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 7,
  },

  // ══════════════════════════════════════════════
  // FEDEX / DHL — International Shipping
  // ══════════════════════════════════════════════
  {
    id: "mcp:fedex:track_international",
    title: "Track International Shipment (FedEx/DHL)",
    description:
      "Track FedEx and DHL Express international shipments. Returns origin, destination, current status, transit history, and estimated delivery. Supports both FedEx and DHL tracking numbers.",
    category: "mcp_tool",
    subCategory: "tracking",
    tags: ["fedex", "dhl", "international", "track", "export", "import", "global", "shipment"],
    metadata: { integration: "fedex", carriers: ["FedEx", "DHL Express"] },
    mcp: {
      server: "fedex",
      toolName: "track_fedex",
      inputSchema: {
        type: "object",
        properties: { trackingNumber: { type: "string" } },
        required: ["trackingNumber"],
      },
      requiredEnvVars: ["FEDEX_API_KEY", "FEDEX_SECRET_KEY"],
      modes: ["live", "simulated"],
      latencyMs: 1500,
    },
    planTier: "growth",
    updatedAt: "2026-08-22",
    weight: 7,
  },

  // ══════════════════════════════════════════════
  // SHOPIFY / WOOCOMMERCE — E-commerce
  // ══════════════════════════════════════════════
  {
    id: "mcp:shopify:sync_orders",
    title: "Sync Orders from Shopify",
    description:
      "Pull recent orders from Shopify store into Lanework. Creates shipment records, customer records, and order items. Supports incremental sync to avoid duplicates. Useful for e-commerce businesses using Shopify.",
    category: "mcp_tool",
    subCategory: "ecommerce",
    tags: ["shopify", "orders", "sync", "ecommerce", "store", "online", "shop", "ecom"],
    metadata: { integration: "shopify", platform: "Shopify" },
    mcp: {
      server: "shopify",
      toolName: "sync_orders",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "number" } },
        required: [],
      },
      requiredEnvVars: ["SHOPIFY_STORE_URL", "SHOPIFY_ACCESS_TOKEN"],
      modes: ["live", "simulated"],
      latencyMs: 2000,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "mcp:shopify:sync_orders_woo",
    title: "Sync Orders from WooCommerce",
    description:
      "Pull recent orders from WooCommerce store into Lanework. Similar to Shopify sync but uses WooCommerce REST API. Creates shipment, customer, and order records.",
    category: "mcp_tool",
    subCategory: "ecommerce",
    tags: ["woocommerce", "wordpress", "orders", "sync", "ecommerce", "store", "woo"],
    metadata: { integration: "woocommerce", platform: "WooCommerce/WordPress" },
    mcp: {
      server: "shopify",
      toolName: "sync_orders_woo",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "number" } },
        required: [],
      },
      requiredEnvVars: ["WOOCOMMERCE_URL", "WOOCOMMERCE_KEY", "WOOCOMMERCE_SECRET"],
      modes: ["live", "simulated"],
      latencyMs: 2000,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 6,
  },

  // ══════════════════════════════════════════════
  // GOOGLE SHEETS — Data Sync
  // ══════════════════════════════════════════════
  {
    id: "mcp:googlesheets:read_sheet",
    title: "Read Google Sheet",
    description:
      "Read data from a Google Sheet range. Useful for importing inventory lists, customer databases, or order data that MSMEs keep in spreadsheets. Supports named ranges and cell references.",
    category: "mcp_tool",
    subCategory: "inventory",
    tags: ["google", "sheet", "spreadsheet", "read", "import", "data", "excel", "csv"],
    metadata: { integration: "google_sheets" },
    mcp: {
      server: "googlesheets",
      toolName: "read_sheet",
      inputSchema: {
        type: "object",
        properties: {
          sheetName: { type: "string" },
          range: { type: "string" },
        },
        required: ["sheetName"],
      },
      requiredEnvVars: ["GOOGLE_SHEETS_API_KEY", "GOOGLE_SHEET_ID"],
      modes: ["live", "simulated"],
      latencyMs: 1000,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 6,
  },
  {
    id: "mcp:googlesheets:sync_to_db",
    title: "Sync Google Sheet to Database",
    description:
      "Pull data from a Google Sheet directly into the Lanework Postgres database. Maps columns to entity fields for shipments, inventory, or orders. Automatically handles deduplication by external ID.",
    category: "mcp_tool",
    subCategory: "inventory",
    tags: ["google", "sheet", "sync", "database", "import", "shipments", "inventory", "orders"],
    metadata: { integration: "google_sheets", entityTypes: ["shipments", "inventory", "orders"] },
    mcp: {
      server: "googlesheets",
      toolName: "sync_to_db",
      inputSchema: {
        type: "object",
        properties: {
          sheetName: { type: "string" },
          entityType: { type: "string", enum: ["shipments", "inventory", "orders"] },
          range: { type: "string" },
        },
        required: ["sheetName", "entityType"],
      },
      requiredEnvVars: ["GOOGLE_SHEETS_API_KEY", "GOOGLE_SHEET_ID"],
      modes: ["live", "simulated"],
      latencyMs: 3000,
    },
    planTier: "growth",
    updatedAt: "2026-08-22",
    weight: 6,
  },

  // ══════════════════════════════════════════════
  // ERP (SAP B1) — Enterprise Resource Planning
  // ══════════════════════════════════════════════
  {
    id: "mcp:erp:sync_orders",
    title: "Sync Orders from SAP B1",
    description:
      "Pull sales orders from SAP Business One into Lanework shipments. Creates corresponding shipment records with customer details, items, and delivery addresses. Useful for larger MSMEs using SAP.",
    category: "mcp_tool",
    subCategory: "erp",
    tags: ["sap", "erp", "orders", "sync", "business", "enterprise", "b1", "sales"],
    metadata: { integration: "sap_b1", erpSystem: "SAP Business One" },
    mcp: {
      server: "erp",
      toolName: "sync_orders",
      inputSchema: {
        type: "object",
        properties: { dateFrom: { type: "string" } },
        required: [],
      },
      requiredEnvVars: ["SAP_B1_URL", "SAP_B1_USER", "SAP_B1_PASSWORD"],
      modes: ["live", "simulated"],
      latencyMs: 3000,
    },
    planTier: "enterprise",
    updatedAt: "2026-08-22",
    weight: 5,
  },

  // ══════════════════════════════════════════════
  // COMPLIANCE — RTO / Parivahan
  // ══════════════════════════════════════════════
  {
    id: "mcp:compliance:check_driver_license",
    title: "Verify Driver License (Parivahan)",
    description:
      "Verify an Indian driver's license number against the Parivahan/RTO database. Returns validity status, license class, expiry date, and any restrictions. Important for fleet compliance — expired licenses can result in fines.",
    category: "mcp_tool",
    subCategory: "compliance",
    tags: ["driver", "license", "verify", "rto", "parivahan", "compliance", "dl", "valid"],
    metadata: { integration: "compliance", database: "Parivahan/RTO" },
    mcp: {
      server: "compliance",
      toolName: "check_driver_license",
      inputSchema: {
        type: "object",
        properties: { licenseNumber: { type: "string" } },
        required: ["licenseNumber"],
      },
      requiredEnvVars: ["PARIVAHAN_API_KEY"],
      modes: ["live", "simulated"],
      latencyMs: 1000,
    },
    planTier: "growth",
    updatedAt: "2026-08-22",
    weight: 6,
  },
  {
    id: "mcp:compliance:check_vehicle_registration",
    title: "Verify Vehicle RC (Parivahan)",
    description:
      "Check vehicle RC (Registration Certificate), insurance validity, fitness certificate, and PUC (Pollution Under Control) status via Parivahan. Returns complete compliance status for a vehicle registration number.",
    category: "mcp_tool",
    subCategory: "compliance",
    tags: ["vehicle", "rc", "registration", "insurance", "fitness", "puc", "compliance", "verify"],
    metadata: { integration: "compliance", checks: ["RC", "insurance", "fitness", "PUC"] },
    mcp: {
      server: "compliance",
      toolName: "check_vehicle_registration",
      inputSchema: {
        type: "object",
        properties: { registrationNumber: { type: "string" } },
        required: ["registrationNumber"],
      },
      requiredEnvVars: ["PARIVAHAN_API_KEY"],
      modes: ["live", "simulated"],
      latencyMs: 1000,
    },
    planTier: "growth",
    updatedAt: "2026-08-22",
    weight: 6,
  },

  // ══════════════════════════════════════════════
  // EMAIL — Communication
  // ══════════════════════════════════════════════
  {
    id: "mcp:email:send_tracking_update",
    title: "Send Tracking Update Email",
    description:
      "Send an automated shipment tracking update email to a customer. Includes current status, location, and estimated delivery. Templates are pre-built with Lanework branding.",
    category: "mcp_tool",
    subCategory: "communication",
    tags: ["email", "tracking", "notification", "customer", "update", "send", "template"],
    metadata: { integration: "email" },
    mcp: {
      server: "email",
      toolName: "send_tracking_update",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string" },
          customerName: { type: "string" },
          trackingNumber: { type: "string" },
          status: { type: "string" },
          location: { type: "string" },
          estimatedDelivery: { type: "string" },
        },
        required: ["to", "customerName", "trackingNumber", "status"],
      },
      requiredEnvVars: ["RESEND_API_KEY"],
      modes: ["live", "simulated"],
      latencyMs: 500,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 5,
  },

  // ══════════════════════════════════════════════
  // WEATHER — Logistics Risk Assessment
  // ══════════════════════════════════════════════
  {
    id: "mcp:weather:current_weather",
    title: "Current Weather with Logistics Risk",
    description:
      "Get current weather at a location with logistics risk assessment. Returns temperature, conditions, wind, rain, and a risk score (low/medium/high) for delivery operations. Factors in Indian monsoon patterns, heatwaves, and cyclone seasons.",
    category: "mcp_tool",
    subCategory: "weather",
    tags: ["weather", "temperature", "rain", "risk", "delivery", "logistics", "monsoon", "cyclone", "heatwave"],
    metadata: { integration: "weather", riskFactors: ["heavy rain", "cyclone", "heatwave", "fog", "flooding"] },
    mcp: {
      server: "weather",
      toolName: "current_weather",
      inputSchema: {
        type: "object",
        properties: { lat: { type: "number" }, lng: { type: "number" } },
        required: ["lat", "lng"],
      },
      requiredEnvVars: ["OPENWEATHER_API_KEY"],
      modes: ["live", "simulated"],
      latencyMs: 500,
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 6,
  },

  // ══════════════════════════════════════════════
  // WMS — Warehouse Management
  // ══════════════════════════════════════════════
  {
    id: "mcp:wms:check_inventory",
    title: "Check Warehouse Inventory",
    description:
      "Real-time inventory check across warehouses, zones, or categories. Returns current stock levels, reserved quantities, and available quantities. Supports low-stock filtering.",
    category: "mcp_tool",
    subCategory: "warehouse",
    tags: ["warehouse", "inventory", "stock", "check", "zone", "category", "wms"],
    metadata: { integration: "wms" },
    mcp: {
      server: "wms",
      toolName: "check_inventory",
      inputSchema: {
        type: "object",
        properties: {
          warehouseId: { type: "string" },
          zone: { type: "string" },
          category: { type: "string" },
          lowStock: { type: "boolean" },
        },
        required: [],
      },
      requiredEnvVars: [],
      modes: ["live", "db-fallback"],
      latencyMs: 500,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 7,
  },

  // ══════════════════════════════════════════════
  // SCANNER — Barcode Scanning
  // ══════════════════════════════════════════════
  {
    id: "mcp:scanner:verify_pick",
    title: "Verify Pick by Barcode Scan",
    description:
      "Scan a barcode to verify a pick list item during warehouse picking. Compares scanned SKU and quantity against the expected order. Returns match/mismatch with location verification.",
    category: "mcp_tool",
    subCategory: "scanning",
    tags: ["barcode", "scan", "pick", "verify", "warehouse", "sku", "qr"],
    metadata: { integration: "scanner" },
    mcp: {
      server: "scanner",
      toolName: "verify_pick",
      inputSchema: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          scannedSku: { type: "string" },
          scannedQty: { type: "number" },
          location: { type: "string" },
          scannedBy: { type: "string" },
        },
        required: ["orderId", "scannedSku", "scannedQty", "location", "scannedBy"],
      },
      requiredEnvVars: [],
      modes: ["live"],
      latencyMs: 200,
    },
    planTier: "growth",
    updatedAt: "2026-08-22",
    weight: 5,
  },

  // ══════════════════════════════════════════════
  // DOCK SCHEDULER — Dock Management
  // ══════════════════════════════════════════════
  {
    id: "mcp:dockscheduler:book_dock",
    title: "Book Dock Slot",
    description:
      "Book a dock slot for incoming or outgoing trailer at a warehouse. Supports priority levels (normal/high/express) and auto-assigns the next available dock. Useful for managing warehouse loading/unloading schedules.",
    category: "mcp_tool",
    subCategory: "docking",
    tags: ["dock", "book", "slot", "warehouse", "loading", "unloading", "trailer", "schedule"],
    metadata: { integration: "dockscheduler", priorities: ["normal", "high", "express"] },
    mcp: {
      server: "dockscheduler",
      toolName: "book_dock",
      inputSchema: {
        type: "object",
        properties: {
          warehouseId: { type: "string" },
          dockId: { type: "string" },
          carrierName: { type: "string" },
          vehicleReg: { type: "string" },
          bookingType: { type: "string", enum: ["inbound", "outbound"] },
          requestedTime: { type: "string" },
          durationMin: { type: "number" },
          priority: { type: "string", enum: ["normal", "high", "express"] },
        },
        required: ["warehouseId", "dockId", "carrierName", "vehicleReg", "bookingType", "requestedTime"],
      },
      requiredEnvVars: [],
      modes: ["live", "db-fallback"],
      latencyMs: 300,
    },
    planTier: "growth",
    updatedAt: "2026-08-22",
    weight: 5,
  },
];
