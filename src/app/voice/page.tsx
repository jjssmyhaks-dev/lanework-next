"use client";

import Link from "next/link";
import { ArrowRight, Mic, Headphones, Zap, ShieldCheck, Globe, Clock, MessageSquare, BarChart3 } from "lucide-react";

const BETA_REGISTER_URL = "/voice/register";

export default function VoicePage() {
  return (
    <main className="min-h-screen bg-white text-[#1a1a2e]">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[#e5e7eb]/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-[#1a1a2e]">
              <div className="h-3 w-3 rounded-sm bg-[#93c5fd]" style={{ transform: "rotate(45deg)" }} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-[#1a1a2e]">Lanework</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[#1a1a2e]/70 hover:text-[#1a1a2e]">Home</Link>
            <Link href="/voice/register" className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">
              Start Free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[#e5e7eb]/60" style={{ background: "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)" }}>
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-[#1a1a2e]/5 px-4 py-1.5 text-sm text-[#1a1a2e]/70">
            <Mic className="h-3.5 w-3.5" /> Voice Copilot — Private Beta
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl leading-[1.08] text-[#1a1a2e] md:text-7xl">
            Speak to your<br />
            <em className="italic">logistics operation.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#1a1a2e]/65">
            The Lanework Voice Copilot lets you talk to your agents like a colleague. Ask about shipments,
            approve reroutes, or check inventory — hands-free, in plain English.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/voice/register" className="inline-flex items-center gap-2 rounded-full bg-[#1a1a2e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">
              Join the Beta <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-full border border-[#1a1a2e]/20 px-5 py-2.5 text-sm font-medium text-[#1a1a2e] hover:bg-[#1a1a2e]/5">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-b border-[#e5e7eb]/60 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-3xl">
            <p className="text-sm text-[#1a1a2e]/60">Capabilities</p>
            <h2 className="mt-4 text-4xl leading-[1.1] text-[#1a1a2e] md:text-5xl">
              Your voice. <em className="italic">Their intelligence.</em>
            </h2>
            <p className="mt-5 text-lg text-[#1a1a2e]/65">
              The Voice Copilot connects you to every Lanework agent through a single conversation surface. No clicks, no dashboards — just talk.
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              { Icon: MessageSquare, h: "Natural language queries", p: "\"Where's shipment SHP-482913?\" — answered instantly with live data from your carriers, not a database cache." },
              { Icon: Headphones, h: "Hands-free approvals", p: "When an agent needs your sign-off, it asks you. Say \"approved\" or \"escalate\" and it's done." },
              { Icon: Zap, h: "Multi-step actions", p: "\"Reroute all Bay Area shipments around the I-80 closure and notify the customers\" — one sentence, executed." },
              { Icon: Globe, h: "Multi-language support", p: "Speak in Hindi, English, or any major language. The copilot responds in your language, with the same accuracy." },
              { Icon: BarChart3, h: "Live context awareness", p: "The copilot knows what's happening right now — active shipments, pending approvals, stock levels — and answers from live data." },
              { Icon: Clock, h: "24/7 availability", p: "Truck broke down at 3 AM? The voice copilot is awake. Get status, trigger workflows, or wake the right person on your team." },
            ].map(({ Icon, h, p }) => (
              <div key={h} className="rounded-2xl border border-[#e5e7eb] bg-white p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a2e] text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl text-[#1a1a2e]">{h}</h3>
                <p className="mt-2 text-[#1a1a2e]/65 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-[#e5e7eb]/60 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-3xl">
            <p className="text-sm text-[#1a1a2e]/60">How it works</p>
            <h2 className="mt-4 text-4xl leading-[1.1] text-[#1a1a2e] md:text-5xl">
              From voice <em className="italic">to action.</em>
            </h2>
          </div>
          <div className="mt-16 grid gap-4 md:grid-cols-4">
            {[
              { step: "01", h: "You speak", p: "Say what you need in plain language — ask a question, give a command, or review an approval request." },
              { step: "02", h: "AI understands", p: "The copilot converts your speech to text, maps it to the right agent and action, and gathers live context." },
              { step: "03", h: "Agent executes", p: "The right Lanework agent takes action — pulling data, rerouting, or preparing a response for your approval." },
              { step: "04", h: "You hear back", p: "A clear, concise spoken response — or a follow-up question if the agent needs more from you." },
            ].map(({ step, h, p }) => (
              <div key={step} className="rounded-2xl border border-[#e5e7eb] bg-white p-6">
                <div className="font-serif text-3xl text-[#1a1a2e]/25">{step}</div>
                <h3 className="mt-4 text-lg font-semibold text-[#1a1a2e]">{h}</h3>
                <p className="mt-2 text-sm text-[#1a1a2e]/65 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & privacy */}
      <section className="border-b border-[#e5e7eb]/60 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-3xl">
            <h2 className="text-4xl leading-[1.1] text-[#1a1a2e] md:text-5xl">
              Built with <em className="italic">trust first.</em>
            </h2>
          </div>
          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {[
              { title: "No voice recordings stored", desc: "Audio is processed in real-time and discarded. We don't keep recordings of your conversations." },
              { title: "Tenant-isolated processing", desc: "Your voice data is processed in isolation. It's never mixed with other customers' data or used to train shared models." },
              { title: "Explicit confirmation for actions", desc: "The copilot always confirms before executing actions that change state — reroutes, cancellations, or customer notifications." },
              { title: "Full audit trail", desc: "Every voice-initiated action is logged with the same reasoning trace as any other agent action." },
            ].map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-6">
                <div className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-[#1a1a2e] text-white">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-medium text-[#1a1a2e]">{title}</div>
                  <p className="mt-1 text-sm text-[#1a1a2e]/65">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "linear-gradient(180deg, #fafafa 0%, #ffffff 100%)" }}>
        <div className="mx-auto max-w-4xl px-6 py-32 text-center">
          <h2 className="text-5xl leading-[1.1] text-[#1a1a2e] md:text-6xl">
            Talk to your operation.<br />
            <em className="italic">Like it's a person.</em>
          </h2>
          <p className="mt-6 text-lg text-[#1a1a2e]/65">
            The Voice Copilot is in private beta. Join the waitlist and be first in line.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/voice/register" className="inline-flex items-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">
              Join the Beta <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#1a1a2e]/20 px-6 py-3 text-sm font-medium text-[#1a1a2e] hover:bg-[#1a1a2e]/5">
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
