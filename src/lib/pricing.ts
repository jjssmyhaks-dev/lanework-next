/**
 * Lanework Pricing Model
 *
 * Designed for Indian MSMEs — INR pricing, GST extra, 75%+ gross margin.
 * Plans: Free (7-day trial), Starter (₹999/mo), Growth (₹2,999/mo), Enterprise (₹7,999/mo)
 */

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
  priceMonthly: number;           // INR before GST
  priceYearly: number;            // INR before GST (17% discount ≈ 2 months free)
  priceMonthlyPerUser: number;    // Extra user cost
  features: PlanFeatures;
  description: string;
  descriptionHi: string;
  recommended?: boolean;
  cta: string;
  badge?: string;
}> = {
  free: {
    id: "free",
    name: "Free Trial",
    nameHi: "मुफ्त ट्रायल",
    priceMonthly: 0,
    priceYearly: 0,
    priceMonthlyPerUser: 0,
    description: "Try Lanework free for 7 days. No credit card needed.",
    descriptionHi: "7 दिन मुफ्त ट्रायल। क्रेडिट कार्ड की जरूरत नहीं।",
    cta: "Start Free Trial",
    features: {
      chatMessagesPerDay: 25,
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
      shipmentsPerMonth: 50,
      inventoryItems: 100,
      vehicles: 5,
      drivers: 5,
      warehouses: 1,
      customers: 50,
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
    priceYearly: 9999,    // ≈ ₹833/mo (2 months free)
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
    priceYearly: 29999,   // ≈ ₹2,500/mo
    priceMonthlyPerUser: 299,
    description: "Scale operations with ERP, e-commerce, and compliance automation.",
    descriptionHi: "ERP, ई-कॉमर्स और कंप्लायंस ऑटोमेशन के साथ बढ़ें।",
    cta: "Start at ₹2,999/mo",
    features: {
      chatMessagesPerDay: -1, // unlimited
      maxUsers: 10,
      storageGB: 25,
      maxIntegrations: -1, // unlimited
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
    priceYearly: 79999,   // ≈ ₹6,667/mo
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
      dataRetentionDays: -1, // forever
    },
  },
};

/** Get the current user's plan features */
export function getPlanFeatures(plan: PlanId): PlanFeatures {
  return PLANS[plan]?.features || PLANS.free.features;
}

/** Check if a feature is available on the given plan */
export function hasFeature(plan: PlanId, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan);
  const val = features[feature];
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  return false;
}

/** Check if the user is within their usage limit */
export function isWithinLimit(
  plan: PlanId,
  metric: keyof PlanFeatures,
  currentUsage: number
): boolean {
  const features = getPlanFeatures(plan);
  const limit = features[metric] as number;
  if (limit === -1) return true; // unlimited
  return currentUsage < limit;
}

/** Infrastructure cost estimate per plan (monthly INR) — used for margin calculations */
export const INFRA_COST_PER_USER_MONTHLY: Record<PlanId, number> = {
  free: 5,       // Minimal — serverless cold starts, no DB writes
  starter: 27,   // Neon ~0.5GB, Vercel ~20GB BW, AI ~50 calls
  growth: 70,    // Neon ~2GB, Vercel ~50GB BW, AI ~200 calls, Sentry
  enterprise: 262, // Neon ~5GB, Vercel ~100GB BW, AI ~500 calls, Sentry Pro
};

/** Calculate gross margin percentage */
export function calculateMargin(plan: PlanId, billing: "monthly" | "yearly" = "monthly"): number {
  const p = PLANS[plan];
  const revenue = billing === "monthly" ? p.priceMonthly : Math.round(p.priceYearly / 12);
  const cost = INFRA_COST_PER_USER_MONTHLY[plan];
  if (revenue === 0) return 0;
  return Math.round(((revenue - cost) / revenue) * 100);
}

/** Bundle savings text */
export function getYearlySavings(plan: PlanId): string {
  const p = PLANS[plan];
  if (p.priceMonthly === 0) return "";
  const monthlyTotal = p.priceMonthly * 12;
  const yearlyPrice = p.priceYearly;
  const saved = monthlyTotal - yearlyPrice;
  const months = Math.round(saved / p.priceMonthly);
  return `Save ₹${saved.toLocaleString("en-IN")}/year (${months} months free)`;
}

/** Format price in Indian number system */
export function formatPrice(amount: number): string {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** Price per day (useful for micro-comparisons) */
export function pricePerDay(monthly: number): string {
  if (monthly === 0) return "₹0/day";
  return `~₹${Math.round(monthly / 30)}/day`;
}
