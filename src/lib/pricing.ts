/**
 * Lanework Pricing Model
 *
 * Designed for Indian MSMEs — INR pricing, GST extra, 75%+ gross margin.
 * Plans: Free (forever free tier), Starter (₹999/mo), Growth (₹2,999/mo), Enterprise (₹7,999/mo)
 *
 * AI Cost Reference (Cloudflare Workers AI — Llama 3 8B):
 *   Input:  ~$0.011/M tokens → ~₹0.92/M tokens
 *   Output: ~$0.033/M tokens → ~₹2.75/M tokens
 *   Average conversation: ~2K input + ~1K output tokens = ~₹0.005/conversation (~₹0.5/paisa)
 */

import { neon } from "@neondatabase/serverless";

export type PlanId = "free" | "starter" | "growth" | "enterprise";

export interface PlanFeatures {
  // Core
  chatMessagesPerDay: number;         // -1 = unlimited
  maxUsers: number;
  storageGB: number;

  // Integrations
  maxIntegrations: number;            // -1 = unlimited
  shiprocket: boolean;
  whatsapp: boolean;
  tallyPrime: boolean;
  gstnEwayBill: boolean;
  googleSheets: boolean;
  shopify: boolean;
  fedex: boolean;
  mapmyIndia: boolean;
  fleetTracking: boolean;
  compliance: boolean;
  email: boolean;
  erp: boolean;
  wms: boolean;

  // Features
  csvImport: boolean;
  csvExport: boolean;
  routeOptimization: boolean;
  automatedEwayBill: boolean;
  whatsappNotifications: boolean;
  CODReconciliation: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
  prioritySupport: boolean;
  dedicatedAccountManager: boolean;

  // Limits
  shipmentsPerMonth: number;
  inventoryItems: number;
  vehicles: number;
  drivers: number;
  warehouses: number;
  customers: number;

  // AI
  aiChat: boolean;
  aiReports: boolean;
  voiceInput: boolean;

  // Data retention
  dataRetentionDays: number;
}

export const PLANS: Record<PlanId, {
  id: PlanId;
  name: string;
  nameHi: string;
  priceMonthly: number;
  priceYearly: number;
  priceMonthlyPerUser: number;
  features: PlanFeatures;
  description: string;
  descriptionHi: string;
  recommended?: boolean;
  cta: string;
  badge?: string;
}> = {
  free: {
    id: "free",
    name: "Free",
    nameHi: "मुफ्त ट्रायल",
    priceMonthly: 0,
    priceYearly: 0,
    priceMonthlyPerUser: 0,
    description: "Try Lanework free for 7 days. No credit card needed.",
    descriptionHi: "7 दिन मुफ्त ट्रायल। क्रेडिट कार्ड की जरूरत नहीं।",
    cta: "Start Free",
    features: {
      chatMessagesPerDay: 10,          // ← Reduced from 25
      maxUsers: 1,
      storageGB: 1,
      maxIntegrations: 2,
      shiprocket: true,
      whatsapp: false,
      tallyPrime: false,
      gstnEwayBill: false,
      googleSheets: false,
      shopify: false,
      fedex: false,
      mapmyIndia: false,
      fleetTracking: false,
      compliance: false,
      email: false,
      erp: false,
      wms: false,
      csvImport: true,
      csvExport: true,
      routeOptimization: false,
      automatedEwayBill: false,
      whatsappNotifications: false,
      CODReconciliation: false,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,
      dedicatedAccountManager: false,
      shipmentsPerMonth: 20,           // ← Reduced from 50
      inventoryItems: 50,
      vehicles: 3,
      drivers: 3,
      warehouses: 1,
      customers: 25,
      aiChat: true,
      aiReports: false,
      voiceInput: false,
      dataRetentionDays: 7,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    nameHi: "शुरुआती",
    priceMonthly: 999,
    priceYearly: 9999,
    priceMonthlyPerUser: 199,
    description: "Everything a growing logistics business needs to ship smarter.",
    descriptionHi: "बढ़ते लॉजिस्टिक्स व्यवसाय के लिए सब कुछ।",
    recommended: true,
    badge: "Most Popular",
    cta: "Start at ₹999/mo",
    features: {
      chatMessagesPerDay: 200,
      maxUsers: 3,
      storageGB: 5,
      maxIntegrations: 5,
      shiprocket: true,
      whatsapp: true,
      tallyPrime: true,
      gstnEwayBill: true,
      googleSheets: false,
      shopify: false,
      fedex: false,
      mapmyIndia: true,
      fleetTracking: false,
      compliance: false,
      email: false,
      erp: false,
      wms: false,
      csvImport: true,
      csvExport: true,
      routeOptimization: true,
      automatedEwayBill: false,
      whatsappNotifications: true,
      CODReconciliation: false,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,
      dedicatedAccountManager: false,
      shipmentsPerMonth: 500,
      inventoryItems: 1000,
      vehicles: 25,
      drivers: 25,
      warehouses: 2,
      customers: 500,
      aiChat: true,
      aiReports: true,
      voiceInput: false,
      dataRetentionDays: 90,
    },
  },
  growth: {
    id: "growth",
    name: "Growth",
    nameHi: "ग्रोथ",
    priceMonthly: 2999,
    priceYearly: 29999,
    priceMonthlyPerUser: 299,
    description: "Scale operations with ERP, e-commerce, and compliance automation.",
    descriptionHi: "ERP, ई-कॉमर्स और कंप्लायंस ऑटोमेशन के साथ बढ़ें।",
    cta: "Start at ₹2,999/mo",
    features: {
      chatMessagesPerDay: -1,
      maxUsers: 10,
      storageGB: 25,
      maxIntegrations: -1,
      shiprocket: true,
      whatsapp: true,
      tallyPrime: true,
      gstnEwayBill: true,
      googleSheets: true,
      shopify: true,
      fedex: true,
      mapmyIndia: true,
      fleetTracking: true,
      compliance: true,
      email: true,
      erp: false,
      wms: true,
      csvImport: true,
      csvExport: true,
      routeOptimization: true,
      automatedEwayBill: true,
      whatsappNotifications: true,
      CODReconciliation: true,
      apiAccess: true,
      whiteLabel: false,
      prioritySupport: true,
      dedicatedAccountManager: false,
      shipmentsPerMonth: 5000,
      inventoryItems: 10000,
      vehicles: 100,
      drivers: 100,
      warehouses: 5,
      customers: 5000,
      aiChat: true,
      aiReports: true,
      voiceInput: false,
      dataRetentionDays: 365,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    nameHi: "एंटरप्राइज़",
    priceMonthly: 7999,
    priceYearly: 79999,
    priceMonthlyPerUser: 399,
    description: "Full platform with ERP, custom integrations, and white-label options.",
    descriptionHi: "ERP, कस्टम इंटीग्रेशन और व्हाइट-लेबल के साथ पूरा प्लेटफॉर्म।",
    cta: "Contact Sales",
    badge: "Full Power",
    features: {
      chatMessagesPerDay: -1,
      maxUsers: 50,
      storageGB: 100,
      maxIntegrations: -1,
      shiprocket: true,
      whatsapp: true,
      tallyPrime: true,
      gstnEwayBill: true,
      googleSheets: true,
      shopify: true,
      fedex: true,
      mapmyIndia: true,
      fleetTracking: true,
      compliance: true,
      email: true,
      erp: true,
      wms: true,
      csvImport: true,
      csvExport: true,
      routeOptimization: true,
      automatedEwayBill: true,
      whatsappNotifications: true,
      CODReconciliation: true,
      apiAccess: true,
      whiteLabel: true,
      prioritySupport: true,
      dedicatedAccountManager: true,
      shipmentsPerMonth: -1,
      inventoryItems: -1,
      vehicles: -1,
      drivers: -1,
      warehouses: -1,
      customers: -1,
      aiChat: true,
      aiReports: true,
      voiceInput: true,
      dataRetentionDays: -1,
    },
  },
};

// ── Plan helpers ──

export function getPlanFeatures(plan: PlanId): PlanFeatures {
  return PLANS[plan]?.features || PLANS.free.features;
}

export function hasFeature(plan: PlanId, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan);
  const val = features[feature];
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  return false;
}

export function isWithinLimit(plan: PlanId, metric: keyof PlanFeatures, currentUsage: number): boolean {
  const features = getPlanFeatures(plan);
  const limit = features[metric] as number;
  if (limit === -1) return true;
  return currentUsage < limit;
}

export function getUpgradePlan(currentPlan: PlanId): PlanId | null {
  if (currentPlan === "free") return "starter";
  if (currentPlan === "starter") return "growth";
  if (currentPlan === "growth") return "enterprise";
  return null; // already on highest plan
}

// ── Cost Breakdown (Monthly INR per user) ──
// Includes ALL infrastructure costs: compute, DB, bandwidth, AI, monitoring

export interface CostBreakdown {
  compute: number;      // Vercel serverless functions
  database: number;     // Neon PostgreSQL
  bandwidth: number;    // Vercel bandwidth + CDN
  ai: number;           // Cloudflare Workers AI (Llama 3 8B)
  email: number;        // Resend email delivery
  monitoring: number;   // Sentry error tracking
  total: number;
}

/** Cloudflare Workers AI pricing (Llama 3 8B):
 *  Input tokens:  ~$0.011/M → ₹0.92/M tokens
 *  Output tokens: ~$0.033/M → ₹2.75/M tokens
 *  Avg conversation: ~2K input + ~1K output tokens ≈ ₹0.005 (~0.5 paisa)
 *  Packets/shipments use 0 AI tokens — only MCP API calls
 */

const AI_COST_PER_CHAT = 0.005;  // ₹0.005 per AI chat conversation (~0.5 paisa)

export const INFRA_COST: Record<PlanId, CostBreakdown> = {
  free: {
    compute: 2,
    database: 1,
    bandwidth: 0.5,
    ai: 0.15,         // 10 chats/day × 30 days × ₹0.005 = ₹1.5 → ~₹0.15 amortized (not all days active)
    email: 0,
    monitoring: 0,
    total: 3.65,
  },
  starter: {
    compute: 8,
    database: 5,
    bandwidth: 2,
    ai: 3,            // 200 chats/day × ~15 active days × ₹0.005 = ₹15 → ₹3 amortized
    email: 2,
    monitoring: 1,
    total: 21,
  },
  growth: {
    compute: 20,
    database: 15,
    bandwidth: 5,
    ai: 15,           // unlimited but ~1000 chats/mo avg × ₹0.005 = ₹5 → ₹15 with growth
    email: 5,
    monitoring: 2,
    total: 62,
  },
  enterprise: {
    compute: 60,
    database: 40,
    bandwidth: 15,
    ai: 80,           // ~5000 chats/mo × ₹0.005 = ₹25 → ₹80 with heavy usage
    email: 15,
    monitoring: 5,
    total: 215,
  },
};

/** Calculate gross margin percentage with full cost breakdown */
export function calculateMargin(plan: PlanId, billing: "monthly" | "yearly" = "monthly"): {
  revenue: number;
  cost: number;
  margin: number;
  breakdown: CostBreakdown;
} {
  const p = PLANS[plan];
  const revenue = billing === "monthly" ? p.priceMonthly : Math.round(p.priceYearly / 12);
  const breakdown = INFRA_COST[plan];
  const cost = breakdown.total;
  const margin = revenue === 0 ? 0 : Math.round(((revenue - cost) / revenue) * 100);
  return { revenue, cost, margin, breakdown };
}

// ── Usage Tracking (DB-backed) ──

const sql = neon(process.env.DATABASE_URL!);

/** Get today's chat message count for a user */
export async function getTodayChatCount(userId: string): Promise<number> {
  try {
    const [row] = await sql`
      SELECT COUNT(*) as count FROM chat_messages
      WHERE role = 'user'
        AND thread_id IN (SELECT id FROM chat_threads WHERE user_id = ${userId})
        AND created_at >= date_trunc('day', NOW())
    `;
    return Number(row?.count) || 0;
  } catch {
    return 0;
  }
}

/** Get this month's shipment count for a user */
export async function getThisMonthShipmentCount(userId: string): Promise<number> {
  try {
    const [row] = await sql`
      SELECT COUNT(*) as count FROM shipments
      WHERE created_at >= date_trunc('month', NOW())
    `;
    return Number(row?.count) || 0;
  } catch {
    return 0;
  }
}

/** Get user's plan from DB */
export async function getUserPlan(userId: string): Promise<PlanId> {
  try {
    const [row] = await sql`SELECT plan FROM users WHERE id = ${userId}`;
    const plan = (row?.plan as string) || "free";
    if (plan in PLANS) return plan as PlanId;
    return "free";
  } catch {
    return "free";
  }
}

/** Get full usage stats for a user */
export async function getUserUsage(userId: string): Promise<Record<string, number>> {
  const [chatToday, shipmentsMonth, inventory, vehicles, drivers, customers, warehouses] = await Promise.all([
    getTodayChatCount(userId),
    getThisMonthShipmentCount(userId),
    sql`SELECT COUNT(*) as c FROM inventory WHERE user_id = ${userId}`.then(r => Number(r[0]?.c) || 0),
    sql`SELECT COUNT(*) as c FROM fleet_vehicles WHERE user_id = ${userId}`.then(r => Number(r[0]?.c) || 0),
    sql`SELECT COUNT(*) as c FROM fleet_drivers WHERE user_id = ${userId}`.then(r => Number(r[0]?.c) || 0),
    sql`SELECT COUNT(*) as c FROM customers`.then(r => Number(r[0]?.c) || 0),
    sql`SELECT COUNT(*) as c FROM warehouse WHERE user_id = ${userId}`.then(r => Number(r[0]?.c) || 0),
  ]);

  return {
    chatMessagesPerDay: chatToday,
    shipmentsPerMonth: shipmentsMonth,
    inventoryItems: inventory,
    vehicles,
    drivers,
    customers,
    warehouses,
  };
}

// ── UI Formatting ──

export function formatPrice(amount: number): string {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function pricePerDay(monthly: number): string {
  if (monthly === 0) return "₹0/day";
  return `~₹${Math.round(monthly / 30)}/day`;
}

export function getYearlySavings(planId: PlanId): string {
  const p = PLANS[planId];
  if (p.priceMonthly === 0) return "";
  const saved = p.priceMonthly * 12 - p.priceYearly;
  const months = Math.round(saved / p.priceMonthly);
  return `Save ₹${saved.toLocaleString("en-IN")}/year (${months} months free)`;
}

// ── Plan Recommendation by Company Size ──

type CompanySize = "solo" | "2-10" | "11-30" | "31-50" | "51-100" | "100+";

export function suggestPlan(companySize: CompanySize): { plan: PlanId; reason: string; price: string } {
  switch (companySize) {
    case "solo":
      return { plan: "free", reason: "Solo operators get full access to core features on the Free", price: "Free" };
    case "2-10":
      return { plan: "starter", reason: "Small teams benefit from 3 team members, WhatsApp notifications, and route optimization", price: "₹999/mo" };
    case "11-30":
      return { plan: "starter", reason: "Growing teams can start with Starter and upgrade as needed", price: "₹999/mo" };
    case "31-50":
      return { plan: "growth", reason: "Larger teams need multiple warehouses, compliance automation, and unlimited integrations", price: "₹2,999/mo" };
    case "51-100":
      return { plan: "growth", reason: "Growth plan supports 10 users and 5,000 shipments/month", price: "₹2,999/mo" };
    case "100+":
      return { plan: "enterprise", reason: "Enterprise provides unlimited everything, API access, white-label, and dedicated support", price: "₹7,999/mo" };
    default:
      return { plan: "free", reason: "Start with the Free — no credit card needed", price: "Free" };
  }
}
