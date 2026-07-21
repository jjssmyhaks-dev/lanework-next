"use client";

import { useState } from "react";
import {
  ArrowRight, Truck, Package, Route as RouteIcon, Warehouse, Users, MessageSquare,
  Plug, Sliders, Play, ShieldCheck, Code2, Minus, Plus,
} from "lucide-react";

/* ===== Logo ===== */
function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-7 w-7 place-items-center rounded-md bg-[#1a1a2e]">
        <div className="h-3 w-3 rounded-sm bg-[#93c5fd]" style={{ transform: "rotate(45deg)" }} />
      </div>
      <span className="text-lg font-semibold tracking-tight text-[#1a1a2e]">Lanework</span>
    </div>
  );
}

/* ===== Nav ===== */
function Nav() {
  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="hidden items-center gap-8 rounded-full border border-[#e5e7eb]/70 bg-white/70 px-6 py-2.5 text-sm text-[#1a1a2e]/80 shadow-sm backdrop-blur md:flex">
          {["Product", "Agents", "How it Works", "Pricing", "Docs"].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s/g, "-")}`} className="hover:text-[#1a1a2e]">
              {l}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href="/login" className="hidden text-sm text-[#1a1a2e]/70 hover:text-[#1a1a2e] sm:inline">
            Sign In
          </a>
          <a href="/register" className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">
            Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

/* ===== Announce Bar ===== */
function Announce() {
  return (
    <div className="border-b border-[#e5e7eb]/60 bg-transparent">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-6 py-2 text-sm">
        <span className="font-medium text-[#1a1a2e]">New — Voice copilot in private beta</span>
        <a href="#" className="inline-flex items-center gap-1 text-[#1a1a2e]/70 hover:text-[#1a1a2e]">
          Learn more <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

/* ===== Card Shell ===== */
function CardShell({ className = "", title, badge, children, minHeight }: {
  className?: string; title: string; badge?: { label: string; tone: "green" | "amber" | "blue" };
  children: React.ReactNode; minHeight?: number;
}) {
  const toneColor = badge ? {
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-sky-100 text-sky-700",
  }[badge.tone] : "";
  return (
    <div className={`relative rounded-md border border-[#e5e7eb] bg-white p-5 text-left shadow-[0_10px_40px_-20px_rgba(30,40,80,0.25)] ${className}`}
      style={minHeight ? { minHeight } : undefined}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium tracking-[0.18em] text-[#1a1a2e]/50">{title}</span>
        {badge && <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${toneColor}`}>{badge.label}</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-[#1a1a2e]/10 py-1.5 text-[11px] last:border-0">
      <span className="text-[#1a1a2e]/50">{k}</span>
      <span className={`${mono ? "font-mono" : ""} text-[#1a1a2e]/80`}>{v}</span>
    </div>
  );
}

function ShipmentCard() {
  return (
    <CardShell className="col-span-3 mt-16" title="SHIPMENT" badge={{ label: "In transit", tone: "blue" }} minHeight={220}>
      <div className="mt-4">
        <div className="text-[11px] text-[#1a1a2e]/50">Tracking</div>
        <div className="mt-0.5 font-mono text-sm text-[#1a1a2e]">SHP-482913</div>
        <div className="mt-3 space-y-1">
          <Row k="From" v="Oakland, CA" /><Row k="To" v="Reno, NV" />
          <Row k="Carrier" v="FedEx Freight" /><Row k="ETA" v="Today, 3:42 PM" />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-[#1a1a2e]/50">
            <span>Picked up</span><span>Out for delivery</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[#1a1a2e]/5">
            <div className="h-full w-[72%] rounded-full bg-sky-400/80" />
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function AgentCard() {
  return (
    <CardShell className="col-span-6" title="AGENT · Route Optimization" badge={{ label: "Auto-approved", tone: "green" }} minHeight={380}>
      <div className="mt-4 text-[13px] leading-relaxed text-[#1a1a2e]/80">
        Rerouting <span className="font-medium text-[#1a1a2e]">3 shipments</span> around the I-80 closure near Truckee.
      </div>
      <div className="mt-4 rounded-md bg-[#f3f0ff]/30 p-3 text-[11px] text-[#1a1a2e]/70">
        <span className="font-medium text-[#1a1a2e]">Reasoning:</span> CalTrans reported a 2-hour closure at mile 184. Alternate via US-50 adds 22 mi but avoids a 90-min delay.
      </div>
      <div className="mt-4 space-y-1.5">
        <Row k="SHP-482913 · Reno" v="US-50 (+22 mi, −68 min)" mono />
        <Row k="SHP-482918 · Sparks" v="US-50 (+24 mi, −71 min)" mono />
        <Row k="SHP-482921 · Carson" v="Hold 30 min · re-eval" mono />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-[#e5e7eb] p-2">
          <div className="font-serif text-lg text-[#1a1a2e]">3</div>
          <div className="text-[10px] text-[#1a1a2e]/50">Shipments</div>
        </div>
        <div className="rounded-md border border-[#e5e7eb] p-2">
          <div className="font-serif text-lg text-[#1a1a2e]">2h 19m</div>
          <div className="text-[10px] text-[#1a1a2e]/50">Time saved</div>
        </div>
        <div className="rounded-md border border-[#e5e7eb] p-2">
          <div className="font-serif text-lg text-[#1a1a2e]">₹34,200</div>
          <div className="text-[10px] text-[#1a1a2e]/50">Cost avoided</div>
        </div>
      </div>
      <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-[10px] text-[#1a1a2e]/40">
        <span>Applied 12:04 PM</span><span className="font-serif italic">— by Lanework agent</span>
      </div>
    </CardShell>
  );
}

function InvoiceCard({ id, amount, customer }: { id: string; amount: string; customer: string }) {
  return (
    <CardShell title="INVOICE" badge={{ label: "Sent", tone: "green" }} minHeight={180}>
      <div className="mt-4">
        <div className="text-[11px] text-[#1a1a2e]/50">Invoice</div>
        <div className="mt-0.5 font-mono text-sm text-[#1a1a2e]">{id}</div>
        <div className="mt-3 space-y-1">
          <Row k="Customer" v={customer} /><Row k="Shipments" v="4" /><Row k="Amount" v={amount} />
        </div>
      </div>
    </CardShell>
  );
}

function HeroMock() {
  return (
    <div className="relative mx-auto mt-20 max-w-6xl">
      <div className="absolute inset-x-0 -top-8 bottom-0 -z-10 opacity-60"
        style={{ backgroundImage: "radial-gradient(rgba(26,26,46,0.08) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="grid grid-cols-12 gap-4">
        <ShipmentCard />
        <AgentCard />
        <div className="col-span-3 space-y-4">
          <InvoiceCard id="INV-10238" amount="₹4,00,060" customer="Northbound Co." />
          <InvoiceCard id="INV-10239" amount="₹1,92,180" customer="Cargo/Co" />
        </div>
      </div>
    </div>
  );
}

/* ===== Hero ===== */
function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)" }}>
      <Announce />
      <Nav />
      <div className="mx-auto max-w-7xl px-6 pb-32 pt-16 text-center">
        <p className="text-sm text-[#1a1a2e]/70">The agentic operating system for logistics</p>
        <h1 className="mx-auto mt-6 max-w-5xl text-5xl leading-[1.05] text-[#1a1a2e] md:text-7xl">
          Your logistics operation,<br />
          <em className="italic text-[#1a1a2e]/90">running itself.</em>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg text-[#1a1a2e]/70">
          Lanework is a team of AI agents that track shipments, manage inventory, optimize routes,
          and handle the thousand small decisions your ops team makes every day — plugged into the
          systems you already use.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#1a1a2e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#demo" className="inline-flex items-center gap-2 rounded-full border border-[#1a1a2e]/20 px-5 py-2.5 text-sm font-medium text-[#1a1a2e] hover:bg-[#1a1a2e]/5">
            <Play className="h-3.5 w-3.5" /> Book a Demo
          </a>
        </div>
        <p className="mt-5 text-sm text-[#1a1a2e]/55">
          No rip-and-replace. Works alongside your existing TMS, WMS, and ERP. No credit card required to start.
        </p>
        <HeroMock />
      </div>
    </section>
  );
}

/* ===== Section Wrapper ===== */
function Section({ id, eyebrow, title, subtitle, children, center }: {
  id?: string; eyebrow?: string; title: React.ReactNode; subtitle?: string;
  children?: React.ReactNode; center?: boolean;
}) {
  return (
    <section id={id} className="border-t border-[#e5e7eb]/60 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-28">
        <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
          {eyebrow && <p className="text-sm text-[#1a1a2e]/60">{eyebrow}</p>}
          <h2 className="mt-4 text-4xl leading-[1.1] text-[#1a1a2e] md:text-5xl">{title}</h2>
          {subtitle && <p className="mt-5 text-lg text-[#1a1a2e]/65">{subtitle}</p>}
        </div>
        {children && <div className="mt-16">{children}</div>}
      </div>
    </section>
  );
}

/* ===== Problem ===== */
function Problem() {
  const pains = [
    { h: "Reactive, not proactive", p: "You find out about delays after the customer complains." },
    { h: "Fragmented systems", p: "Tracking, inventory, and routing data live in tools that don't talk to each other." },
    { h: "Manual busywork", p: "Your best people spend their day on status checks instead of exceptions that need real judgment." },
  ];
  return (
    <Section title={<>Logistics runs on a thousand<br />manual decisions a day.</>}
      subtitle="Where's this shipment? Do we have enough stock? Is this route still the fastest one? Right now, someone on your team is answering these questions manually — one spreadsheet, one phone call, one tracking portal at a time.">
      <div className="grid gap-6 md:grid-cols-3">
        {pains.map((p) => (
          <div key={p.h} className="rounded-2xl border border-[#e5e7eb] bg-white p-8">
            <div className="h-8 w-8 rounded-md bg-[#1a1a2e]/90" />
            <h3 className="mt-6 text-xl text-[#1a1a2e]">{p.h}</h3>
            <p className="mt-2 text-[#1a1a2e]/65">{p.p}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ===== Solution ===== */
function Solution() {
  const cols = [
    { h: "Autonomous", p: "Agents act on their own for the decisions you trust them with." },
    { h: "Transparent", p: "Every action comes with a plain-English reason, logged and auditable." },
    { h: "Configurable", p: "You decide what's auto-approved and what waits for a human." },
  ];
  return (
    <Section id="product" eyebrow="The Lanework approach"
      title={<>Meet your <em className="italic">agentic workforce.</em></>}
      subtitle="Six specialized AI agents work in the background of your operation — watching for problems, making low-risk decisions automatically, and flagging anything that needs your call.">
      <div className="grid gap-10 md:grid-cols-3">
        {cols.map((c) => (
          <div key={c.h}>
            <div className="text-sm font-medium tracking-widest text-[#1a1a2e]/50">— {c.h.toUpperCase()}</div>
            <h3 className="mt-3 text-2xl text-[#1a1a2e]">{c.h}</h3>
            <p className="mt-3 text-[#1a1a2e]/65">{c.p}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ===== Agents ===== */
function Agents() {
  const agents = [
    { Icon: Truck, h: "Shipment Tracking", p: "One live timeline across every carrier, with proactive delay alerts." },
    { Icon: Package, h: "Inventory Management", p: "Never get caught by a stockout or an overstock again." },
    { Icon: RouteIcon, h: "Route Optimization", p: "Routes that adapt in real time to traffic, weather, and new orders." },
    { Icon: Warehouse, h: "Warehouse Operations", p: "Smarter pick paths, task assignment, and dock scheduling." },
    { Icon: Users, h: "Fleet & Driver Management", p: "Compliance and maintenance tracked automatically, before they become problems." },
    { Icon: MessageSquare, h: "Customer Communication", p: "Instant answers to 'where's my order,' so your team doesn't have to." },
  ];
  return (
    <Section id="agents"
      title={<>Six agents. <em className="italic">One operating system.</em></>}
      subtitle="Each one does a specific job well — and they talk to each other.">
      <div className="grid gap-px overflow-hidden rounded-3xl border border-[#e5e7eb] bg-[#e5e7eb] md:grid-cols-3">
        {agents.map(({ Icon, h, p }) => (
          <div key={h} className="group bg-white p-8 transition-colors hover:bg-[#f3f4f6]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a2e] text-white">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-6 text-xl text-[#1a1a2e]">{h}</h3>
            <p className="mt-2 text-[#1a1a2e]/65">{p}</p>
            <div className="mt-6 inline-flex items-center gap-1 text-sm text-[#1a1a2e]/60 group-hover:text-[#1a1a2e]">
              Learn more <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ===== How It Works ===== */
function HowItWorks() {
  const steps = [
    { Icon: Plug, k: "01", h: "Connect", p: "Plug into your existing TMS, WMS, ERP, and carrier accounts. No migration required." },
    { Icon: Sliders, k: "02", h: "Configure", p: "Choose which decisions each agent can make on its own, and which ones come to your team." },
    { Icon: Play, k: "03", h: "Operate", p: "Agents start working immediately — watching, deciding, and notifying." },
  ];
  return (
    <Section id="how-it-works" title={<>Up and running in <em className="italic">three steps.</em></>}>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map(({ Icon, k, h, p }) => (
          <div key={k} className="rounded-2xl border border-[#e5e7eb] bg-white p-8">
            <div className="flex items-center justify-between">
              <span className="font-serif text-3xl text-[#1a1a2e]/40">{k}</span>
              <Icon className="h-5 w-5 text-[#1a1a2e]/70" />
            </div>
            <h3 className="mt-8 text-2xl text-[#1a1a2e]">{h}</h3>
            <p className="mt-3 text-[#1a1a2e]/65">{p}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ===== Interfaces (Dashboard + Chat) ===== */
function Interfaces() {
  return (
    <Section title={<>However your team works, <em className="italic">they're covered.</em></>}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Dashboard Preview */}
        <div className="rounded-3xl border border-[#e5e7eb] p-10" style={{ background: "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)" }}>
          <div className="text-sm font-medium tracking-widest text-[#1a1a2e]/50">DASHBOARD</div>
          <h3 className="mt-3 text-3xl text-[#1a1a2e]">A live view of the entire operation.</h3>
          <p className="mt-3 text-[#1a1a2e]/65">Every agent, every pending approval, every exception — in one place.</p>
          <div className="mt-8 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/15" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/15" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#1a1a2e]/15" />
              </div>
              <div className="text-[10px] font-medium tracking-widest text-[#1a1a2e]/40">OPERATIONS · TODAY</div>
            </div>
            <div className="grid grid-cols-3 gap-px bg-[#e5e7eb]">
              {[{ k: "Active shipments", v: "1,284" }, { k: "Pending approvals", v: "7" }, { k: "Exceptions", v: "3" }].map((s) => (
                <div key={s.k} className="bg-white p-3">
                  <div className="font-serif text-xl text-[#1a1a2e]">{s.v}</div>
                  <div className="text-[10px] text-[#1a1a2e]/50">{s.k}</div>
                </div>
              ))}
            </div>
            <div className="divide-y divide-[#e5e7eb]">
              {[
                { agent: "Route Optimization", msg: "Reroute 3 shipments · I-80 closure", dot: "bg-amber-400", tag: "Needs approval", tagColor: "bg-amber-100 text-amber-700" },
                { agent: "Inventory", msg: "SKU-4821 reorder point hit at DC-West", dot: "bg-sky-400", tag: "Auto", tagColor: "bg-sky-100 text-sky-700" },
                { agent: "Shipment Tracking", msg: "SHP-482913 delay predicted · +47 min", dot: "bg-amber-400", tag: "Alert", tagColor: "bg-amber-100 text-amber-700" },
                { agent: "Customer Comms", msg: "Replied to 14 'where is my order' asks", dot: "bg-emerald-400", tag: "Done", tagColor: "bg-emerald-100 text-emerald-700" },
              ].map((r) => (
                <div key={r.msg} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`h-1.5 w-1.5 flex-none rounded-full ${r.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-[#1a1a2e]/50">{r.agent}</div>
                    <div className="truncate text-xs text-[#1a1a2e]">{r.msg}</div>
                  </div>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${r.tagColor}`}>{r.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Copilot */}
        <div className="rounded-3xl border border-[#e5e7eb] bg-white p-10">
          <div className="text-sm font-medium tracking-widest text-[#1a1a2e]/50">CHAT COPILOT</div>
          <h3 className="mt-3 text-3xl text-[#1a1a2e]">Ask in plain language.</h3>
          <p className="mt-3 text-[#1a1a2e]/65">"Where's order 4521?" — answered instantly, with the reasoning.</p>
          <div className="mt-8 space-y-3">
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-[#1a1a2e] px-4 py-3 text-sm text-white">Where is order 4521?</div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-[#e5e7eb] bg-[#f3f4f6] px-4 py-3 text-sm text-[#1a1a2e]">
              Out for delivery — ETA 3:42 PM. Currently 4 stops away in Oakland. Driver on schedule.
            </div>
            <div className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm bg-[#1a1a2e] px-4 py-3 text-sm text-white">Any risk of delay?</div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-[#e5e7eb] bg-[#f3f4f6] px-4 py-3 text-sm text-[#1a1a2e]">Low. Traffic is clear on the remaining route.</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ===== Trust ===== */
function Trust() {
  const bullets = [
    "Full audit trail on every autonomous action",
    "Configurable approval thresholds per agent",
    "Tenant-isolated data — never shared across customers",
    "Human override, always available",
  ];
  return (
    <Section title={<>You're always <em className="italic">in control.</em></>}
      subtitle="Every agent decision is logged with a full reasoning trace — what it saw, what it decided, and why. Set trust levels per agent, per action type.">
      <div className="grid gap-4 md:grid-cols-2">
        {bullets.map((b) => (
          <div key={b} className="flex items-start gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-6">
            <div className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-[#1a1a2e] text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <p className="text-[#1a1a2e]">{b}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ===== Dev API ===== */
function DevApi() {
  return (
    <Section title={<>Built to plug into <em className="italic">what you already run.</em></>}
      subtitle="A full API lets your team wire Lanework's agents directly into your existing TMS, WMS, or ERP.">
      <div className="grid items-center gap-8 rounded-3xl border border-[#e5e7eb] bg-[#1a1a2e] p-10 md:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            <Code2 className="h-3.5 w-3.5" /> API
          </div>
          <h3 className="mt-4 text-3xl text-white">A developer surface as thoughtful as the product.</h3>
          <a href="#" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#1a1a2e]">
            View API Docs <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-black/40 p-6 text-xs leading-relaxed text-white/90">
{`POST /v1/shipments/subscribe
{
  "carrier": "fedex",
  "tracking_id": "794…"
}

// event
{
  "agent": "shipment_tracking",
  "event": "delay.predicted",
  "reason": "Weather + upstream hub congestion",
  "eta_shift_min": 47
}`}</pre>
      </div>
    </Section>
  );
}

/* ===== Pricing ===== */
function Pricing() {
  const tiers = [
    { name: "Starter", price: "₹24,999", per: "/mo", desc: "3 agents of your choice", quota: "5,000 tracked shipments / mo", cta: "Start Free Trial" },
    { name: "Growth", price: "₹83,299", per: "/mo", desc: "All 6 agents", quota: "25,000 tracked shipments / mo", cta: "Start Free Trial", featured: true },
    { name: "Scale", price: "₹2,49,999", per: "/mo", desc: "All 6 agents", quota: "50,000 tracked shipments / mo", cta: "Start Free Trial" },
    { name: "Enterprise", price: "Custom", per: "", desc: "All 6 agents, custom limits, SSO, dedicated support, custom SLAs", quota: "Volume pricing", cta: "Talk to Sales" },
  ];
  return (
    <Section id="pricing" title={<>Simple pricing that <em className="italic">scales with you.</em></>}
      subtitle="Every plan includes a usage allowance. Pay only for what you go over.">
      <div className="grid gap-4 md:grid-cols-4">
        {tiers.map((t) => (
          <div key={t.name} className={`flex flex-col rounded-2xl border p-7 ${t.featured ? "border-[#1a1a2e] bg-[#1a1a2e] text-white" : "border-[#e5e7eb] bg-white text-[#1a1a2e]"}`}>
            <div className={t.featured ? "text-sm text-white/70" : "text-sm text-[#1a1a2e]/60"}>{t.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-serif text-4xl">{t.price}</span>
              <span className={t.featured ? "text-white/60" : "text-[#1a1a2e]/50"}>{t.per}</span>
            </div>
            <p className={`mt-4 text-sm ${t.featured ? "text-white/80" : "text-[#1a1a2e]/70"}`}>{t.desc}</p>
            <p className={`mt-2 text-xs ${t.featured ? "text-white/60" : "text-[#1a1a2e]/55"}`}>{t.quota}</p>
            <a href={t.name === "Enterprise" ? "#" : "/register"}
              className={`mt-8 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium ${t.featured ? "bg-white text-[#1a1a2e] hover:bg-white/90" : "bg-[#1a1a2e] text-white hover:bg-[#1a1a2e]/90"}`}>
              {t.cta}
            </a>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-[#1a1a2e]/60">Need more shipments? Overage billed simply per shipment beyond your plan's allowance.</p>
      <p className="mt-2 text-center text-xs text-[#1a1a2e]/50">14-day free trial, no credit card required. Cancel anytime.</p>
    </Section>
  );
}

/* ===== Social Proof ===== */
function SocialProof() {
  return (
    <Section center title={<>Trusted by logistics teams who'd rather ship than <em className="italic">babysit spreadsheets.</em></>}>
      <div className="mx-auto grid max-w-4xl grid-cols-2 items-center gap-8 opacity-60 md:grid-cols-5">
        {["NORTHBOUND", "CARGO/CO", "MERIDIAN", "PORTSIDE", "FLEETWORKS"].map((n) => (
          <div key={n} className="text-center text-sm font-semibold tracking-widest text-[#1a1a2e]/50">{n}</div>
        ))}
      </div>
    </Section>
  );
}

/* ===== FAQ ===== */
function FAQ() {
  const faqs = [
    { q: "Does this replace our TMS/WMS/ERP?", a: "No. Lanework runs alongside them — reading events, sending recommendations, and executing approved actions through the systems you already use." },
    { q: "How long does setup take?", a: "Most teams are connected and running their first agent within a day. Full rollout depends on how many systems you connect." },
    { q: "What happens if an agent gets something wrong?", a: "Every decision is logged with a reasoning trace. You can review, reverse, and tighten the rules that agent operates under." },
    { q: "Can we control which decisions are automated vs. reviewed?", a: "Yes. Set per-agent, per-action approval thresholds. Anything above threshold routes to a human." },
    { q: "Is our data shared with other customers?", a: "Never. Data is tenant-isolated and never used to train shared models." },
    { q: "What counts toward my usage allowance?", a: "Tracked shipments in the billing month. Other agent actions are included at no extra cost within reasonable use." },
    { q: "Can I change plans later?", a: "Yes, upgrade or downgrade at any time. Changes take effect on your next billing cycle." },
    { q: "Is there a contract, or can I cancel anytime?", a: "Month-to-month on Starter, Growth, and Scale. Cancel anytime." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section title={<>Frequently asked <em className="italic">questions.</em></>}>
      <div className="mx-auto max-w-3xl divide-y divide-[#e5e7eb] rounded-2xl border border-[#e5e7eb] bg-white">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <button key={f.q} onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-start justify-between gap-6 px-6 py-5 text-left">
              <div className="flex-1">
                <div className="font-medium text-[#1a1a2e]">{f.q}</div>
                {isOpen && <p className="mt-3 text-[#1a1a2e]/65">{f.a}</p>}
              </div>
              <div className="mt-1 flex-none text-[#1a1a2e]/50">{isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/* ===== Final CTA ===== */
function FinalCTA() {
  return (
    <section id="trial" className="border-t border-[#e5e7eb]/60" style={{ background: "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)" }}>
      <div className="mx-auto max-w-4xl px-6 py-32 text-center">
        <h2 className="text-5xl leading-[1.1] text-[#1a1a2e] md:text-6xl">
          Stop chasing shipments.<br />
          <em className="italic">Start running your operation.</em>
        </h2>
        <p className="mt-6 text-lg text-[#1a1a2e]/65">Try Lanework free for 14 days — no credit card required.</p>
        <div className="mt-8 flex justify-center">
          <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ===== Footer ===== */
function Footer() {
  const cols = [
    { h: "Product", items: ["Agents", "How it Works", "Pricing"] },
    { h: "Company", items: ["About", "Contact"] },
    { h: "Resources", items: ["Docs", "API"] },
    { h: "Legal", items: ["Privacy", "Terms"] },
  ];
  return (
    <footer className="border-t border-[#e5e7eb] bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-[#1a1a2e]/60">The agentic operating system for logistics.</p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-sm font-medium text-[#1a1a2e]">{c.h}</div>
              <ul className="mt-4 space-y-2 text-sm text-[#1a1a2e]/60">
                {c.items.map((it) => <li key={it}><a href="#" className="hover:text-[#1a1a2e]">{it}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#e5e7eb] pt-6 text-xs text-[#1a1a2e]/50">
          <span>© {new Date().getFullYear()} Lanework, Inc.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[#1a1a2e]">Twitter</a>
            <a href="#" className="hover:text-[#1a1a2e]">LinkedIn</a>
            <a href="#" className="hover:text-[#1a1a2e]">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ===== Main Export ===== */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-[#1a1a2e]">
      <Hero />
      <Problem />
      <Solution />
      <Agents />
      <HowItWorks />
      <Interfaces />
      <Trust />
      <DevApi />
      <Pricing />
      <SocialProof />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
