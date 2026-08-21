"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Sparkles, Zap, Truck, Package, Route, Bot, Shield,
  MessageSquare, Plug, CheckCircle2, Activity, BarChart3, Clock,
  TrendingUp, AlertTriangle, RefreshCw, Warehouse, Users, MapPin,
  CreditCard, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { AgentStatusWidget } from "@/components/ui/agent-status-widget";
import { AlertFeed } from "@/components/ui/alert-feed";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/ai?limit=5"),
        ]);
        if (statsRes.ok) {
          const json = await statsRes.json();
          setData(json);
        }
        if (activityRes.ok) {
          const tasks = await activityRes.json();
          if (Array.isArray(tasks)) setActivity(tasks);
        }
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

  if (isFresh) return <NewUserOnboarding />;
  return <ActiveDashboard data={data} activity={activity} />;
}

/* ─── NEW USER: Progressive Onboarding ─── */
function NewUserOnboarding() {
  const steps = [
    { num: 1, title: "Connect your systems", desc: "Plug in your existing tools — CSV, WhatsApp, TMS, WMS", href: "/integrations", icon: Plug, cta: "Go to Integrations", highlight: true },
    { num: 2, title: "Add your first shipment", desc: "Track a real shipment and see AI monitoring in action", href: "/shipment", icon: Truck, cta: "Create Shipment" },
    { num: 3, title: "Set up inventory", desc: "Add products with reorder points — AI handles the rest", href: "/inventory", icon: Package, cta: "Add Inventory" },
    { num: 4, title: "Configure your agents", desc: "Choose trust levels — what agents can do automatically", href: "/onboarding", icon: Shield, cta: "Configure Agents" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
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

      <div className="space-y-4">
        {steps.map(s => (
          <Link key={s.num} href={s.href}
            className={`group flex items-center gap-5 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${
              s.highlight
                ? "border-black bg-black text-white hover:bg-gray-900"
                : "border-gray-200 bg-white hover:border-black"
            }`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
              s.highlight ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700"
            }`}>{s.num}</div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${s.highlight ? "text-white" : "text-gray-900"}`}>{s.title}</h3>
              <p className={`text-sm mt-0.5 ${s.highlight ? "text-white/70" : "text-gray-500"}`}>{s.desc}</p>
            </div>
            <div className={`flex items-center gap-2 shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              s.highlight ? "bg-white text-black hover:bg-white/90" : "bg-black text-white group-hover:bg-gray-800"
            }`}>{s.cta} <ArrowRight className="h-3.5 w-3.5" /></div>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <Zap className="h-4 w-4 shrink-0" />
        <span><strong>Tip:</strong> Most teams start with a CSV upload and WhatsApp notifications. Connect both in under 2 minutes.</span>
      </div>
    </div>
  );
}

/* ─── ACTIVE DASHBOARD ─── */
function ActiveDashboard({ data, activity }: { data: any; activity: any[] }) {
  const stats = [
    { label: "Active Shipments", value: data?.shipments ?? 0, icon: Truck, color: "text-blue-600", bg: "bg-blue-50", href: "/shipment" },
    { label: "AI Agents", value: data?.agents ?? 0, icon: Bot, color: "text-emerald-600", bg: "bg-emerald-50", href: "/agents" },
    { label: "Pending Tasks", value: data?.tasks ?? 0, icon: Activity, color: "text-amber-600", bg: "bg-amber-50", href: "/warehouse" },
    { label: "Exceptions", value: data?.exceptions ?? 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", href: "/dashboard" },
  ];

  const quickActions = [
    { label: "New Shipment", href: "/shipment", icon: Truck, color: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200" },
    { label: "Add Inventory", href: "/inventory", icon: Package, color: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200" },
    { label: "Plan Route", href: "/routes", icon: Route, color: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200" },
    { label: "Ask AI", href: "/chat", icon: MessageSquare, color: "hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200" },
    { label: "Integrations", href: "/integrations", icon: Plug, color: "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200" },
    { label: "Fleet", href: "/fleet", icon: Users, color: "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Good {getGreeting()}</h1>
        <p className="mt-1 text-sm text-gray-500">Your logistics operation, powered by AI agents.</p>
      </div>

      {/* Animated Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md hover:border-gray-300 transition-all duration-200 border border-gray-200 group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">{s.label}</span>
                  <div className={`${s.bg} p-2 rounded-lg group-hover:scale-110 transition-transform`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                </div>
                <AnimatedCounter value={s.value} className="text-3xl font-semibold text-gray-900" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border border-gray-200">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition-all duration-200 ${a.color}`}>
                <a.icon className="h-4 w-4" /> {a.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Status + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgentStatusWidget />
        <AlertFeed limit={5} />
      </div>

      {/* Activity Feed */}
      {activity.length > 0 && (
        <Card className="border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
              <RefreshCw className="h-4 w-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              {activity.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    task.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : task.status === "failed" ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>{task.status}</span>
                  <span className="text-sm font-medium text-gray-700">{task.action_type || "task"}</span>
                  <span className="flex-1 text-xs text-gray-400 truncate">
                    {task.reasoning_trace ? task.reasoning_trace.slice(0, 80) + "…" : "—"}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(task.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/* ─── SKELETON ─── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-8 w-48" /><Skeleton className="mt-2 h-4 w-72" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-8 w-16" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-5"><Skeleton className="h-4 w-32 mb-3" /><div className="flex gap-2"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></div></CardContent></Card>
    </div>
  );
}

/* ─── ERROR ─── */
function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
      <h2 className="text-lg font-semibold text-gray-900">Failed to load dashboard</h2>
      <p className="mt-1 text-sm text-gray-500">{error}</p>
      <button onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/90 transition-colors">
        Retry
      </button>
    </div>
  );
}
