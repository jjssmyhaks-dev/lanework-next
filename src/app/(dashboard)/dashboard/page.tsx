"use client";

import { useEffect, useState } from "react";
import {
  Truck, Package, AlertTriangle, Activity, ArrowRight,
  Clock, CheckCircle2, Loader2, Route, Warehouse, Users,
  Plus, MessageSquare, Shield, Sparkles, Bot, Zap, BookOpen
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { statusColor, formatDateTime } from "@/lib/utils";

interface AgentTask {
  id: string;
  agent: string;
  action: string;
  status: string;
  created_at: string;
}

interface DashboardStats {
  totalShipments: number;
  activeAgents: number;
  pendingTasks: number;
  exceptions: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/ai"),
        ]);

        if (!statsRes.ok || !activityRes.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const statsData = await statsRes.json();
        const activityData = await activityRes.json();

        const total = statsData.shipments || 0;
        setStats({
          totalShipments: total,
          activeAgents: statsData.agents || 0,
          pendingTasks: statsData.tasks || 0,
          exceptions: statsData.exceptions || 0,
        });

        setIsNewUser(total === 0 && (statsData.tasks || 0) === 0);

        setRecentActivity(
          Array.isArray(statsData.recentTasks)
            ? statsData.recentTasks
            : Array.isArray(activityData)
              ? activityData
              : []
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const statCards = [
    { label: "Active Shipments", value: stats?.totalShipments ?? 0, icon: Truck, color: "text-blue-600", bg: "bg-blue-50", href: "/shipment" },
    { label: "AI Agents", value: stats?.activeAgents ?? 0, icon: Bot, color: "text-emerald-600", bg: "bg-emerald-50", href: "/agents" },
    { label: "Pending Tasks", value: stats?.pendingTasks ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", href: "/warehouse" },
    { label: "Exceptions", value: stats?.exceptions ?? 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", href: "/dashboard" },
  ];

  const quickActions = [
    { label: "Create Shipment", desc: "Track a new shipment with AI monitoring", href: "/shipment", icon: Truck, color: "bg-blue-50 border-blue-200 hover:bg-blue-100" },
    { label: "Add Inventory", desc: "Add SKUs and set reorder points", href: "/inventory", icon: Package, color: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
    { label: "Plan Route", desc: "Optimize delivery routes with AI", href: "/routes", icon: Route, color: "bg-purple-50 border-purple-200 hover:bg-purple-100" },
    { label: "Ask Copilot", desc: "Chat with your logistics AI assistant", href: "/copilot", icon: MessageSquare, color: "bg-amber-50 border-amber-200 hover:bg-amber-100" },
    { label: "Manage Fleet", desc: "Track vehicles and driver hours", href: "/fleet", icon: Users, color: "bg-cyan-50 border-cyan-200 hover:bg-cyan-100" },
    { label: "Setup Agents", desc: "Configure agent trust levels", href: "/onboarding", icon: Shield, color: "bg-rose-50 border-rose-200 hover:bg-rose-100" },
  ];

  const gettingStartedSteps = [
    { step: 1, title: "Add your first shipment", desc: "Create a shipment and let AI track it in real-time", href: "/shipment", icon: Truck },
    { step: 2, title: "Set up inventory", desc: "Add products and set reorder thresholds", href: "/inventory", icon: Package },
    { step: 3, title: "Configure your agents", desc: "Decide what each AI agent can do automatically", href: "/onboarding", icon: Bot },
    { step: 4, title: "Try the copilot", desc: "Ask the AI about shipments, routes, or inventory", href: "/copilot", icon: MessageSquare },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="rounded-full bg-red-50 p-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">Failed to load dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/90">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isNewUser
            ? "Welcome to Lanework! Let's get your AI-powered logistics operation running."
            : "Overview of your logistics operations powered by AI agents."}
        </p>
      </div>

      {/* Getting Started — shown only for new users */}
      {isNewUser && (
        <Card className="border-2 border-black/10 bg-gradient-to-br from-white to-gray-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-black">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Getting Started</h3>
                <p className="text-xs text-gray-500">4 steps to launch your AI logistics operation</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {gettingStartedSteps.map((s) => (
                <Link key={s.step} href={s.href}
                  className="group flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-black hover:shadow-sm transition-all">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-white text-sm font-semibold">
                    {s.step}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 group-hover:text-black">{s.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-black shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">{stat.label}</CardTitle>
                <div className={`${stat.bg} p-2 rounded-lg`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-gray-900">{stat.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${action.color}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200">
                  <action.icon className="h-5 w-5 text-gray-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900">{action.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{action.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900">Recent Activity</CardTitle>
            <Link href="/agents" className="text-xs text-gray-500 hover:text-black flex items-center gap-1">
              View all agents <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentActivity.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.agent}</p>
                      <p className="text-xs text-gray-500 truncate">{task.action}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge className={statusColor(task.status)} variant="outline">{task.status}</Badge>
                    <span className="text-xs text-gray-400">{formatDateTime(task.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}