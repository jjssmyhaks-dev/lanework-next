"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { statusColor, generateId } from "@/lib/utils";
import { Route as RouteIcon, Plus, MapPin } from "lucide-react";

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
      }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const activeRoutes = routes.filter(r => r.status === "active").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Route Optimization</h1>
          <p className="text-gray-500 mt-1">Real-time route planning and optimization</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Add Route
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total Routes</p><p className="text-2xl font-bold">{loading ? "—" : routes.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Active Routes</p><p className="text-2xl font-bold text-emerald-600">{loading ? "—" : activeRoutes}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Avg Distance</p><p className="text-2xl font-bold">{loading ? "—" : routes.length ? `${Math.round(routes.reduce((s, r) => s + (r.distance_km || 0), 0) / routes.length)} km` : "—"}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Route</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="LA-SF Express" /></div>
              <div><Label>Origin *</Label><Input required value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} placeholder="Los Angeles, CA" /></div>
              <div><Label>Destination *</Label><Input required value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="San Francisco, CA" /></div>
              <div><Label>Stops</Label><Input type="number" value={form.stops || ""} onChange={e => setForm({ ...form, stops: parseInt(e.target.value) || 1 })} /></div>
              <div><Label>Distance (km)</Label><Input type="number" value={form.distanceKm || ""} onChange={e => setForm({ ...form, distanceKm: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Est. Time (min)</Label><Input type="number" value={form.estimatedMinutes || ""} onChange={e => setForm({ ...form, estimatedMinutes: parseInt(e.target.value) || 0 })} /></div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Route"}</Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : routes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No routes defined yet. Create your first route to begin optimization.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Origin</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium text-right">Stops</th>
                <th className="px-4 py-3 font-medium text-right">Distance</th>
                <th className="px-4 py-3 font-medium text-right">Est. Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {routes.map(route => (
                <tr key={route.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm font-medium">{route.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{route.origin}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{route.destination}</td>
                  <td className="px-4 py-3 text-sm text-right">{route.stops}</td>
                  <td className="px-4 py-3 text-sm text-right">{route.distance_km ? `${route.distance_km} km` : "—"}</td>
                  <td className="px-4 py-3 text-sm text-right">{route.estimated_minutes ? `${route.estimated_minutes}m` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(route.status)}`}>
                      {route.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
