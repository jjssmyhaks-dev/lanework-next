"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight, Sparkles, Zap, Truck, Package, Route, Bot, Shield,
  MessageSquare, Plug, CheckCircle2, Activity, Loader2, BarChart3
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { statusColor, formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} />;

  const totalShipments = data?.shipments || 0;
  const isFresh = totalShipments === 0;
  const hasActivity = data?.tasks > 0;

  if (isFresh) return <NewUserOnboarding />;
  return <ActiveDashboard data={data} />;
}

/* ─── NEW USER: Progressive Onboarding ─── */
function NewUserOnboarding() {
  const steps = [
    {
      num: 1, title: "Connect your systems",
      desc: "Plug in your existing tools — CSV, WhatsApp, TMS, WMS",
      href: "/integrations",
      icon: Plug,
      cta: "Go to Integrations",
      highlight: true,
    },
    {
      num: 2, title: "Add your first shipment",
      desc: "Track a real shipment and see AI monitoring in action",
      href: "/shipment",
      icon: Truck,
      cta: "Create Shipment",
    },
    {
      num: 3, title: "Set up inventory",
      desc: "Add products with reorder points — AI handles the rest",
      href: "/inventory",
      icon: Package,
      cta: "Add Inventory",
    },
    {
      num: 4, title: "Configure your agents",
      desc: "Choose trust levels — what agents can do automatically",
      href: "/onboarding",
      icon: Shield,
      cta: "Configure Agents",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Welcome */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" /> Welcome aboard
        </div>
        <h1 className="text-3xl font-semibold text-gray-900">
          Let's get your logistics <em className="italic">running itself.</em>
        </h1>
        <p className="mt-3 text-gray-500 max-w-xl mx-auto">
          Lanework is a team of AI agents that track shipments, manage inventory,
          and handle the thousand small decisions your ops team makes every day.
          <strong> 4 steps to launch.</strong>
        </p>
      </div>

      {/* Step cards */}
      <div className="space-y-4">
        {steps.map(s => (
          <Link key={s.num} href={s.href}
            className={`group flex items-center gap-5 p-5 rounded-2xl border transition-all hover:shadow-md ${
              s.highlight
                ? "border-black bg-black text-white hover:bg-gray-900"
                : "border-gray-200 bg-white hover:border-black"
            }`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
              s.highlight ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700"
            }`}>
              {s.num}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${s.highlight ? "text-white" : "text-gray-900"}`}>
                {s.title}
              </h3>
              <p className={`text-sm mt-0.5 ${s.highlight ? "text-white/70" : "text-gray-500"}`}>
                {s.desc}
              </p>
            </div>
            <div className={`flex items-center gap-2 shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              s.highlight
                ? "bg-white text-black hover:bg-white/90"
                : "bg-black text-white group-hover:bg-gray-800"
            }`}>
              {s.cta} <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom tip */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <Zap className="h-4 w-4 shrink-0" />
        <span>
          <strong>Tip:</strong> Most teams start with a CSV upload and WhatsApp notifications.
          Connect both in under 2 minutes from the Integrations page.
        </span>
      </div>
    </div>
  );
}

/* ─── ACTIVE DASHBOARD: User with data ─── */
function ActiveDashboard({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your logistics operation, powered by AI agents.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Shipments", value: data?.shipments ?? 0, icon: Truck, color: "text-blue-600", bg: "bg-blue-50", href: "/shipment" },
          { label: "AI Agents", value: data?.agents ?? 0, icon: Bot, color: "text-emerald-600", bg: "bg-emerald-50", href: "/agents" },
          { label: "Pending Tasks", value: data?.tasks ?? 0, icon: Activity, color: "text-amber-600", bg: "bg-amber-50", href: "/warehouse" },
          { label: "Exeptions", value: data?.exceptions ?? 0, icon: BarChart3, color: "text-red-600", bg: "bg-red-50", href: "/dashboard" },
        ].map(s => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md transition-shadow border border-gray-200">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">{s.label}</CardTitle>
                <div className={`${s.bg} p-2 rounded-lg`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-gray-900">{s.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions compact */}
      <Card className="border border-gray-200">
        <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "New Shipment", href: "/shipment", icon: Truck },
              { label: "Add Inventory", href: "/inventory", icon: Package },
              { label: "Plan Route", href: "/routes", icon: Route },
              { label: "Ask AI", href: "/chat", icon: MessageSquare },
              { label: "Integrations", href: "/integrations", icon: Plug },
              { label: "Configure Agents", href: "/onboarding", icon: Shield },
            ].map(a => (
              <Link key={a.label} href={a.href}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:border-black hover:text-black transition-all">
                <a.icon className="h-3.5 w-3.5" /> {a.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── SKELETON ─── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-8 w-48" /><Skeleton className="mt-2 h-4 w-72" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-16" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── ERROR ─── */
function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h2 className="text-lg font-semibold text-gray-900">Failed to load dashboard</h2>
      <p className="mt-1 text-sm text-gray-500">{error}</p>
      <button onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/90">
        Retry
      </button>
    </div>
  );
}
