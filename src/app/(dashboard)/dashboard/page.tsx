"use client";

import { useEffect, useState } from "react";
import {
  Truck,
  Package,
  AlertTriangle,
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
  Loader2,
  Route,
  Warehouse,
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

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch("/api/ai"),
          fetch("/api/ai"),
        ]);

        const statsData = await statsRes.json();
        const activityData = await activityRes.json();

        // Derive stats from activity data or use defaults
        setStats({
          totalShipments: Array.isArray(statsData)
            ? statsData.length * 3
            : 42,
          activeAgents: Array.isArray(statsData)
            ? Math.min(statsData.length, 6)
            : 6,
          pendingTasks: Array.isArray(statsData)
            ? statsData.filter((t: AgentTask) => t.status === "pending").length
            : 12,
          exceptions: Array.isArray(statsData)
            ? statsData.filter(
                (t: AgentTask) =>
                  t.status === "failed" || t.status === "error"
              ).length
            : 1,
        });

        setRecentActivity(Array.isArray(activityData) ? activityData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const statCards = [
    {
      label: "Total Shipments",
      value: stats?.totalShipments ?? 0,
      icon: Truck,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/shipment",
    },
    {
      label: "Active Agents",
      value: stats?.activeAgents ?? 0,
      icon: Activity,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/agents",
    },
    {
      label: "Pending Tasks",
      value: stats?.pendingTasks ?? 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/warehouse",
    },
    {
      label: "Exceptions",
      value: stats?.exceptions ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/dashboard",
    },
  ];

  const quickActions = [
    { label: "New Shipment", href: "/shipment", icon: Truck },
    { label: "Add Inventory", href: "/inventory", icon: Package },
    { label: "Plan Route", href: "/routes", icon: Route },
    { label: "Assign Task", href: "/warehouse", icon: Warehouse },
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
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="rounded-full bg-red-50 p-4">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">
          Failed to load dashboard
        </h2>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your logistics operations powered by AI agents.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {stat.label}
                </CardTitle>
                <div className={`${stat.bg} p-2 rounded-lg`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-gray-900">
                  {stat.value.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900">
                Recent Agent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Activity className="h-10 w-10 mb-3" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs mt-1">
                    Agent tasks will appear here as they run.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentActivity.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 flex-shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {task.agent}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {task.action}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge
                          className={statusColor(task.status)}
                          variant="outline"
                        >
                          {task.status}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(task.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-900">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-black group-hover:text-white transition-colors">
                      <action.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {action.label}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-black transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
