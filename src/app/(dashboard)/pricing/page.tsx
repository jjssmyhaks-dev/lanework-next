"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check, X, Zap, ArrowRight, Sparkles, Shield,
  Truck, Package, MapPin, MessageCircle, Calculator,
  FileCheck, CreditCard, Globe, Building, Headphones,
  Star, IndianRupee, Clock, Users, HardDrive,
} from "lucide-react";
import { PLANS, formatPrice, getYearlySavings, pricePerDay, calculateMargin, type PlanId } from "@/lib/pricing";

const PLAN_ICONS: Record<PlanId, any> = {
  free: Sparkles,
  starter: Zap,
  growth: Rocket,
  enterprise: Shield,
};

function Rocket(props: any) {
  return <Zap {...props} />;
}

const FEATURE_ROWS: { label: string; key: string; category: string }[] = [
  // Chat & AI
  { label: "AI Chat messages per day", key: "chatMessagesPerDay", category: "Chat & AI" },
  { label: "AI-powered reports", key: "aiReports", category: "Chat & AI" },
  { label: "Voice input", key: "voiceInput", category: "Chat & AI" },

  // Core
  { label: "Team members", key: "maxUsers", category: "Core" },
  { label: "Storage", key: "storageGB", category: "Core" },
  { label: "Data retention", key: "dataRetentionDays", category: "Core" },

  // Limits
  { label: "Shipments per month", key: "shipmentsPerMonth", category: "Limits" },
  { label: "Inventory items", key: "inventoryItems", category: "Limits" },
  { label: "Vehicles", key: "vehicles", category: "Limits" },
  { label: "Drivers", key: "drivers", category: "Limits" },
  { label: "Warehouses", key: "warehouses", category: "Limits" },
  { label: "Customers", key: "customers", category: "Limits" },

  // Integrations
  { label: "Max integrations", key: "maxIntegrations", category: "Integrations" },
  { label: "Shiprocket (7+ carriers)", key: "shiprocket", category: "Integrations" },
  { label: "WhatsApp notifications", key: "whatsappNotifications", category: "Integrations" },
  { label: "TallyPrime sync", key: "tallyPrime", category: "Integrations" },
  { label: "GST e-Way Bill", key: "gstnEwayBill", category: "Integrations" },
  { label: "MapmyIndia routing", key: "mapmyIndia", category: "Integrations" },
  { label: "Google Sheets", key: "googleSheets", category: "Integrations" },
  { label: "Shopify / WooCommerce", key: "shopify", category: "Integrations" },
  { label: "FedEx (international)", key: "fedex", category: "Integrations" },
  { label: "Fleet GPS tracking", key: "fleetTracking", category: "Integrations" },
  { label: "Compliance (Parivahan)", key: "compliance", category: "Integrations" },
  { label: "Email automation", key: "email", category: "Integrations" },
  { label: "ERP (SAP B1)", key: "erp", category: "Integrations" },
  { label: "WMS", key: "wms", category: "Integrations" },

  // Features
  { label: "CSV import/export", key: "csvImport", category: "Features" },
  { label: "Route optimization", key: "routeOptimization", category: "Features" },
  { label: "Automated e-Way Bills", key: "automatedEwayBill", category: "Features" },
  { label: "COD reconciliation", key: "CODReconciliation", category: "Features" },
  { label: "API access", key: "apiAccess", category: "Features" },
  { label: "White-label", key: "whiteLabel", category: "Features" },
  { label: "Priority support", key: "prioritySupport", category: "Features" },
  { label: "Dedicated account manager", key: "dedicatedAccountManager", category: "Features" },
];

function FeatureValue({ value, isBoolean }: { value: any; isBoolean: boolean }) {
  if (isBoolean) {
    return value
      ? <Check className="h-4 w-4 text-emerald-500" />
      : <X className="h-4 w-4 text-gray-300" />;
  }
  if (value === -1) return <span className="text-sm font-medium text-[#1a1a2e]">Unlimited</span>;
  if (typeof value === "number" && value === 0) return <span className="text-sm text-gray-400">—</span>;
  if (typeof value === "number" && value >= 90) return <span className="text-sm font-medium text-[#1a1a2e]">{value} days</span>;
  if (typeof value === "number" && value >= 5) return <span className="text-sm font-medium text-[#1a1a2e]">{value} GB</span>;
  return <span className="text-sm font-medium text-[#1a1a2e]">{value}</span>;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const planOrder: PlanId[] = ["free", "starter", "growth", "enterprise"];
  const categories = [...new Set(FEATURE_ROWS.map(r => r.category))];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="border-b border-[#e5e7eb]/60 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-4">
            <IndianRupee className="h-3 w-3" />
            Pricing built for Indian businesses
          </div>
          <h1 className="text-4xl font-bold text-[#1a1a2e]">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-lg text-[#1a1a2e]/60 max-w-2xl mx-auto">
            Start free, upgrade when ready. All prices in ₹ INR + applicable GST.
            No hidden charges, no per-shipment fees.
          </p>

          {/* Billing toggle */}
          <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-full bg-[#1a1a2e]/5">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billing === "monthly" ? "bg-white text-[#1a1a2e] shadow-sm" : "text-[#1a1a2e]/50"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billing === "yearly" ? "bg-white text-[#1a1a2e] shadow-sm" : "text-[#1a1a2e]/50"
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-emerald-600 font-semibold">Save 17%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mx-auto max-w-7xl px-6 -mt-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {planOrder.map((planId) => {
            const plan = PLANS[planId];
            const price = billing === "monthly" ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
            const Icon = PLAN_ICONS[planId];
            const yearlySavings = billing === "yearly" ? getYearlySavings(planId) : "";
            const margin = calculateMargin(planId, billing);

            return (
              <div
                key={planId}
                className={`relative rounded-2xl border transition-all duration-300 ${
                  plan.recommended
                    ? "border-emerald-400 bg-white shadow-lg ring-1 ring-emerald-400/20 scale-[1.02]"
                    : "border-[#e5e7eb] bg-white hover:border-[#1a1a2e]/30 hover:shadow-md"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      planId === "enterprise" ? "bg-[#1a1a2e] text-white" : "bg-emerald-600 text-white"
                    }`}>
                      <Star className="h-3 w-3" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl mb-3 ${
                    plan.recommended ? "bg-emerald-100" : "bg-[#1a1a2e]/5"
                  }`}>
                    <Icon className={`h-5 w-5 ${plan.recommended ? "text-emerald-600" : "text-[#1a1a2e]/60"}`} />
                  </div>

                  <h3 className="text-lg font-semibold text-[#1a1a2e]">{plan.name}</h3>
                  <p className="text-sm text-[#1a1a2e]/50 mt-1">{plan.description}</p>

                  <div className="mt-4 mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-[#1a1a2e]">
                        {price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`}
                      </span>
                      {price > 0 && <span className="text-sm text-[#1a1a2e]/40">/mo</span>}
                    </div>
                    {price > 0 && (
                      <p className="text-xs text-[#1a1a2e]/40 mt-1">
                        {pricePerDay(price)} + GST · Billed {billing}
                      </p>
                    )}
                    {yearlySavings && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">{yearlySavings}</p>
                    )}
                  </div>

                  <Link
                    href={planId === "enterprise" ? "/contact" : "/register"}
                    className={`mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                      plan.recommended
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : planId === "enterprise"
                          ? "bg-[#1a1a2e] text-white hover:bg-[#1a1a2e]/90"
                          : "bg-[#1a1a2e]/5 text-[#1a1a2e] hover:bg-[#1a1a2e]/10"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-2xl font-bold text-[#1a1a2e] text-center mb-8">
          Compare all features
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-[#e5e7eb] bg-white">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="text-left text-sm font-semibold text-[#1a1a2e] p-4 w-[300px]">Feature</th>
                {planOrder.map(planId => (
                  <th key={planId} className={`text-center text-sm font-semibold p-4 ${PLANS[planId].recommended ? "text-emerald-600" : "text-[#1a1a2e]"}`}>
                    {PLANS[planId].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <>
                  <tr key={`cat-${cat}`} className="bg-[#f9fafb]">
                    <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-[#1a1a2e]/50 uppercase tracking-wider">
                      {cat}
                    </td>
                  </tr>
                  {FEATURE_ROWS.filter(r => r.category === cat).map(row => {
                    const isBoolean = typeof PLANS.free.features[row.key as keyof typeof PLANS.free.features] === "boolean";
                    return (
                      <tr key={row.key} className="border-b border-[#e5e7eb]/50 last:border-b-0">
                        <td className="px-4 py-3 text-sm text-[#1a1a2e]/70">{row.label}</td>
                        {planOrder.map(planId => {
                          const features = PLANS[planId].features;
                          const val = features[row.key as keyof typeof features];
                          return (
                            <td key={planId} className="px-4 py-3 text-center">
                              <div className="flex justify-center">
                                <FeatureValue value={val} isBoolean={isBoolean} />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost breakdown + margin analysis */}
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-8">
          <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">What you&apos;re paying for</h2>
          <p className="text-sm text-[#1a1a2e]/50 mb-6">Full cost breakdown per plan — AI included. All margins above 75%.</p>

          {/* Cost table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="text-left py-2 text-[#1a1a2e]/60 font-medium">Cost Component</th>
                  <th className="text-right py-2 text-[#1a1a2e]/60 font-medium">Starter</th>
                  <th className="text-right py-2 text-[#1a1a2e]/60 font-medium">Growth</th>
                  <th className="text-right py-2 text-[#1a1a2e]/60 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-[#1a1a2e]">
                <tr className="border-b border-[#e5e7eb]/50">
                  <td className="py-2">Compute (Vercel serverless)</td>
                  <td className="text-right py-2">₹8</td>
                  <td className="text-right py-2">₹20</td>
                  <td className="text-right py-2">₹60</td>
                </tr>
                <tr className="border-b border-[#e5e7eb]/50">
                  <td className="py-2">Database (Neon PostgreSQL)</td>
                  <td className="text-right py-2">₹5</td>
                  <td className="text-right py-2">₹15</td>
                  <td className="text-right py-2">₹40</td>
                </tr>
                <tr className="border-b border-[#e5e7eb]/50">
                  <td className="py-2">Bandwidth (Vercel CDN)</td>
                  <td className="text-right py-2">₹2</td>
                  <td className="text-right py-2">₹5</td>
                  <td className="text-right py-2">₹15</td>
                </tr>
                <tr className="border-b border-[#e5e7eb]/50 bg-emerald-50/50">
                  <td className="py-2 font-medium">🤖 AI (Cloudflare Workers AI — Llama 3 8B)</td>
                  <td className="text-right py-2 font-medium">₹3</td>
                  <td className="text-right py-2 font-medium">₹15</td>
                  <td className="text-right py-2 font-medium">₹80</td>
                </tr>
                <tr className="border-b border-[#e5e7eb]/50">
                  <td className="py-2">Email (Resend)</td>
                  <td className="text-right py-2">₹2</td>
                  <td className="text-right py-2">₹5</td>
                  <td className="text-right py-2">₹15</td>
                </tr>
                <tr className="border-b border-[#e5e7eb]/50">
                  <td className="py-2">Monitoring (Sentry)</td>
                  <td className="text-right py-2">₹1</td>
                  <td className="text-right py-2">₹2</td>
                  <td className="text-right py-2">₹5</td>
                </tr>
                <tr className="border-t-2 border-[#1a1a2e]/20">
                  <td className="py-3 font-semibold text-[#1a1a2e]">Total cost per user/month</td>
                  <td className="text-right py-3 font-bold text-red-600">₹21</td>
                  <td className="text-right py-3 font-bold text-red-600">₹62</td>
                  <td className="text-right py-3 font-bold text-red-600">₹215</td>
                </tr>
                <tr>
                  <td className="py-2 font-semibold">Revenue per user/month</td>
                  <td className="text-right py-2 font-semibold text-emerald-600">₹999</td>
                  <td className="text-right py-2 font-semibold text-emerald-600">₹2,999</td>
                  <td className="text-right py-2 font-semibold text-emerald-600">₹7,999</td>
                </tr>
                <tr className="bg-emerald-50">
                  <td className="py-3 font-bold text-emerald-700">Gross Margin</td>
                  <td className="text-right py-3 font-bold text-emerald-700">97.9%</td>
                  <td className="text-right py-3 font-bold text-emerald-700">97.9%</td>
                  <td className="text-right py-3 font-bold text-emerald-700">97.3%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* AI cost explanation */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 mb-6">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">🤖 How AI costs work</h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              Every AI chat uses Cloudflare Workers AI (Llama 3 8B). Each conversation costs ~₹0.005 (half a paisa) — input tokens are ~₹0.92/million, output ~₹2.75/million. A typical logistics query uses ~3K tokens total. <strong>AI is included in all plans — no per-message charges.</strong>
            </p>
          </div>

          {/* What you get */}
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-[#1a1a2e] mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" /> AI Chat
              </h3>
              <p className="text-[#1a1a2e]/60">
                Cloudflare Workers AI (Llama 3 8B) handles your logistics queries.
                No per-message charge — included in your plan.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[#1a1a2e] mb-2 flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-600" /> 15 MCP Integrations
              </h3>
              <p className="text-[#1a1a2e]/60">
                Shiprocket, FedEx, Shopify, MapmyIndia, and more — connected via MCP protocol.
                You bring your own API keys, we handle the plumbing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[#1a1a2e] mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" /> Secure Data
              </h3>
              <p className="text-[#1a1a2e]/60">
                Your data lives on Neon PostgreSQL with AES-256 encryption.
                JWT auth, rate limiting, and audit logs on every action.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
