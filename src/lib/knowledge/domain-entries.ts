/**
 * Domain Concept Knowledge Entries
 *
 * Knowledge about Lanework's domain entities, business rules,
 * pricing, RBAC, workflows, and API routes.
 */

import type { KBEntry } from "./types";

export const DOMAIN_ENTRIES: KBEntry[] = [
  // ══════════════════════════════════════════════
  // DOMAIN ENTITIES
  // ══════════════════════════════════════════════
  {
    id: "domain:shipment",
    title: "Shipment Entity",
    description:
      "A Shipment in Lanework represents a package being delivered. It has a tracking number (AWB), carrier, status (pending/picked_up/in_transit/out_for_delivery/delivered/cancelled/rto), origin and destination (stored as JSON with address), customer details (name, phone, email), weight, declared value, estimated delivery, and ETA drift tracking. Shipments are created manually, from e-commerce sync (Shopify/WooCommerce), or from ERP sync (SAP/Tally). The shipment_poller checks status every 5 minutes for stuck shipments.",
    category: "domain_entity",
    subCategory: "tracking",
    tags: ["shipment", "package", "delivery", "tracking", "awb", "carrier", "status"],
    metadata: {
      tableName: "shipments",
      statuses: ["pending", "picked_up", "in_transit", "out_for_delivery", "delivered", "cancelled", "rto_initiated", "rto_delivered"],
      fields: ["tracking_number", "carrier", "status", "origin", "destination", "customer_name", "customer_phone", "weight_kg", "estimated_delivery"],
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "DeliveryEvent",
      name: "Shipment",
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 10,
  },
  {
    id: "domain:inventory",
    title: "Inventory Item Entity",
    description:
      "InventoryItem represents a stock-keeping unit (SKU) in a warehouse. Tracks quantity_on_hand, quantity_reserved, quantity_available, reorder_point, reorder_quantity, unit_cost, batch number, expiry date, and supplier. Supports multiple warehouses with warehouse+SKU unique constraint. Inventory movements are logged separately in InventoryMovement table with adjustment types (inbound/outbound/adjustment/transfer).",
    category: "domain_entity",
    subCategory: "inventory",
    tags: ["inventory", "stock", "sku", "warehouse", "quantity", "reorder", "batch"],
    metadata: {
      tableName: "inventory_items",
      movementTable: "inventory_movements",
      adjustmentTypes: ["inbound", "outbound", "adjustment", "transfer"],
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Inventory Item",
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 9,
  },
  {
    id: "domain:vehicle",
    title: "Vehicle Entity",
    description:
      "Vehicle represents a fleet vehicle. Has license plate (unique), vehicle type, status (active/inactive/maintenance), capacity (cubic feet and weight kg), fuel type, odometer reading, GPS coordinates (last_lat/lng), and last_seen_at timestamp. Used by the fleet poller for real-time tracking and the compliance poller for RC/insurance verification.",
    category: "domain_entity",
    subCategory: "fleet",
    tags: ["vehicle", "truck", "van", "fleet", "gps", "tracking", "capacity"],
    metadata: {
      tableName: "vehicles",
      statuses: ["active", "inactive", "maintenance"],
      fields: ["license_plate", "vehicle_type", "capacity_weight_kg", "last_lat", "last_lng"],
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "domain:route",
    title: "Route Entity",
    description:
      "Route represents an optimized delivery route. Contains stops (RouteStop table) with sequence, location, time windows, estimated/actual arrival/departure, assigned shipments, and status. Routes are created by the MapmyIndia route optimizer and tracked by the fleet poller. Includes metrics like total distance, duration, stops count, and optimization score.",
    category: "domain_entity",
    subCategory: "routes",
    tags: ["route", "delivery", "stops", "optimization", "waypoint", "eta"],
    metadata: {
      tableName: "routes",
      stopTable: "route_stops",
      statuses: ["pending", "active", "in_progress", "completed"],
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "domain:warehouse",
    title: "Warehouse Entity",
    description:
      "Warehouse represents a storage location. Has name, code, address (JSON), status, config, and links to routes and inventory items. Supports multiple warehouses per organization with name uniqueness. The WMS MCP server manages dock schedules, pick tasks, and receiving within warehouses.",
    category: "domain_entity",
    subCategory: "warehouse",
    tags: ["warehouse", "storage", "dock", "pick", "receive", "location"],
    metadata: {
      tableName: "warehouses",
      relatedTables: ["inventory_items", "routes", "docks", "dock_bookings"],
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 6,
  },
  {
    id: "domain:customer",
    title: "Customer Entity",
    description:
      "Customer represents a business contact or end customer. Has name, email, phone, WhatsApp phone, address, account number, status, and tags. Used for shipping labels, notifications, and CRM. Customers can be created manually or synced from e-commerce platforms.",
    category: "domain_entity",
    subCategory: "general",
    tags: ["customer", "contact", "client", "crm", "whatsapp", "phone", "email"],
    metadata: { tableName: "customers", tags: ["vip", "wholesale", "retail", "cod_only"] },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 6,
  },

  // ══════════════════════════════════════════════
  // BUSINESS RULES
  // ══════════════════════════════════════════════
  {
    id: "rule:pricing_plans",
    title: "Pricing Plans & Limits",
    description:
      "Lanework has 4 pricing tiers for Indian MSMEs. FREE: ₹0/mo — 10 AI chats/day, 20 shipments/mo, 1 user, community support. STARTER: ₹499/mo (₹399/mo yearly) — 100 AI chats/day, 500 shipments/mo, 5 users, email support, all integrations. GROWTH: ₹1,999/mo (₹1,599/mo yearly) — unlimited AI chats, unlimited shipments, 25 users, priority support, webhooks, API access. ENTERPRISE: ₹4,999/mo (₹3,999/mo yearly) — everything in Growth + unlimited users, dedicated support, custom integrations, SLA.",
    category: "business_rule",
    subCategory: "billing",
    tags: ["pricing", "plan", "subscription", "cost", "limits", "free", "starter", "growth", "enterprise", "indian", "rupees", "inr"],
    metadata: {
      plans: {
        free: { price: 0, chatsPerDay: 10, shipmentsPerMonth: 20, users: 1 },
        starter: { price: 499, yearlyPrice: 399, chatsPerDay: 100, shipmentsPerMonth: 500, users: 5 },
        growth: { price: 1999, yearlyPrice: 1599, chatsPerDay: -1, shipmentsPerMonth: -1, users: 25 },
        enterprise: { price: 4999, yearlyPrice: 3999, chatsPerDay: -1, shipmentsPerMonth: -1, users: -1 },
      },
      currency: "INR",
      trialDays: 14,
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 9,
  },
  {
    id: "rule:rbac",
    title: "Role-Based Access Control (RBAC)",
    description:
      "Lanework supports 4 roles with hierarchical permissions. SUPER_ADMIN: full access including billing, org settings, member management. ADMIN: operational access — manage shipments, inventory, fleet, routes, warehouse, integrations. MEMBER: day-to-day operations — view and edit shipments, inventory, warehouse. VIEWER: read-only access to dashboards and reports. Roles are assigned per organization member. Super admins can have multiple per org.",
    category: "business_rule",
    subCategory: "auth",
    tags: ["rbac", "roles", "permissions", "access", "admin", "super_admin", "member", "viewer", "security"],
    metadata: {
      roles: {
        super_admin: { level: 4, permissions: ["*"] },
        admin: { level: 3, permissions: ["shipments:*", "inventory:*", "fleet:*", "routes:*", "warehouse:*", "integrations:*", "team:view"] },
        member: { level: 2, permissions: ["shipments:view", "shipments:edit", "inventory:view", "inventory:edit", "warehouse:view", "warehouse:edit"] },
        viewer: { level: 1, permissions: ["dashboard:view", "reports:view"] },
      },
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 8,
  },
  {
    id: "rule:agent_trust",
    title: "AI Agent Trust Levels",
    description:
      "Each AI agent has a configurable trust level that determines how much autonomy it has. PROPOSE_ONLY: agent suggests actions, human approves everything. AUTO_LOW: agent auto-executes low-risk actions (<₹100 value), proposes higher. AUTO_MEDIUM: agent auto-executes medium-risk (<₹1000), proposes higher. AUTO_FULL: agent auto-executes all actions, human reviews audit trail. Trust levels are per-agent per-organization and adjustable via the /agents/trust UI.",
    category: "business_rule",
    subCategory: "ai_agents",
    tags: ["trust", "agent", "autonomy", "approval", "risk", "propose", "auto", "safety"],
    metadata: {
      levels: ["propose_only", "auto_low", "auto_medium", "auto_full"],
      riskFactors: ["action_type", "monetary_value", "reversibility", "historical_accuracy"],
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 8,
  },
  {
    id: "rule:plan_recommendation",
    title: "Plan Recommendation by Company Size",
    description:
      "Lanework recommends pricing plans based on company size during onboarding. Solo (1 person): FREE plan. 2-10 employees: STARTER plan. 11-30 employees: GROWTH plan. 31-50 employees: GROWTH plan. 51-100 employees: ENTERPRISE plan. 100+ employees: ENTERPRISE plan. Recommendations are suggestions — users can override.",
    category: "business_rule",
    subCategory: "billing",
    tags: ["plan", "recommend", "company", "size", "team", "onboarding", "solo", "enterprise"],
    metadata: {
      companySizes: ["solo", "2-10", "11-30", "31-50", "51-100", "100+"],
      recommendations: {
        solo: "free",
        "2-10": "starter",
        "11-30": "growth",
        "31-50": "growth",
        "51-100": "enterprise",
        "100+": "enterprise",
      },
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "rule:rate_limiting",
    title: "Rate Limiting Policy",
    description:
      "Lanework applies per-route rate limits to prevent abuse. AI chat: 10 requests/min per user. Integration API calls: 30 requests/min per user. General API: 60 requests/min per user. Chat-triggered MCP calls inherit the /api/ai rate limit ceiling. Rate limits are tracked in-memory with sliding window counters.",
    category: "business_rule",
    subCategory: "auth",
    tags: ["rate", "limit", "throttle", "abuse", "api", "protection"],
    metadata: {
      limits: {
        ai_chat: { rpm: 10, perUser: true },
        integrations: { rpm: 30, perUser: true },
        general: { rpm: 60, perUser: true },
      },
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 6,
  },

  // ══════════════════════════════════════════════
  // WORKFLOWS
  // ══════════════════════════════════════════════
  {
    id: "workflow:delay_alert",
    title: "Shipment Delay Alert Workflow",
    description:
      "Autonomous workflow triggered when a shipment is delayed. Steps: 1) Poller detects ETA drift > 30 minutes. 2) Agent checks weather along route via Weather MCP. 3) If weather is the cause, generates a weather-delay notification. 4) If not weather-related, checks if re-routing is possible via MapmyIndia MCP. 5) Sends WhatsApp/email notification to customer with updated ETA. 6) Creates approval request if re-routing involves additional cost.",
    category: "workflow",
    subCategory: "tracking",
    tags: ["delay", "alert", "workflow", "eta", "weather", "reroute", "notification"],
    metadata: {
      trigger: "shipment.eta_drift > 30min",
      steps: 6,
      mcpsUsed: ["weather", "mapmyindia", "email"],
      approvalRequired: true,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "workflow:auto_reorder",
    title: "Auto-Reorder Workflow",
    description:
      "Autonomous workflow triggered when inventory drops below reorder point. Steps: 1) Inventory poller detects SKU below reorder_point. 2) Agent calculates optimal reorder quantity based on historical demand and lead time. 3) Generates purchase order draft. 4) If Growth/Enterprise plan, auto-creates PO. 5) If Starter plan, creates approval request. 6) Notifies warehouse manager via email.",
    category: "workflow",
    subCategory: "inventory",
    tags: ["reorder", "auto", "inventory", "stock", "purchase", "supply"],
    metadata: {
      trigger: "inventory.quantity_on_hand < inventory.reorder_point",
      steps: 6,
      mcpsUsed: ["tally"],
      approvalRequired: true,
    },
    planTier: "growth",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "workflow:daily_report",
    title: "Daily Operations Report Workflow",
    description:
      "Scheduled daily report workflow (runs at 8:00 AM IST). Steps: 1) Collects shipment stats (created, delivered, in_transit, RTO). 2) Collects inventory alerts (low stock, expiring soon). 3) Collects fleet status (active, maintenance needed). 4) Collects compliance alerts (expired licenses, RC, insurance). 5) Generates summary with actionable items. 6) Sends email report to org admins.",
    category: "workflow",
    subCategory: "general",
    tags: ["daily", "report", "summary", "email", "morning", "operations", "scheduled"],
    metadata: {
      trigger: "cron: 0 8 * * * (8AM IST)",
      steps: 6,
      mcpsUsed: ["email"],
      requiresApproval: false,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 6,
  },

  // ══════════════════════════════════════════════
  // API ROUTES (CRITICAL ONES)
  // ══════════════════════════════════════════════
  {
    id: "api:chat",
    title: "POST /api/chat — AI Chat",
    description:
      "Main AI chat endpoint. Receives a user message, detects intent via regex patterns, routes to the appropriate MCP tool, generates a reply, and records tool calls. Returns structured response with reply text, tool call history, detected intent, and mode indicators (live/simulated/db-fallback). Protected by AI rate limit (10/min).",
    category: "api_endpoint",
    subCategory: "ai_agents",
    tags: ["chat", "api", "ai", "message", "intent", "mcp"],
    api: {
      method: "POST",
      path: "/api/chat",
      authRequired: true,
      rateLimit: 10,
    },
    metadata: {},
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 9,
  },
  {
    id: "api:auth_login",
    title: "POST /api/auth/login — User Login",
    description:
      "JWT-based login endpoint. Validates email/password, creates access token (15min) + refresh token (7 days), records session, logs security event. Returns tokens, user profile, and organization info if member of one.",
    category: "api_endpoint",
    subCategory: "auth",
    tags: ["login", "auth", "jwt", "token", "password", "session"],
    api: {
      method: "POST",
      path: "/api/auth/login",
      authRequired: false,
    },
    metadata: {},
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 8,
  },
  {
    id: "api:auth_register",
    title: "POST /api/auth/register — Register + Org Creation",
    description:
      "Two-step registration: 1) Create user account with email/password. 2) Optionally create organization with name, company size, and plan. Passwords are bcrypt-hashed. Creates JWT tokens and returns user + org info. Company size auto-suggests a pricing plan.",
    category: "api_endpoint",
    subCategory: "auth",
    tags: ["register", "signup", "create", "account", "org", "organization"],
    api: {
      method: "POST",
      path: "/api/auth/register",
      authRequired: false,
    },
    metadata: {},
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 8,
  },
  {
    id: "api:org_invite",
    title: "POST /api/org/invite — Invite Team Member",
    description:
      "Send an email invite to join an organization. Creates an invite record with 7-day expiry token. Sends branded email via Resend with join link. Requires ADMIN or SUPER_ADMIN role. Limits: max pending invites = 20.",
    category: "api_endpoint",
    subCategory: "auth",
    tags: ["invite", "team", "member", "email", "join", "organization"],
    api: {
      method: "POST",
      path: "/api/org/invite",
      authRequired: true,
      rateLimit: 10,
    },
    metadata: {},
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "api:webhooks",
    title: "POST /api/webhooks/[provider] — Webhook Receiver",
    description:
      "Receives webhook events from external services (Shiprocket, Shopify, FedEx). Verifies HMAC signatures for security, logs the event, and triggers the appropriate agent event handler. Events include shipment status updates, order creation, and delivery confirmations.",
    category: "api_endpoint",
    subCategory: "tracking",
    tags: ["webhook", "provider", "event", "callback", "notification"],
    api: {
      method: "POST",
      path: "/api/webhooks/[provider]",
      authRequired: false,
      rateLimit: 60,
    },
    metadata: {},
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 7,
  },

  // ══════════════════════════════════════════════
  // INTEGRATION SETUP KNOWLEDGE
  // ══════════════════════════════════════════════
  {
    id: "integration:shiprocket_setup",
    title: "Shiprocket Integration Setup",
    description:
      "To connect Shiprocket for live shipping: 1) Create a Shiprocket account at shiprocket.in (free for Indian businesses). 2) Get API credentials from Settings → API. 3) Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD as Vercel environment variables. 4) Optionally add SHIPROCKET_CHANNEL_ID for multi-channel accounts. Without these env vars, Shiprocket tools work in simulated mode with demo data.",
    category: "integration",
    subCategory: "shipping",
    tags: ["shiprocket", "setup", "configure", "api", "keys", "env", "shipping", "india"],
    metadata: {
      website: "https://shiprocket.in",
      envVars: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD", "SHIPROCKET_CHANNEL_ID"],
      freeTier: true,
      indianBusiness: true,
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "integration:weather_setup",
    title: "Weather API Setup",
    description:
      "Weather integration uses OpenWeatherMap API. 1) Sign up at openweathermap.org (free tier: 1000 calls/day). 2) Get API key from dashboard. 3) Add OPENWEATHER_API_KEY as Vercel environment variable. Without this, weather tools return simulated data. The weather agent provides logistics risk assessment for Indian monsoon, cyclone, and heatwave seasons.",
    category: "integration",
    subCategory: "weather",
    tags: ["weather", "openweathermap", "api", "setup", "configure", "key"],
    metadata: {
      website: "https://openweathermap.org",
      envVars: ["OPENWEATHER_API_KEY"],
      freeTier: true,
      callsPerDay: 1000,
    },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 6,
  },
  {
    id: "integration:mapmyindia_setup",
    title: "MapmyIndia Setup for Route Optimization",
    description:
      "MapmyIndia (CE Solutions) provides geocoding and route optimization for Indian addresses. 1) Register at mapmyindia.com. 2) Get API key from developer portal. 3) Add MAPMYINDIA_API_KEY as Vercel environment variable. Supports Indian pincodes, regional languages, and road-network-optimized routing.",
    category: "integration",
    subCategory: "routes",
    tags: ["mapmyindia", "geocode", "route", "map", "india", "navigation"],
    metadata: {
      website: "https://mapmyindia.com",
      envVars: ["MAPMYINDIA_API_KEY"],
      indianOptimized: true,
    },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 6,
  },

  // ══════════════════════════════════════════════
  // PROCEDURES (HOW-TO)
  // ══════════════════════════════════════════════
  {
    id: "procedure:track_shipment",
    title: "How to Track a Shipment",
    description:
      "To track a shipment in Lanework: 1) Go to the Chat interface and type 'track [AWB number]'. 2) Or navigate to the Shipments page and search by tracking number. 3) The system uses the Shiprocket MCP to fetch real-time status. 4) If Shiprocket API is not configured, it falls back to the database. 5) You can also track from the Dashboard quick actions. Supported carriers: Delhivery, BlueDart, DTDC, Ecom Express, XpressBees, Shadowfax, India Post.",
    category: "procedure",
    subCategory: "tracking",
    tags: ["track", "how-to", "guide", "shipment", "awb", "tracking"],
    metadata: { steps: 5, difficulty: "easy" },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "procedure:setup_integrations",
    title: "How to Set Up Integrations",
    description:
      "To set up external integrations: 1) Navigate to the Integrations page from the sidebar. 2) Choose the integration you want to connect (Shiprocket, Shopify, Tally, etc.). 3) Click 'Configure' and follow the setup wizard. 4) Enter your API credentials. 5) Test the connection. 6) The integration will show as 'Connected' when successful. All tools gracefully degrade to simulated mode when credentials are missing — no hard errors.",
    category: "procedure",
    subCategory: "general",
    tags: ["setup", "how-to", "guide", "integration", "configure", "connect"],
    metadata: { steps: 6, difficulty: "easy" },
    planTier: "free",
    updatedAt: "2026-08-22",
    weight: 7,
  },
  {
    id: "procedure:invite_team",
    title: "How to Invite Team Members",
    description:
      "To invite teammates: 1) Go to Team Management page (/team). 2) Click 'Invite Member'. 3) Enter their email address and select a role (Admin/Member/Viewer). 4) They receive an email with a join link (valid 7 days). 5) They click the link, create an account (or login), and join your organization. 6) As Super Admin, you can change roles or remove members from the team page.",
    category: "procedure",
    subCategory: "auth",
    tags: ["invite", "team", "how-to", "member", "invite", "join"],
    metadata: { steps: 6, difficulty: "easy", inviteExpiry: "7 days" },
    planTier: "starter",
    updatedAt: "2026-08-22",
    weight: 6,
  },
];
