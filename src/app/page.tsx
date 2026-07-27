"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight, Truck, Package, Route as RouteIcon, Warehouse, Users, MessageSquare,
  Plug, Sliders, Play, ShieldCheck, Code2, Minus, Plus, Wifi, ChevronDown,
  BookOpen, FileText, LifeBuoy, ExternalLink, Cpu, Bot, CreditCard, HelpCircle, Globe
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
  const [hovered, setHovered] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (key: string) => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setHovered(key);
  };
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setHovered(null), 200);
  };

  const menuData: Record<string, { label: string; href: string; desc: string }[]> = {
    Product: [
      { label: "Shipment Tracking", href: "/agents/shipment-tracking", desc: "Multi-carrier tracking with delay prediction" },
      { label: "Inventory Management", href: "/agents/inventory-management", desc: "Auto reorder & demand forecasting" },
      { label: "Route Optimization", href: "/agents/route-optimization", desc: "Real-time rerouting & fuel savings" },
      { label: "Warehouse Ops", href: "/agents/warehouse-operations", desc: "Pick paths, docks & task assignment" },
      { label: "Fleet Management", href: "/agents/fleet-management", desc: "Maintenance, compliance & telematics" },
      { label: "Customer Comms", href: "/agents/customer-communication", desc: "Auto-reply, sentiment routing & more" },
    ],
    Agents: [
      { label: "How Agents Work", href: "/how-it-works", desc: "Autonomous, transparent, configurable AI" },
      { label: "Trust & Safety", href: "/trust", desc: "Audit trails, approval thresholds, data isolation" },
      { label: "Integrations", href: "/integrations", desc: "TMS, WMS, ERP, WhatsApp, carriers" },
      { label: "Copilot", href: "/voice", desc: "Voice & chat AI assistant for logistics" },
    ],
    "How it Works": [
      { label: "Quick Start Guide", href: "/how-it-works", desc: "Connect, configure, operate in 3 steps" },
      { label: "Onboarding", href: "/onboarding", desc: "Set up your org in under 5 minutes" },
      { label: "Case Studies", href: "/how-it-works", desc: "How logistics teams use Lanework" },
    ],
    Pricing: [
      { label: "Plans", href: "/pricing", desc: "Starter, Growth, Scale, Enterprise" },
      { label: "FAQ", href: "/#faq", desc: "Common questions about billing & usage" },
    ],
    Docs: [
      { label: "API Reference", href: "/docs", desc: "REST API for developers" },
      { label: "Integration Guides", href: "/docs", desc: "Connect your TMS, WMS, carriers" },
      { label: "Help Center", href: "/docs", desc: "Tutorials & troubleshooting" },
    ],
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="hidden items-center rounded-full border border-[#e5e7eb]/70 bg-white/70 px-6 py-2.5 text-sm text-[#1a1a2e]/80 shadow-sm backdrop-blur md:flex"
          onMouseLeave={handleLeave}>
          {Object.keys(menuData).map((key) => {
            const isSpan = key === "Product" || key === "Agents";
            const parentHref = key === "Product" ? null : key === "Agents" ? null : key === "How it Works" ? "/how-it-works" : key === "Docs" ? "/docs" : "/pricing";
            return (
            <div key={key} className="relative" onMouseEnter={() => handleEnter(key)}>
              {isSpan ? (
              <span
                onClick={() => {
                  const id = key === "Product" ? "product" : "agents";
                  const el = document.getElementById(id);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex items-center gap-1 px-3 py-1.5 hover:text-[#1a1a2e] transition-colors whitespace-nowrap cursor-pointer">
                {key}
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${hovered === key ? "rotate-180" : ""}`} />
              </span>
              ) : (
              <Link href={parentHref!}
                className="flex items-center gap-1 px-3 py-1.5 hover:text-[#1a1a2e] transition-colors whitespace-nowrap">
                {key}
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${hovered === key ? "rotate-180" : ""}`} />
              </Link>
              )}
              {hovered === key && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2"
                  onMouseEnter={() => handleEnter(key)}>
                  <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-lg p-2 min-w-[280px]">
                    {menuData[key].map((item) => (
                      <a key={item.label} href={item.href}
                        className="flex flex-col gap-0.5 px-4 py-2.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
                        <span className="text-sm font-medium text-[#1a1a2e]">{item.label}</span>
                        <span className="text-xs text-[#1a1a2e]/50">{item.desc}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            );
          })}
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
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(72);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setProgress(p => p >= 100 ? 68 : p + 1);
      setPulse(p => !p);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <CardShell className="col-span-3 mt-16" title="SHIPMENT" badge={{ label: "In transit", tone: "blue" }} minHeight={220}>
      <div className="mt-4">
        <div className="text-[11px] text-[#1a1a2e]/50">Tracking</div>
        <div className="mt-0.5 font-mono text-sm text-[#1a1a2e]">
          SHP-482913
          {mounted && (
            <>
              <span className={`ml-2 inline-block h-1.5 w-1.5 rounded-full ${pulse ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-emerald-300"}`} />
              <span className="ml-1 text-[10px] text-emerald-600 font-medium">LIVE</span>
            </>
          )}
        </div>
        <div className="mt-3 space-y-1">
          <Row k="From" v="Oakland, CA" /><Row k="To" v="Reno, NV" />
          <Row k="Carrier" v="FedEx Freight" /><Row k="ETA" v="Today, 3:42 PM" />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-[#1a1a2e]/50">
            <span>Picked up</span><span suppressHydrationWarning>Out for delivery</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[#1a1a2e]/5">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all duration-[3000ms] ease-linear"
              style={{ width: `${mounted ? Math.min(progress, 100) : 72}%` }} />
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function AgentCard() {
  const [mounted, setMounted] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const events = [
    "Rerouting 3 shipments around I-80 closure near Truckee",
    "SKU-4821 reorder point hit at DC-West — generating PO",
    "SHP-482913 delay predicted: +47 min — upstream hub congestion",
    "INV-10238 auto-generated for Northbound Co.",
  ];

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setCurrentEvent(i => (i + 1) % events.length);
      setDisplayText("");
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const text = events[currentEvent];
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setDisplayText(text.slice(0, idx));
      if (idx >= text.length) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [currentEvent, mounted]);

  return (
    <CardShell className="col-span-6" title="AGENT · Active Monitoring" badge={{ label: "Auto-executing", tone: "green" }} minHeight={380}>
      <div className="mt-4">
        {mounted && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 border border-emerald-200">
              <Wifi className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-medium text-emerald-700">Streaming live</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 border border-amber-200">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-medium text-amber-700">{events.length} events today</span>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-[#fafafa] border border-[#e5e7eb] p-4">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a1a2e]">
              <div className="h-2 w-2 rounded-sm bg-[#93c5fd]" style={{ transform: "rotate(45deg)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[12px] leading-relaxed text-[#1a1a2e]">
                {displayText || events[currentEvent]}
                {mounted && displayText !== events[currentEvent] && (
                  <span className="inline-block w-1.5 h-3.5 bg-[#1a1a2e] ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-md bg-[#f3f0ff]/30 p-3 text-[11px] text-[#1a1a2e]/70">
          <span className="font-medium text-[#1a1a2e]">Reasoning:</span> All 3 reroutes auto-approved. Cost impact under threshold. No human review needed.
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-[#e5e7eb] p-2">
          <div className="font-serif text-lg text-[#1a1a2e]" suppressHydrationWarning>3</div>
          <div className="text-[10px] text-[#1a1a2e]/50">Shipments</div>
        </div>
        <div className="rounded-md border border-[#e5e7eb] p-2">
          <div className="font-serif text-lg text-[#1a1a2e]" suppressHydrationWarning>2h 19m</div>
          <div className="text-[10px] text-[#1a1a2e]/50">Time saved</div>
        </div>
        <div className="rounded-md border border-[#e5e7eb] p-2">
          <div className="font-serif text-lg text-[#1a1a2e]" suppressHydrationWarning>₹34,200</div>
          <div className="text-[10px] text-[#1a1a2e]/50">Cost avoided</div>
        </div>
      </div>
      <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-[10px] text-[#1a1a2e]/40">
        <span suppressHydrationWarning>Last sync: just now</span><span className="font-serif italic">— by Lanework agent</span>
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
/* ===== Typewriter Hook ===== */
function useTypewriter(texts: string[], speed = 70, pauseMs = 3000) {
  const [displayed, setDisplayed] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const text = texts[textIndex];

    if (!deleting && charIndex <= text.length) {
      const t = setTimeout(() => setCharIndex(c => c + 1), charIndex === 0 ? 400 : speed);
      return () => clearTimeout(t);
    }

    if (!deleting && charIndex > text.length) {
      const t = setTimeout(() => setDeleting(texts.length > 1), pauseMs);
      return () => clearTimeout(t);
    }

    if (deleting && charIndex > 0) {
      const t = setTimeout(() => setCharIndex(c => c - 1), speed / 2);
      return () => clearTimeout(t);
    }

    if (deleting && charIndex === 0) {
      setDeleting(false);
      setTextIndex(i => (i + 1) % texts.length);
    }
  }, [charIndex, deleting, textIndex, texts, speed, pauseMs, mounted]);

  return { text: texts[textIndex].substring(0, charIndex), showCursor: mounted };
}

function Hero() {
  const { text: typedTitle, showCursor } = useTypewriter(["running itself."], 80, 100000);

  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)" }}>
      <Announce />
      <Nav />
      <div className="mx-auto max-w-7xl px-6 pb-32 pt-16 text-center">
        <p className="text-sm text-[#1a1a2e]/70 animate-fade-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>The agentic operating system for logistics</p>
        <h1 className="mx-auto mt-6 max-w-5xl text-5xl leading-[1.05] text-[#1a1a2e] md:text-7xl">
          <span className="animate-fade-in" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>Your logistics operation,</span><br />
          <span className="text-[#1a1a2e]/90 inline-flex items-baseline">
            <em className="italic">{typedTitle}</em>
            {showCursor && <span className="ml-1 inline-block w-[3px] h-[0.8em] bg-[#1a1a2e]/60 animate-pulse align-middle" />}
          </span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg text-[#1a1a2e]/70 animate-fade-in" style={{ animationDelay: "1.6s", animationFillMode: "both" }}>
          Lanework is a team of AI agents that track shipments, manage inventory, optimize routes,
          and handle the thousand small decisions your ops team makes every day — plugged into the
          systems you already use.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "2.0s", animationFillMode: "both" }}>
          <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#1a1a2e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#demo" className="inline-flex items-center gap-2 rounded-full border border-[#1a1a2e]/20 px-5 py-2.5 text-sm font-medium text-[#1a1a2e] hover:bg-[#1a1a2e]/5">
            <Play className="h-3.5 w-3.5" /> Book a Demo
          </a>
        </div>
        <p className="mt-5 text-sm text-[#1a1a2e]/55 animate-fade-in" style={{ animationDelay: "2.2s", animationFillMode: "both" }}>
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
    {
      id: "shipment-tracking",
      Icon: Truck,
      h: "Shipment Tracking",
      p: "One live timeline across every carrier, with proactive delay alerts.",
      features: ["Multi-carrier aggregation", "Real-time delay prediction", "Automated customer alerts", "Proof-of-delivery capture", "Custom status workflows"],
    },
    {
      id: "inventory-management",
      Icon: Package,
      h: "Inventory Management",
      p: "Never get caught by a stockout or an overstock again.",
      features: ["Auto reorder-point monitoring", "Multi-warehouse visibility", "Demand forecasting", "Batch & expiry tracking", "Supplier performance scoring"],
    },
    {
      id: "route-optimization",
      Icon: RouteIcon,
      h: "Route Optimization",
      p: "Routes that adapt in real time to traffic, weather, and new orders.",
      features: ["Real-time traffic rerouting", "Multi-stop optimization", "Weather-aware planning", "Fuel cost minimization", "Time-window compliance"],
    },
    {
      id: "warehouse-operations",
      Icon: Warehouse,
      h: "Warehouse Operations",
      p: "Smarter pick paths, task assignment, and dock scheduling.",
      features: ["Dynamic pick-path optimization", "Dock door scheduling", "Task auto-assignment", "Putaway strategy engine", "Cross-docking orchestration"],
    },
    {
      id: "fleet-management",
      Icon: Users,
      h: "Fleet & Driver Management",
      p: "Compliance and maintenance tracked automatically, before they become problems.",
      features: ["Preventive maintenance scheduling", "Driver hours compliance", "Vehicle telematics integration", "Fuel card reconciliation", "Incident auto-reporting"],
    },
    {
      id: "customer-communication",
      Icon: MessageSquare,
      h: "Customer Communication",
      p: "Instant answers to 'where's my order,' so your team doesn't have to.",
      features: ["Automated tracking replies", "Multi-channel (Email/SMS/WhatsApp)", "Sentiment-based escalation", "Delivery window scheduling", "Feedback collection loops"],
    },
  ];

  return (
    <Section id="agents"
      title={<>Six agents. <em className="italic">One operating system.</em></>}
      subtitle="Each one does a specific job well — and they talk to each other.">
      <div className="grid gap-px overflow-hidden rounded-3xl border border-[#e5e7eb] bg-[#e5e7eb] md:grid-cols-3">
        {agents.map(({ id, Icon, h, p, features }) => (
          <AgentCardInteractive key={id} id={id} Icon={Icon} name={h} desc={p} features={features} />
        ))}
      </div>
    </Section>
  );
}

function AgentCardInteractive({ id, Icon, name, desc, features }: {
  id: string; Icon: React.ElementType; name: string; desc: string; features: string[];
}) {
  return (
    <div className="group relative bg-white transition-all duration-300 hover:shadow-lg hover:z-10">
      <a href={`/agents/${id}`} className="block p-8 h-full">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a2e] text-white group-hover:scale-110 transition-transform duration-300">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-6 text-xl text-[#1a1a2e] group-hover:text-[#1a1a2e]">{name}</h3>
        <p className="mt-2 text-[#1a1a2e]/65">{desc}</p>

        {/* Feature list — visible on hover */}
        <div className="mt-4 space-y-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 max-h-0 group-hover:max-h-[300px] overflow-hidden">
          <div className="text-[10px] font-medium tracking-widest text-[#1a1a2e]/40 uppercase mb-2">Key Capabilities</div>
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-[#1a1a2e]/70">
              <div className="h-1 w-1 rounded-full bg-[#93c5fd] flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>

        <div className="mt-6 inline-flex items-center gap-1 text-sm text-[#1a1a2e]/60 group-hover:text-[#1a1a2e] group-hover:gap-2 transition-all">
          Learn more <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </a>
    </div>
  );
}

/* ===== How It Works ===== */
function HowItWorks() {
  const [mounted, setMounted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      Icon: Plug, k: "01", h: "Connect",
      p: "Plug into your existing TMS, WMS, ERP, and carrier accounts. No migration required.",
      bullets: ["One-click carrier linking", "Reads from your systems — doesn't replace them", "Syncs every 60 seconds", "Supports 20+ carriers & 10+ ERPs"],
    },
    {
      Icon: Sliders, k: "02", h: "Configure",
      p: "Choose which decisions each agent can make on its own, and which ones come to your team.",
      bullets: ["Per-agent trust levels (propose / auto / full)", "Spending thresholds per action type", "Custom approval workflows", "Team & role-based access control"],
    },
    {
      Icon: Play, k: "03", h: "Operate",
      p: "Agents start working immediately — watching, deciding, and notifying.",
      bullets: ["Live dashboard with streaming agent activity", "Real-time alerts via Slack, Email, WhatsApp", "One-click undo on any agent action", "Full audit trail for every decision"],
    },
  ];

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveStep(s => (s + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Section id="how-it-works" title={<>Up and running in <em className="italic">three steps.</em></>}>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map(({ Icon, k, h, p, bullets }, i) => {
          const isActive = mounted && activeStep === i;
          return (
          <div key={k}
            className={`relative rounded-2xl border p-8 transition-all duration-700 cursor-pointer
              ${isActive ? "border-[#1a1a2e] bg-[#1a1a2e] text-white shadow-xl scale-[1.03] z-10" : "border-[#e5e7eb] bg-white text-[#1a1a2e] hover:border-[#d1d5db]"}`}
            onMouseEnter={() => mounted && setActiveStep(i)}>
            <div className="flex items-center justify-between">
              <span className={`font-serif text-3xl transition-all duration-500 ${isActive ? "text-white/60" : "text-[#1a1a2e]/25"}`}>{k}</span>
              <Icon className={`h-5 w-5 transition-all duration-500 ${isActive ? "text-white" : "text-[#1a1a2e]/60"}`} />
            </div>
            {isActive && mounted && (
              <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              </div>
            )}
            <h3 className={`mt-8 text-2xl transition-all duration-500 ${isActive ? "text-white" : "text-[#1a1a2e]"}`}>{h}</h3>
            <p className={`mt-3 transition-all duration-500 ${isActive ? "text-white/80" : "text-[#1a1a2e]/65"}`}>{p}</p>

            {/* Bullets — expand on active */}
            <div className={`mt-5 space-y-2 transition-all duration-500 overflow-hidden ${isActive ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"}`}>
              {bullets.map((b, j) => (
                <div key={j} className="flex items-center gap-2 text-sm" style={{
                  animation: isActive ? `fadeIn 0.3s ease-out ${j * 0.1}s both` : "none"
                }}>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className={`text-sm ${isActive ? "text-white/90" : "text-[#1a1a2e]/70"}`}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        )})}
      </div>
    </Section>
  );
}

/* ===== Interfaces (Dashboard + Chat) ===== */
function Interfaces() {
  return (
    <Section title={<>However your team works, <em className="italic">they're covered.</em></>}>
      <div className="grid gap-6 md:grid-cols-2">
        <LiveDashboard />
        <LiveChat />
      </div>
    </Section>
  );
}

function LiveDashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rows = [
    { agent: "Route Optimization", msg: "Reroute 3 shipments · I-80 closure", dot: "bg-amber-400", tag: "Needs approval", tagColor: "bg-amber-100 text-amber-700" },
    { agent: "Inventory", msg: "SKU-4821 reorder point hit at DC-West", dot: "bg-sky-400", tag: "Auto", tagColor: "bg-sky-100 text-sky-700" },
    { agent: "Shipment Tracking", msg: "SHP-482913 delay predicted · +47 min", dot: "bg-amber-400", tag: "Alert", tagColor: "bg-amber-100 text-amber-700" },
    { agent: "Customer Comms", msg: "Replied to 14 'where is my order' asks", dot: "bg-emerald-400", tag: "Done", tagColor: "bg-emerald-100 text-emerald-700" },
  ];

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setActiveIdx(i => (i + 1) % rows.length), 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-3xl border border-[#e5e7eb] p-10" style={{ background: "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)" }}>
      <div className="text-sm font-medium tracking-widest text-[#1a1a2e]/50">DASHBOARD</div>
      <h3 className="mt-3 text-3xl text-[#1a1a2e]">A live view of the entire operation.</h3>
      <p className="mt-3 text-[#1a1a2e]/65">Every agent, every pending approval, every exception — in one place.</p>
      <div className="mt-8 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            {mounted && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            <div className="text-[10px] font-medium tracking-widest text-[#1a1a2e]/40">
              {mounted ? "LIVE" : "OPERATIONS"} · TODAY
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px bg-[#e5e7eb]">
          {[{ k: "Active shipments", v: "1,284" }, { k: "Pending approvals", v: "7" }, { k: "Exceptions", v: "3" }].map((s) => (
            <div key={s.k} className="bg-white p-3">
              <div className="font-serif text-xl text-[#1a1a2e]" suppressHydrationWarning>{s.v}</div>
              <div className="text-[10px] text-[#1a1a2e]/50">{s.k}</div>
            </div>
          ))}
        </div>
        <div className="divide-y divide-[#e5e7eb]">
          {rows.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 transition-all duration-500 ${i === activeIdx ? "bg-gray-50" : ""}`}>
              <span className={`h-1.5 w-1.5 flex-none rounded-full ${r.dot} ${mounted && i === activeIdx ? "animate-pulse" : ""}`} />
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
  );
}

function LiveChat() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(0);
  const msgs = [
    { role: "user", text: "Where is order 4521?" },
    { role: "bot", text: "Out for delivery — ETA 3:42 PM. Currently 4 stops away in Oakland." },
    { role: "user", text: "Any risk of delay?" },
    { role: "bot", text: "Low risk. Traffic is clear on the remaining route. No weather alerts." },
  ];

  useEffect(() => {
    setMounted(true);
    if (!mounted) return;
    if (visible >= msgs.length) {
      const reset = setTimeout(() => setVisible(0), 3000);
      return () => clearTimeout(reset);
    }
    const timer = setTimeout(() => setVisible(v => v + 1), 1200);
    return () => clearTimeout(timer);
  }, [visible, mounted]);

  return (
    <div className="rounded-3xl border border-[#e5e7eb] bg-white p-10">
      <div className="text-sm font-medium tracking-widest text-[#1a1a2e]/50">CHAT COPILOT</div>
      <h3 className="mt-3 text-3xl text-[#1a1a2e]">Ask in plain language.</h3>
      <p className="mt-3 text-[#1a1a2e]/65">"Where's order 4521?" — answered instantly, with the reasoning.</p>
      <div className="mt-8 space-y-3">
        {msgs.map((m, i) => {
          if (!mounted || i >= visible) return null;
          const isUser = m.role === "user";
          return (
            <div key={i} className={`${isUser ? "ml-auto max-w-[80%]" : "max-w-[85%]"}`} style={{ animation: "fadeIn 0.4s ease-out" }}>
              <div className={`rounded-2xl px-4 py-3 text-sm ${isUser ? "rounded-br-sm bg-[#1a1a2e] text-white" : "rounded-bl-sm border border-[#e5e7eb] bg-[#f3f4f6] text-[#1a1a2e]"}`}>
                {m.text}
              </div>
            </div>
          );
        })}
        {mounted && visible < msgs.length && (
          <div className="flex gap-1 px-2">
            <div className="h-2 w-2 rounded-full bg-[#d1d5db] animate-bounce" />
            <div className="h-2 w-2 rounded-full bg-[#d1d5db] animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-[#d1d5db] animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
    </div>
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
  useEffect(() => {
    // Force scroll to top when landing page mounts (fixes browser scroll restoration on back navigation)
    window.scrollTo(0, 0);
  }, []);

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
