"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Package, BarChart3, Bell, Zap, TrendingUp, RefreshCw, Shield, Warehouse } from "lucide-react";
import { AgentLiveActivity } from "@/components/ui/agent-live-activity";

export default function InventoryManagementPage() {
  return (
    <main className="min-h-screen bg-white text-[#1a1a2e]">
      <header className="sticky top-0 z-40 border-b border-[#e5e7eb]/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2"><div className="grid h-7 w-7 place-items-center rounded-md bg-[#1a1a2e]"><div className="h-3 w-3 rounded-sm bg-[#93c5fd]" style={{transform:"rotate(45deg)"}} /></div><span className="text-lg font-semibold">Lanework</span></Link>
          <Link href="/register" className="rounded-full bg-[#1a1a2e] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">Start Free <ArrowRight className="inline h-3.5 w-3.5 ml-1" /></Link>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/#agents" className="inline-flex items-center gap-1 text-sm text-[#1a1a2e]/60 hover:text-[#1a1a2e] mb-8"><ArrowLeft className="h-4 w-4" /> All agents</Link>
        <div className="flex items-center gap-4 mb-8"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a1a2e] text-white"><Package className="h-8 w-8" /></div><div><h1 className="text-4xl font-semibold">Inventory Management Agent</h1><p className="mt-1 text-[#1a1a2e]/60">Never run out. Never overstock. Always know.</p></div></div>
        <section className="max-w-none">
          <h2 className="text-2xl font-semibold mt-10">What it does</h2>
          <p className="text-[#1a1a2e]/70 leading-relaxed">The Inventory Management agent monitors stock levels across all your warehouses in real time. It predicts when items will hit their reorder point, auto-generates purchase orders, and adjusts safety stock based on demand patterns — seasonality, promotions, and supply chain disruptions included.</p>
          <h2 className="text-2xl font-semibold mt-10">Why you need it</h2>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            {[{Icon:TrendingUp,title:"Demand forecasting",desc:"ML-powered predictions that account for seasonality, promotions, and market trends to suggest optimal stock levels."},{Icon:Bell,title:"Auto reorder alerts",desc:"Triggered days before stockout — not hours. Agent calculates order quantity based on lead time and safety stock."},{Icon:RefreshCw,title:"Multi-warehouse sync",desc:"Real-time visibility across DC-East, DC-West, and all satellite locations. Transfer recommendations between warehouses."},{Icon:BarChart3,title:"Supplier performance scoring",desc:"Tracks lead time accuracy, quality, and cost per supplier. Recommends the best supplier for each reorder."}].map(({Icon,title,desc})=>(<div key={title} className="flex gap-3 p-4 rounded-xl border border-[#e5e7eb]"><Icon className="h-5 w-5 text-[#1a1a2e] mt-0.5 flex-shrink-0" /><div><div className="font-medium text-sm">{title}</div><div className="text-xs text-[#1a1a2e]/60 mt-1">{desc}</div></div></div>))}
          </div>
          <h2 className="text-2xl font-semibold mt-10">How it works</h2>
          <div className="space-y-4 mt-4">
            {[{step:"1",title:"Connect your WMS or upload CSV",desc:"Plug into your existing WMS via API, or upload a simple CSV. The agent starts monitoring immediately."},{step:"2",title:"Set reorder points and safety stock",desc:"For each SKU, define minimum stock levels and lead times. The agent will auto-suggest optimal values based on historical data."},{step:"3",title:"Agent monitors continuously",desc:"Every hour, the agent checks stock levels, consumption rates, and incoming shipments. It flags anomalies and predicts shortages."},{step:"4",title:"Auto-generate purchase orders",desc:"When reorder point is hit, the agent drafts a PO with the right quantity from the best supplier. You review and approve in one click."}].map(({step,title,desc})=>(<div key={step} className="flex gap-4 p-5 rounded-xl border border-[#e5e7eb] bg-white"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1a1a2e] text-white text-sm font-semibold">{step}</div><div><div className="font-medium">{title}</div><div className="text-sm text-[#1a1a2e]/60 mt-1">{desc}</div></div></div>))}
          </div>
          <AgentLiveActivity agentId="inventory-management" />

          <h2 className="text-2xl font-semibold mt-10">Trust &amp; control</h2>
          <div className="flex items-start gap-4 p-5 rounded-xl bg-[#fafafa] border border-[#e5e7eb] mt-4"><Shield className="h-5 w-5 text-[#1a1a2e] mt-0.5 flex-shrink-0" /><div className="text-sm text-[#1a1a2e]/70 leading-relaxed"><span className="font-medium text-[#1a1a2e]">You control the spend threshold.</span> Set a maximum auto-order value. Anything above that requires your explicit approval. All reorder decisions come with a clear reasoning trace showing demand data and lead time calculations.</div></div>
          <div className="mt-12 flex gap-3"><Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#1a1a2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a1a2e]/90">Start Free <ArrowRight className="h-4 w-4" /></Link><Link href="/#agents" className="inline-flex items-center gap-2 rounded-full border border-[#1a1a2e]/20 px-6 py-3 text-sm font-medium text-[#1a1a2e] hover:bg-[#1a1a2e]/5">Explore other agents <ArrowRight className="h-4 w-4" /></Link></div>
        </section>
      </div>
    </main>
  );
}
