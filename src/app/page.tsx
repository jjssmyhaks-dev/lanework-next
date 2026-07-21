"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  Truck,
  Package,
  Route as RouteIcon,
  Warehouse,
  Users,
  MessageSquare,
  Plug,
  Sliders,
  Play,
  ShieldCheck,
  Code2,
  Minus,
  Plus,
} from "lucide-react";

/* ── Type helpers ── */
interface FAQItem {
  q: string;
  a: string;
}

/* ── Data ── */
const AGENTS = [
  {
    icon: Truck,
    title: "Shipment Tracking",
    desc: "Real-time GPS tracking with predictive ETAs and automated delay alerts for every shipment in your network.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    desc: "AI-driven stock level optimization, automated reorder triggers, and multi-warehouse sync in real time.",
  },
  {
    icon: RouteIcon,
    title: "Route Optimization",
    desc: "Dynamic route planning that accounts for traffic, weather, fuel costs, and delivery windows simultaneously.",
  },
  {
    icon: Warehouse,
    title: "Warehouse Operations",
    desc: "Smart picking paths, dock scheduling, and capacity forecasting to maximize throughput per square foot.",
  },
  {
    icon: Users,
    title: "Fleet & Driver Management",
    desc: "Driver performance analytics, compliance tracking, and maintenance scheduling from a single dashboard.",
  },
  {
    icon: MessageSquare,
    title: "Customer Communication",
    desc: "Automated WhatsApp, SMS, and email notifications with branded tracking portals for end-customers.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Connect Your Systems",
    desc: "Plug in your TMS, ERP, and telematics via our pre-built connectors. Go live in days, not months.",
  },
  {
    step: "02",
    title: "Deploy AI Agents",
    desc: "Turn on the agents you need. Each one learns from your data and gets smarter every day.",
  },
  {
    step: "03",
    title: "Watch It Scale",
    desc: "From 100 shipments to 100,000 — the platform scales automatically. You focus on strategy.",
  },
];

const TRUST_ITEMS = [
  "SOC 2 Type II certified — annual audits by independent firm",
  "GDPR & DPDP Act compliant — data residency in India",
  "99.95% uptime SLA with financial penalties",
  "End-to-end AES-256 encryption at rest and in transit",
];

const SOCIAL_PROOF = [
  "Delhivery",
  "Blue Dart",
  "Mahindra Logistics",
  "Shadowfax",
  "Ecom Express",
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "How long does implementation take?",
    a: "Most customers go live within 2 weeks. Enterprise deployments with complex integrations typically take 4-6 weeks.",
  },
  {
    q: "Do you integrate with our existing TMS?",
    a: "Yes. We have pre-built connectors for 40+ TMS and ERP systems. Custom integrations take 1-2 additional weeks.",
  },
  {
    q: "Is there a minimum shipment volume?",
    a: "No minimum. Our Starter plan works for fleets as small as 5 vehicles. Pricing scales with your usage.",
  },
  {
    q: "Where is our data stored?",
    a: "Data is stored in AWS Mumbai and Hyderabad regions. We never move your data outside India unless you ask us to.",
  },
  {
    q: "Can I try before buying?",
    a: "Yes — every plan includes a 14-day free trial. No credit card required. Upgrade or walk away, your choice.",
  },
  {
    q: "What support do you offer?",
    a: "Starter & Growth plans get email support with 4-hour SLA. Scale gets a dedicated CSM. Enterprise includes 24/7 phone support.",
  },
  {
    q: "How does pricing work for the Custom plan?",
    a: "Annual contract with volume discounts, custom SLAs, on-premise deployment options, and white-labeling. Contact us for a quote.",
  },
  {
    q: "Do you have mobile apps?",
    a: "Yes. Driver app on Android & iOS, plus a customer tracking portal. All included in every plan.",
  },
];

/* ── Shared styles ── */
const INK = "#1a1a2e";

/* ── Component ── */
export default function LaneworkLanding() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white font-sans text-[#1a1a2e]">
      {/* ═══════════ NAV ═══════════ */}
      <nav className="sticky top-0 z-50 border-b border-[#1a1a2e]/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <span className="text-xl font-extrabold tracking-tight">Lanework</span>
          <div className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#agents" className="hover:text-[#1a1a2e]/60 transition-colors">Agents</a>
            <a href="#how-it-works" className="hover:text-[#1a1a2e]/60 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-[#1a1a2e]/60 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#1a1a2e]/60 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden rounded-lg border border-[#1a1a2e]/20 px-4 py-2 text-sm font-semibold transition hover:bg-[#1a1a2e]/5 md:inline-block"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
              style={{ backgroundColor: INK }}
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 lg:pt-28">
        {/* grid accent */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `radial-gradient(${INK} 1px, transparent 1px)`, backgroundSize: "32px 32px" }}
        />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-block rounded-full border border-[#1a1a2e]/20 px-4 py-1 text-xs font-semibold tracking-widest uppercase">
            AI-Native Logistics Platform
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight lg:text-6xl">
            Move faster with
            <br />
            <span className="text-[#1a1a2e]/50">intelligent agents</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-[#1a1a2e]/60">
            Lanework deploys AI agents across your supply chain — from shipment tracking to warehouse ops. Built for Indian logistics, loved by operators.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: INK }}
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-[#1a1a2e]/20 px-6 py-3 text-sm font-semibold transition hover:bg-[#1a1a2e]/5"
            >
              <Play className="h-4 w-4" /> Watch Demo
            </button>
          </div>
        </div>

        {/* dashboard mockup card */}
        <div className="relative z-10 mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl border-2 border-[#1a1a2e]/10 bg-white p-1 shadow-2xl">
            <div className="rounded-xl border border-[#1a1a2e]/10 bg-[#fafafa] p-6">
              {/* fake dashboard chrome */}
              <div className="mb-6 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#1a1a2e]/20" />
                <div className="h-3 w-3 rounded-full bg-[#1a1a2e]/20" />
                <div className="h-3 w-3 rounded-full bg-[#1a1a2e]/20" />
                <span className="ml-3 text-[10px] font-medium uppercase tracking-widest text-[#1a1a2e]/30">Dashboard</span>
              </div>
              {/* fake charts */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-[#1a1a2e]/10 bg-white p-4">
                  <div className="mb-2 h-2 w-1/2 rounded bg-[#1a1a2e]/10" />
                  <div className="mb-1 h-6 w-3/4 rounded bg-[#1a1a2e]/20" />
                  <div className="h-20 rounded bg-[#1a1a2e]/5" />
                </div>
                <div className="rounded-lg border border-[#1a1a2e]/10 bg-white p-4">
                  <div className="mb-2 h-2 w-1/2 rounded bg-[#1a1a2e]/10" />
                  <div className="mb-1 h-6 w-3/4 rounded bg-[#1a1a2e]/20" />
                  <div className="h-20 rounded bg-[#1a1a2e]/5" />
                </div>
                <div className="rounded-lg border border-[#1a1a2e]/10 bg-white p-4">
                  <div className="mb-2 h-2 w-1/2 rounded bg-[#1a1a2e]/10" />
                  <div className="mb-1 h-6 w-3/4 rounded bg-[#1a1a2e]/20" />
                  <div className="h-20 rounded bg-[#1a1a2e]/5" />
                </div>
              </div>
              {/* fake activity feed */}
              <div className="mt-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded border border-[#1a1a2e]/10 bg-white px-4 py-3">
                    <div className="h-8 w-8 rounded-full bg-[#1a1a2e]/10" />
                    <div className="flex-1">
                      <div className="h-2 w-3/4 rounded bg-[#1a1a2e]/10" />
                      <div className="mt-1 h-2 w-1/2 rounded bg-[#1a1a2e]/5" />
                    </div>
                    <div className="h-2 w-12 rounded bg-[#1a1a2e]/10" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PROBLEM ═══════════ */}
      <section className="border-t border-[#1a1a2e]/10 bg-[#fafafa]">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-3 inline-block text-xs font-semibold tracking-widest uppercase text-[#1a1a2e]/40">The Problem</span>
            <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
              Logistics hasn&apos;t kept up
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { title: "Fragmented Systems", desc: "TMS, WMS, ERP, telematics — none of them talk to each other. Your team spends 40% of their day copy-pasting between screens." },
              { title: "Reactive Operations", desc: "You find out about delays after the customer does. There's no early-warning system. Every problem is a fire drill." },
              { title: "Margins Under Pressure", desc: "Fuel, labour, empty miles — costs keep climbing while customers demand faster, cheaper delivery. Something has to give." },
            ].map((p) => (
              <div key={p.title} className="rounded-xl border border-[#1a1a2e]/10 bg-white p-6">
                <h3 className="text-lg font-bold">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#1a1a2e]/60">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SOLUTION ═══════════ */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-semibold tracking-widest uppercase text-[#1a1a2e]/40">The Solution</span>
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            One platform. AI agents doing the heavy lifting.
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            { title: "Unify", desc: "Connect every system in your stack with pre-built integrations. Single source of truth across your entire logistics operation." },
            { title: "Automate", desc: "AI agents handle routine decisions — rerouting, restocking, rescheduling. Your team handles exceptions that actually matter." },
            { title: "Optimize", desc: "Continuous learning means the platform gets smarter with every shipment. Costs go down, service levels go up, margins expand." },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border-2 border-[#1a1a2e] bg-white p-6">
              <h3 className="text-xl font-extrabold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#1a1a2e]/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ AGENTS ═══════════ */}
      <section id="agents" className="border-t border-[#1a1a2e]/10 bg-[#fafafa]">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-3 inline-block text-xs font-semibold tracking-widest uppercase text-[#1a1a2e]/40">AI Agents</span>
            <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
              Six agents. Every corner of your supply chain.
            </h2>
            <p className="mt-4 text-[#1a1a2e]/50">
              Turn on the agents you need. Each one works autonomously and gets smarter with every decision.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map((a) => (
              <div
                key={a.title}
                className="group rounded-xl border border-[#1a1a2e]/10 bg-white p-6 transition hover:border-[#1a1a2e]/30 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex rounded-lg border border-[#1a1a2e]/10 p-2.5">
                  <a.icon className="h-5 w-5 text-[#1a1a2e]" />
                </div>
                <h3 className="text-lg font-bold">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1a1a2e]/50">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-semibold tracking-widest uppercase text-[#1a1a2e]/40">How It Works</span>
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            Three steps to an intelligent supply chain
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="rounded-xl border border-[#1a1a2e]/10 bg-white p-6">
              <span className="text-5xl font-extrabold tracking-tighter text-[#1a1a2e]/10">{s.step}</span>
              <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#1a1a2e]/50">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ INTERFACES ═══════════ */}
      <section className="border-t border-[#1a1a2e]/10 bg-[#fafafa]">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-3 inline-block text-xs font-semibold tracking-widest uppercase text-[#1a1a2e]/40">Interfaces</span>
            <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
              Dashboard, chat, or API — your call
            </h2>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-12 grid gap-12 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#1a1a2e]/10 bg-white p-1 shadow-xl">
              <div className="rounded-xl border border-[#1a1a2e]/10 bg-[#fafafa] p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/20" />
                  <span className="ml-2 text-[10px] font-medium uppercase tracking-widest text-[#1a1a2e]/30">Operations Dashboard</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-lg border border-[#1a1a2e]/10 bg-white p-4">
                      <div className="mb-2 h-2 w-1/2 rounded bg-[#1a1a2e]/10" />
                      <div className="h-16 rounded bg-[#1a1a2e]/5" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat Copilot Mockup */}
            <div className="rounded-2xl border-2 border-[#1a1a2e]/10 bg-white p-1 shadow-xl">
              <div className="rounded-xl border border-[#1a1a2e]/10 bg-[#fafafa] p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/20" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/20" />
                  <span className="ml-2 text-[10px] font-medium uppercase tracking-widest text-[#1a1a2e]/30">Lanework Copilot</span>
                </div>
                <div className="space-y-3">
                  <div className="ml-auto max-w-[75%] rounded-xl rounded-br-sm bg-white border border-[#1a1a2e]/10 px-4 py-2.5 text-right text-sm">
                    Where&apos;s shipment #ORD-8827?
                  </div>
                  <div className="max-w-[75%] rounded-xl rounded-bl-sm px-4 py-2.5 text-sm"
                    style={{ backgroundColor: INK, color: "#fff" }}
                  >
                    On truck MH-04-GR-5532. Currently 12 km from Bhiwandi hub. ETA: 3:45 PM. Want me to notify the customer?
                  </div>
                  <div className="ml-auto max-w-[75%] rounded-xl rounded-br-sm bg-white border border-[#1a1a2e]/10 px-4 py-2.5 text-right text-sm">
                    Yes please. SMS and WhatsApp.
                  </div>
                  <div className="max-w-[75%] rounded-xl rounded-bl-sm px-4 py-2.5 text-sm"
                    style={{ backgroundColor: INK, color: "#fff" }}
                  >
                    Done. Notifications sent. I&apos;ll alert you if the ETA shifts by more than 15 minutes.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST ═══════════ */}
      <section className="border-t border-[#1a1a2e]/10 mx-auto max-w-7xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-semibold tracking-widest uppercase text-[#1a1a2e]/40">Trust</span>
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            Enterprise-grade security, from day one
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {TRUST_ITEMS.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-lg border border-[#1a1a2e]/10 bg-white p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1a1a2e]" />
              <span className="text-sm leading-relaxed text-[#1a1a2e]/60">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ DEV API ═══════════ */}
      <section className="border-t border-[#1a1a2e]/10 bg-[#fafafa]">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-3 inline-block text-xs font-semibold tracking-widest uppercase text-[#1a1a2e]/40">Developer API</span>
            <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
              Build on Lanework
            </h2>
            <p className="mt-4 text-[#1a1a2e]/50">
              RESTful APIs, webhooks, and SDKs in Python, Node, and Go. Ship in hours, not weeks.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-2xl">
            <div className="overflow-hidden rounded-xl border-2 border-[#1a1a2e]/10 bg-white shadow-lg">
              {/* Fake code header */}
              <div className="flex items-center gap-2 border-b border-[#1a1a2e]/10 px-4 py-3 bg-[#fafafa]">
                <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/20" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/20" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/20" />
                <span className="ml-2 text-[11px] font-medium uppercase tracking-widest text-[#1a1a2e]/30">shipment.ts</span>
              </div>
              <pre className="overflow-x-auto p-6 text-sm leading-relaxed text-[#1a1a2e]/70">
                <code>{`import { Lanework } from "@lanework/sdk";

const lw = new Lanework({ apiKey: process.env.LW_KEY });

// Create a shipment with AI-optimized routing
const shipment = await lw.shipments.create({
  origin:        { lat: 19.0760, lng: 72.8777 },  // Mumbai
  destination:   { lat: 12.9716, lng: 77.5946 },  // Bangalore
  package:       { weightKg: 240, priority: "express" },
  optimizeRoute: true,   // ← AI agent picks best route
});

console.log(shipment.id, shipment.eta);`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="border-t border-[#1a1a2e]/10 mx-auto max-w-7xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-semibold tracking-widest uppercase text-[#1a1a2e]/40">Pricing</span>
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            Plans for every stage of growth
          </h2>
          <p className="mt-4 text-[#1a1a2e]/50">All plans include a 14-day free trial. No credit card required.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Starter", price: "₹24,999", period: "/mo", desc: "For small fleets getting started with AI", features: ["Up to 5 vehicles", "3 AI agents", "Email support", "14-day free trial"] },
            { name: "Growth", price: "₹83,299", period: "/mo", desc: "For growing operations that need scale", features: ["Up to 50 vehicles", "All 6 AI agents", "Priority email support", "API access", "Custom dashboards"] },
            { name: "Scale", price: "₹2,49,999", period: "/mo", desc: "For mid-market leaders", features: ["Up to 500 vehicles", "All agents + custom training", "Dedicated CSM", "Advanced analytics", "Slack integration"] },
            { name: "Enterprise", price: "Custom", period: "", desc: "For organizations with bespoke needs", features: ["Unlimited vehicles", "On-premise deployment", "24/7 phone support", "White-label option", "Custom SLA"] },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-xl border-2 p-6 ${
                plan.name === "Growth" ? "border-[#1a1a2e] bg-white" : "border-[#1a1a2e]/10 bg-white"
              }`}
            >
              <h3 className="text-lg font-extrabold">{plan.name}</h3>
              <p className="mt-1 text-xs text-[#1a1a2e]/40">{plan.desc}</p>
              <div className="mt-4">
                <span className="text-3xl font-extrabold">{plan.price}</span>
                {plan.period && <span className="text-sm text-[#1a1a2e]/40">{plan.period}</span>}
              </div>
              <ul className="mt-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#1a1a2e]/60">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#1a1a2e]" /> {f}
                  </li>
                ))}
              </ul>
              <a
                href="/register"
                className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${
                  plan.name === "Growth"
                    ? "text-white"
                    : "border border-[#1a1a2e]/20 hover:bg-[#1a1a2e]/5"
                }`}
                style={plan.name === "Growth" ? { backgroundColor: INK } : undefined}
              >
                Start Free Trial
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF ═══════════ */}
      <section className="border-t border-[#1a1a2e]/10 bg-[#fafafa]">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-3 inline-block text-xs font-semibold tracking-widest uppercase text-[#1a1a2e]/40">Trusted By</span>
            <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
              India&apos;s best logistics teams run on Lanework
            </h2>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            {SOCIAL_PROOF.map((name) => (
              <span key={name} className="text-xl font-extrabold tracking-tight text-[#1a1a2e]/20">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="mx-auto max-w-7xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-block text-xs font-semibold tracking-widest uppercase text-[#1a1a2e]/40">FAQ</span>
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
            You ask. We answer.
          </h2>
        </div>
        <div className="mx-auto mt-12 max-w-2xl divide-y divide-[#1a1a2e]/10">
          {FAQ_ITEMS.map((faq, i) => (
            <div key={i} className="py-4">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 text-left"
                onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
              >
                <span className="font-semibold">{faq.q}</span>
                {openFAQ === i ? (
                  <Minus className="h-4 w-4 shrink-0 text-[#1a1a2e]/40" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-[#1a1a2e]/40" />
                )}
              </button>
              {openFAQ === i && (
                <p className="mt-3 text-sm leading-relaxed text-[#1a1a2e]/50">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="border-t border-[#1a1a2e]/10">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight lg:text-5xl">
            Ready to move faster?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-[#1a1a2e]/50">
            Join the logistics teams already running on Lanework. Start your 14-day free trial — no credit card, no commitment.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: INK }}
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-lg border border-[#1a1a2e]/20 px-6 py-3 text-sm font-semibold transition hover:bg-[#1a1a2e]/5"
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-[#1a1a2e]/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <span className="text-lg font-extrabold tracking-tight">Lanework</span>
              <p className="mt-3 text-sm leading-relaxed text-[#1a1a2e]/50">
                AI-native logistics platform. Built in India, for the world.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-widest text-[#1a1a2e]/30">Product</h4>
              <ul className="mt-4 space-y-2">
                {["Agents", "Integrations", "API Docs", "Pricing", "Changelog"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-[#1a1a2e]/60 transition hover:text-[#1a1a2e]">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-widest text-[#1a1a2e]/30">Company</h4>
              <ul className="mt-4 space-y-2">
                {["About", "Blog", "Careers", "Partners", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-[#1a1a2e]/60 transition hover:text-[#1a1a2e]">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-widest text-[#1a1a2e]/30">Legal</h4>
              <ul className="mt-4 space-y-2">
                {["Privacy Policy", "Terms of Service", "Security", "GDPR", "DPDP Act"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-[#1a1a2e]/60 transition hover:text-[#1a1a2e]">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-[#1a1a2e]/10 pt-6 text-center text-xs text-[#1a1a2e]/30">
            &copy; {new Date().getFullYear()} Lanework Technologies Pvt Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
