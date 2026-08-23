"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Truck, Globe, Bell, Clock, FileCheck, BarChart3, Zap, Shield } from "lucide-react";
import { AgentLiveActivity } from "@/components/ui/agent-live-activity";

export default function ShipmentTrackingPage() {
  return (
    <main className="min-h-screen bg-white text-[#1a1a2e]">
      <header className="sticky top-0 z-40 border-b border-[#e5e7eb]/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-[#1a1a2e]"><div className="h-3 w-3 rounded-sm bg-[#93c5fd]" style={{transform:"rotate(45deg)"}} /></div>
            <span className="text-lg font-semibold">Lanework</span>
          </Link>
          <Link href="/register" className="rounded-full bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">Start Free <ArrowRight className="inline h-3.5 w-3.5 ml-1" /></Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/#agents" className="inline-flex items-center gap-1 text-sm text-[#1a1a2e]/60 hover:text-[#1a1a2e] mb-8"><ArrowLeft className="h-4 w-4" /> All agents</Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a1a2e] text-white"><Truck className="h-8 w-8" /></div>
          <div>
            <h1 className="text-4xl font-semibold">Shipment Tracking Agent</h1>
            <p className="mt-1 text-[#1a1a2e]/60">Never ask &ldquo;where&rsquo;s my shipment&rdquo; again.</p>
          </div>
        </div>

        <section className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-semibold mt-10">What it does</h2>
          <p className="text-[#1a1a2e]/70 leading-relaxed">The Shipment Tracking agent watches every active shipment across every carrier you use — FedEx, BlueDart, Delhivery, DTDC, and more. It pulls live tracking data, predicts delays before they happen, and alerts both your team and your customers automatically. No more logging into five carrier portals and copy-pasting tracking numbers.</p>

          <h2 className="text-2xl font-semibold mt-10">Why you need it</h2>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            {[
              { Icon: Bell, title: "Proactive delay alerts", desc: "Detects weather, traffic, and hub congestion patterns to predict delays 30-90 minutes before carrier updates." },
              { Icon: Globe, title: "Unified multi-carrier view", desc: "One timeline for shipments across FedEx, BlueDart, Delhivery, DTDC, and 20+ carriers — no portal hopping." },
              { Icon: Clock, title: "Real-time ETA updates", desc: "Continuous recalculation of delivery windows based on last-mile progress and traffic conditions." },
              { Icon: FileCheck, title: "Automated proof of delivery", desc: "Captures and stores POD documents, signatures, and photos. Auto-matches against delivery records." },
            ].map(({Icon, title, desc}) => (
              <div key={title} className="flex gap-3 p-4 rounded-xl border border-[#e5e7eb]">
                <Icon className="h-5 w-5 text-[#1a1a2e] mt-0.5 flex-shrink-0" />
                <div><div className="font-medium text-sm">{title}</div><div className="text-xs text-[#1a1a2e]/60 mt-1">{desc}</div></div>
              </div>
            ))}
          </div>

          <h2 className="text-2xl font-semibold mt-10">How it works</h2>
          <div className="space-y-4 mt-4">
            {[
              { step: "1", title: "Connect your carriers", desc: "Link your FedEx, BlueDart, Delhivery, and other carrier accounts through our integrations page. One-time setup, instant sync." },
              { step: "2", title: "Agent auto-subscribes to tracking events", desc: "Every new shipment gets auto-registered. The agent polls carrier APIs, webhooks, and public tracking endpoints for live updates." },
              { step: "3", title: "Pattern detection kicks in", desc: "The AI model analyzes historical data, weather feeds, traffic APIs, and hub congestion patterns to predict delays." },
              { step: "4", title: "Alerts reach the right people", desc: "Your ops team gets Slack/email alerts for exceptions. Customers get automated tracking updates via their preferred channel." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 p-5 rounded-xl border border-[#e5e7eb] bg-white">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1a1a2e] text-white text-sm font-semibold">{step}</div>
                <div><div className="font-medium">{title}</div><div className="text-sm text-[#1a1a2e]/60 mt-1">{desc}</div></div>
              </div>
            ))}
          </div>

          <AgentLiveActivity agentId="shipment-tracking" />

          <h2 className="text-2xl font-semibold mt-10">Trust &amp; control</h2>
          <div className="flex items-start gap-4 p-5 rounded-xl bg-[#fafafa] border border-[#e5e7eb] mt-4">
            <Shield className="h-5 w-5 text-[#1a1a2e] mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#1a1a2e]/70 leading-relaxed">
              <span className="font-medium text-[#1a1a2e]">You decide the autonomy level.</span> Set the agent to &ldquo;propose only&rdquo; (you approve every alert), &ldquo;auto-execute low-risk&rdquo; (auto-notify for standard delays), or &ldquo;fully autonomous&rdquo; (let it handle everything within limits you set). Every action is logged with a full reasoning trace.
            </div>
          </div>

          <div className="mt-12 flex gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">Start Free <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/#agents" className="inline-flex items-center gap-2 rounded-full border border-[#1a1a2e]/20 px-6 py-3 text-sm font-medium text-[#1a1a2e] hover:bg-[#1a1a2e]/5">Explore other agents <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
