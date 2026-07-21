"use client";

import { useEffect, useState } from "react";
import {
  PackageSearch,
  BarChart3,
  Route,
  Warehouse,
  Truck,
  Headphones,
  ToggleLeft,
  ToggleRight,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { statusColor } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  description: string;
  active: boolean;
  recentActivity: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const defaultAgents: Agent[] = [
  {
    id: "shipment-tracking",
    name: "Shipment Tracking",
    description: "Monitors all active shipments, detects delays, and alerts stakeholders in real-time.",
    active: true,
    recentActivity: 0,
    icon: PackageSearch,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: "inventory-management",
    name: "Inventory Management",
    description: "Tracks stock levels across warehouses, predicts reorder needs, and prevents stockouts.",
    active: true,
    recentActivity: 0,
    icon: BarChart3,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    id: "route-optimization",
    name: "Route Optimization",
    description: "Calculates optimal delivery routes considering traffic, weather, and priorities.",
    active: false,
    recentActivity: 0,
    icon: Route,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    id: "warehouse-ops",
    name: "Warehouse Operations",
    description: "Coordinates pick/pack/ship workflows and assigns tasks to warehouse personnel.",
    active: true,
    recentActivity: 0,
    icon: Warehouse,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    id: "fleet-management",
    name: "Fleet Management",
    description: "Tracks vehicle locations, driver hours, and schedules maintenance proactively.",
    active: true,
    recentActivity: 0,
    icon: Truck,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    id: "customer-support",
    name: "Customer Support",
    description: "Handles customer inquiries, tracking requests, and resolves delivery issues automatically.",
    active: false,
    recentActivity: 0,
    icon: Headphones,
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch("/api/ai");
        const data = await res.json();

        if (Array.isArray(data)) {
          // Count activity per agent
          const activityCount: Record<string, number> = {};
          for (const task of data) {
            const agentKey = (task.agent || "")
              .toLowerCase()
              .replace(/\s+/g, "-");
            activityCount[agentKey] = (activityCount[agentKey] || 0) + 1;
          }

          setAgents((prev) =>
            prev.map((a) => ({
              ...a,
              recentActivity: activityCount[a.id] || 0,
            }))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, []);

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
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
        <h2 className="mt-4 text-lg font-semibold text-gray-900">
          Failed to load agents
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">AI Agents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the autonomous agents that power your logistics operations.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className="border border-gray-200 hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${agent.bg} p-2.5 rounded-xl`}>
                    <agent.icon className={`h-5 w-5 ${agent.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      {agent.name}
                    </CardTitle>
                  </div>
                </div>
                <button
                  onClick={() => toggleAgent(agent.id)}
                  className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors"
                  title={agent.active ? "Deactivate agent" : "Activate agent"}
                >
                  {agent.active ? (
                    <ToggleRight className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-300" />
                  )}
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500 leading-relaxed">
                {agent.description}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <Badge
                  variant="outline"
                  className={
                    agent.active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                  }
                >
                  {agent.active ? "Active" : "Inactive"}
                </Badge>
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Activity className="h-3.5 w-3.5" />
                  <span>{agent.recentActivity} recent activities</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
