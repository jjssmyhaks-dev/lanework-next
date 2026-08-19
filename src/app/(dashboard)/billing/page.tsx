"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard, Check, ArrowRight, Loader2, IndianRupee,
  Calendar, Download, ExternalLink, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, formatPrice, getYearlySavings, type PlanId } from "@/lib/pricing";

type BillingInfo = {
  plan: PlanId;
  planName: string;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  amount: number;
  paymentMethod: { brand: string; last4: string } | null;
  invoices: Array<{ id: string; date: string; amount: number; status: string }>;
};

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    fetch("/api/billing")
      .then(r => r.json())
      .then(data => { setBilling(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planId: PlanId) => {
    setUpgrading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, billing: billingCycle }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.razorpayOrderId) {
        // Open Razorpay checkout
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: "INR",
          name: "Lanework",
          description: `Upgrade to ${PLANS[planId].name}`,
          order_id: data.razorpayOrderId,
          handler: function (response: any) {
            // Payment successful — verify on server
            fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                plan: planId,
              }),
            }).then(() => window.location.reload());
          },
          prefill: { name: "", email: "" },
          theme: { color: "#1a1a2e" },
        };
        // @ts-ignore
        if (typeof window !== "undefined" && window.Razorpay) {
          // @ts-ignore
          const rzp = new window.Razorpay(options);
          rzp.open();
        }
      }
    } catch (err) {
      console.error("Upgrade failed:", err);
    }
    setUpgrading(null);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const currentPlan = billing?.plan || "free";
  const planOrder: PlanId[] = ["free", "starter", "growth", "enterprise"];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="border-b border-[#e5e7eb]/60 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center gap-3 text-sm text-[#1a1a2e]/50 mb-2">
            <Link href="/dashboard" className="hover:text-[#1a1a2e]">Home</Link><span>/</span>
            <span className="text-[#1a1a2e]">Billing</span>
          </div>
          <h1 className="text-3xl font-semibold text-[#1a1a2e]">Billing & Plans</h1>
          <p className="mt-1 text-[#1a1a2e]/60">Manage your subscription, payment method, and invoices.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* Current Plan */}
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-[#1a1a2e]">Current Plan</h2>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#1a1a2e]">{billing?.planName || "Free Trial"}</span>
                {billing && billing.amount > 0 && (
                  <span className="text-sm text-[#1a1a2e]/50">
                    {formatPrice(billing.amount)}/mo · {billing.billingCycle}
                  </span>
                )}
              </div>
            </div>
            {billing?.paymentMethod && (
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-[#1a1a2e]/70">
                  <CreditCard className="h-4 w-4" />
                  <span>{billing.paymentMethod.brand} •••• {billing.paymentMethod.last4}</span>
                </div>
                {billing.nextBillingDate && (
                  <p className="mt-1 text-xs text-[#1a1a2e]/40">
                    Next billing: {new Date(billing.nextBillingDate).toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Upgrade Plans */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Upgrade Plan</h2>
            <div className="flex items-center gap-1 p-1 rounded-full bg-[#1a1a2e]/5">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  billingCycle === "monthly" ? "bg-white text-[#1a1a2e] shadow-sm" : "text-[#1a1a2e]/50"
                )}
              >Monthly</button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  billingCycle === "yearly" ? "bg-white text-[#1a1a2e] shadow-sm" : "text-[#1a1a2e]/50"
                )}
              >Yearly <span className="text-emerald-600">Save 17%</span></button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {planOrder.map(planId => {
              const plan = PLANS[planId];
              const price = billingCycle === "monthly" ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
              const isCurrent = currentPlan === planId;
              const isUpgrade = planOrder.indexOf(planId) > planOrder.indexOf(currentPlan);

              return (
                <div key={planId} className={cn(
                  "rounded-2xl border p-5 transition-all",
                  isCurrent ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400/20" : "border-[#e5e7eb] bg-white hover:border-[#1a1a2e]/30",
                  plan.recommended && !isCurrent ? "border-emerald-400 shadow-md" : ""
                )}>
                  <h3 className="font-semibold text-[#1a1a2e]">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1a1a2e]">
                      {price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`}
                    </span>
                    {price > 0 && <span className="text-xs text-[#1a1a2e]/40">/mo</span>}
                  </div>

                  {isCurrent ? (
                    <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                      <Check className="h-4 w-4" /> Current plan
                    </div>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleUpgrade(planId)}
                      disabled={!!upgrading}
                      className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a2e]/90 disabled:opacity-50 transition-colors"
                    >
                      {upgrading === planId ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Upgrade <ArrowRight className="h-4 w-4" /></>}
                    </button>
                  ) : (
                    <div className="mt-4 text-xs text-[#1a1a2e]/40">Included in your plan</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoices */}
        {billing?.invoices && billing.invoices.length > 0 && (
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Invoice History</h2>
            <div className="divide-y divide-[#e5e7eb]">
              {billing.invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-[#1a1a2e]/30" />
                    <div>
                      <p className="text-sm font-medium text-[#1a1a2e]">{inv.id}</p>
                      <p className="text-xs text-[#1a1a2e]/40">{new Date(inv.date).toLocaleDateString("en-IN")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#1a1a2e]">{formatPrice(inv.amount)}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full",
                      inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>{inv.status}</span>
                    <button className="p-1.5 rounded-lg hover:bg-gray-100 text-[#1a1a2e]/40 hover:text-[#1a1a2e]/70">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Razorpay info */}
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50">
              <IndianRupee className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1a1a2e]">Payments powered by Razorpay</h3>
              <p className="mt-1 text-sm text-[#1a1a2e]/60">
                Secure payments via UPI, cards, net banking, and wallets. All prices in ₹ INR + applicable GST (18%).
                Invoices generated automatically after each payment.
              </p>
              <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                Learn more about Razorpay <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
