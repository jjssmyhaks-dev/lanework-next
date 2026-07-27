"use client";
import Link from "next/link"; import { ArrowLeft, Code2, FileText, BookOpen, ExternalLink, ArrowRight } from "lucide-react";
export default function DocsPage() {
  return (<main className="min-h-screen bg-white text-[#1a1a2e]"><header className="sticky top-0 z-40 border-b border-[#e5e7eb]/60 bg-white/80 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><Link href="/" className="flex items-center gap-2"><div className="grid h-7 w-7 place-items-center rounded-md bg-[#1a1a2e]"><div className="h-3 w-3 rounded-sm bg-[#93c5fd]" style={{transform:"rotate(45deg)"}} /></div><span className="text-lg font-semibold">Lanework</span></Link><Link href="/register" className="rounded-full bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">Start Free Trial <ArrowRight className="inline h-3.5 w-3.5 ml-1" /></Link></div></header>
  <div className="mx-auto max-w-4xl px-6 py-16"><h1 className="text-4xl font-semibold">Documentation</h1><p className="mt-3 text-[#1a1a2e]/60">Everything you need to integrate and extend Lanework.</p>
  <div className="grid gap-6 md:grid-cols-2 mt-12">
    {[{Icon:Code2,title:"API Reference",desc:"REST API endpoints for shipments, inventory, routes, fleet, and agents. Authentication via JWT bearer tokens.",href:"#api"},{Icon:FileText,title:"Integration Guides",desc:"Step-by-step walkthroughs for connecting TMS (Oracle, SAP), WMS, carriers (FedEx, BlueDart), and WhatsApp Business API.",href:"#guides"},{Icon:BookOpen,title:"Agent Configuration",desc:"How to set trust levels, approval thresholds, and custom rules for each AI agent in your workspace.",href:"#agents"},{Icon:ExternalLink,title:"Webhooks",desc:"Subscribe to real-time events: shipment delays, inventory alerts, route changes, and approval requests.",href:"#webhooks"}].map(({Icon,title,desc,href})=>(<a key={title} href={href} className="flex gap-4 p-6 rounded-xl border border-[#e5e7eb] hover:border-[#1a1a2e] hover:shadow-md transition-all"><Icon className="h-6 w-6 text-[#1a1a2e] mt-1 flex-shrink-0" /><div><div className="font-semibold">{title}</div><div className="text-sm text-[#1a1a2e]/60 mt-1">{desc}</div></div></a>))}
  </div>
  <div className="mt-12 p-8 rounded-2xl bg-[#1a1a2e] text-white"><h2 className="text-2xl font-semibold">Quick Start</h2><pre className="mt-4 bg-black/30 rounded-xl p-5 text-sm text-white/80 overflow-x-auto">{`# Install the Lanework SDK
npm install @lanework/sdk

# Initialize with your API key
import { Lanework } from '@lanework/sdk';
const lw = new Lanework({ apiKey: 'lw_sk_...' });

# Track a shipment
const shipment = await lw.shipments.track('SHP-482913');
console.log(shipment.status); // "in_transit"

# Subscribe to events
lw.on('shipment.delayed', (event) => {
  console.log(event.reason, event.eta_shift_min);
});`}</pre></div></div></main>);
}
