"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { Route as RouteIcon, Plus, MapPin, Navigation, Clock, ArrowRight, X, Loader2, Sparkles } from "lucide-react";
import { generateId, cn } from "@/lib/utils";

interface RouteItem {
  id: string;
  name: string;
  origin: string;
  destination: string;
  stops: number;
  distance_km: number;
  estimated_minutes: number;
  status: string;
}

export default function RoutesPage() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", origin: "", destination: "", stops: 1, distanceKm: 0, estimatedMinutes: 0 });
  const [saving, setSaving] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/routes?limit=100");
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data;
      if (Array.isArray(items)) setRoutes(items);
      else if (data.error) setError(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId: generateId() }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: "", origin: "", destination: "", stops: 1, distanceKm: 0, estimatedMinutes: 0 });
        fetchRoutes();
        toast("Route added", "success");
      }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const activeRoutes = routes.filter(r => r.status === "active").length;
  const totalDistance = routes.reduce((s, r) => s + (r.distance_km || 0), 0);
  const avgDistance = routes.length ? Math.round(totalDistance / routes.length) : 0;
  const totalTime = routes.reduce((s, r) => s + (r.estimated_minutes || 0), 0);
  const avgTime = routes.length ? Math.round(totalTime / routes.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Route Optimization"
        description="Real-time route planning and AI-powered optimization for your fleet."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Routes" }]}
        action={
          <Button onClick={() => setShowForm(true)} className="bg-black text-white hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" /> Add Route
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Routes" value={routes.length} icon={RouteIcon} color="blue" />
        <StatCard label="Active Routes" value={activeRoutes} icon={Navigation} color="emerald" />
        <StatCard label="Avg Distance" value={avgDistance} icon={MapPin} color="amber" suffix="km" />
        <StatCard label="Avg Time" value={avgTime} icon={Clock} color="purple" suffix="min" />
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="border border-gray-200 animate-in slide-in-from-top-2 duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50">
                  <RouteIcon className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Create New Route</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Route Name *</Label>
                <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mumbai-Delhi Express" className="mt-1" />
              </div>
              <div>
                <Label>Origin *</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input required value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} placeholder="Mumbai, Maharashtra" className="pl-9" />
                </div>
              </div>
              <div>
                <Label>Destination *</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input required value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="Delhi, NCR" className="pl-9" />
                </div>
              </div>
              <div>
                <Label>Stops</Label>
                <Input type="number" value={form.stops || ""} onChange={e => setForm({ ...form, stops: parseInt(e.target.value) || 1 })} placeholder="3" className="mt-1" />
              </div>
              <div>
                <Label>Distance (km)</Label>
                <Input type="number" value={form.distanceKm || ""} onChange={e => setForm({ ...form, distanceKm: parseInt(e.target.value) || 0 })} placeholder="1400" className="mt-1" />
              </div>
              <div>
                <Label>Est. Time (min)</Label>
                <Input type="number" value={form.estimatedMinutes || ""} onChange={e => setForm({ ...form, estimatedMinutes: parseInt(e.target.value) || 0 })} placeholder="960" className="mt-1" />
              </div>
              <div className="md:col-span-3 flex gap-2 pt-2">
                <Button type="submit" disabled={saving} className="bg-black text-white hover:bg-gray-800">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {saving ? "Creating..." : "Create Route"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Routes List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <EmptyState
          icon={<RouteIcon className="h-8 w-8" />}
          title="No routes defined yet"
          description="Create your first route to start AI-powered optimization for your deliveries."
          action={
            <Button onClick={() => setShowForm(true)} className="bg-black text-white">
              <Plus className="h-4 w-4 mr-2" /> Create Route
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {routes.map((route) => {
            const statusColors: Record<string, string> = {
              active: "bg-emerald-100 text-emerald-700",
              inactive: "bg-gray-100 text-gray-600",
              pending: "bg-amber-100 text-amber-700",
            };
            return (
              <Card key={route.id} className="border border-gray-200 hover:shadow-md transition-all duration-200 group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 group-hover:scale-110 transition-transform">
                      <RouteIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{route.name}</span>
                        <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", statusColors[route.status] || "bg-gray-100 text-gray-600")}>
                          {route.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <span className="truncate">{route.origin}</span>
                        <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="truncate">{route.destination}</span>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      {route.stops > 0 && (
                        <div className="text-center">
                          <p className="text-gray-900 font-medium">{route.stops}</p>
                          <p className="text-[10px] text-gray-400 uppercase">Stops</p>
                        </div>
                      )}
                      {route.distance_km > 0 && (
                        <div className="text-center">
                          <p className="text-gray-900 font-medium">{route.distance_km} km</p>
                          <p className="text-[10px] text-gray-400 uppercase">Distance</p>
                        </div>
                      )}
                      {route.estimated_minutes > 0 && (
                        <div className="text-center">
                          <p className="text-gray-900 font-medium">{route.estimated_minutes}m</p>
                          <p className="text-[10px] text-gray-400 uppercase">Est. Time</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
