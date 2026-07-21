"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { generateId } from "@/lib/utils";
import { Users, Plus, Truck, Car } from "lucide-react";

interface Driver {
  id: string; name: string; license: string | null; status: string;
  hours_driven: number; max_hours: number; assigned_vehicle: string | null;
}
interface Vehicle {
  id: string; plate: string; type: string; status: string; mileage_km: number;
}

export default function FleetPage() {
  const [tab, setTab] = useState<"drivers" | "vehicles">("drivers");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [dForm, setDForm] = useState({ name: "", license: "", maxHours: 11 });
  const [vForm, setVForm] = useState({ plate: "", type: "truck", mileageKm: 0 });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, vRes] = await Promise.all([
        fetch("/api/fleet/drivers"), fetch("/api/fleet/vehicles")
      ]);
      const dData = await dRes.json();
      const vData = await vRes.json();
      if (Array.isArray(dData)) setDrivers(dData);
      if (Array.isArray(vData)) setVehicles(vData);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/fleet/drivers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dForm, userId: generateId() }),
      });
      if (res.ok) { setShowForm(false); setDForm({ name: "", license: "", maxHours: 11 }); fetchData(); }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/fleet/vehicles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vForm, userId: generateId() }),
      });
      if (res.ok) { setShowForm(false); setVForm({ plate: "", type: "truck", mileageKm: 0 }); fetchData(); }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const availableDrivers = drivers.filter(d => d.status === "available").length;
  const availableVehicles = vehicles.filter(v => v.status === "available").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet & Driver Management</h1>
          <p className="text-gray-500 mt-1">Compliance, maintenance, and availability tracking</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add {tab === "drivers" ? "Driver" : "Vehicle"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total Drivers</p><p className="text-2xl font-bold">{drivers.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Available Drivers</p><p className="text-2xl font-bold text-emerald-600">{availableDrivers}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total Vehicles</p><p className="text-2xl font-bold">{vehicles.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Available Vehicles</p><p className="text-2xl font-bold text-emerald-600">{availableVehicles}</p></CardContent></Card>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab("drivers")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "drivers" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
          <Users className="h-4 w-4" /> Drivers
        </button>
        <button onClick={() => setTab("vehicles")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "vehicles" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
          <Truck className="h-4 w-4" /> Vehicles
        </button>
      </div>

      {/* Forms */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add {tab === "drivers" ? "Driver" : "Vehicle"}</CardTitle></CardHeader>
          <CardContent>
            {tab === "drivers" ? (
              <form onSubmit={handleAddDriver} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Name *</Label><Input required value={dForm.name} onChange={e => setDForm({ ...dForm, name: e.target.value })} placeholder="Driver name" /></div>
                <div><Label>License</Label><Input value={dForm.license} onChange={e => setDForm({ ...dForm, license: e.target.value })} placeholder="DL-12345" /></div>
                <div><Label>Max Hours</Label><Input type="number" value={dForm.maxHours || ""} onChange={e => setDForm({ ...dForm, maxHours: parseInt(e.target.value) || 11 })} /></div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Driver"}</Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Plate *</Label><Input required value={vForm.plate} onChange={e => setVForm({ ...vForm, plate: e.target.value })} placeholder="AB-12-CD-3456" /></div>
                <div>
                  <Label>Type</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={vForm.type} onChange={e => setVForm({ ...vForm, type: e.target.value })}>
                    <option value="truck">Truck</option><option value="van">Van</option><option value="trailer">Trailer</option>
                  </select>
                </div>
                <div><Label>Mileage (km)</Label><Input type="number" value={vForm.mileageKm || ""} onChange={e => setVForm({ ...vForm, mileageKm: parseInt(e.target.value) || 0 })} /></div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Vehicle"}</Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        tab === "drivers" ? (
          drivers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No drivers added yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <table className="w-full">
                <thead><tr className="border-b bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">License</th>
                  <th className="px-4 py-3 font-medium text-right">Hours</th><th className="px-4 py-3 font-medium">Vehicle</th><th className="px-4 py-3 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {drivers.map(d => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-sm font-medium">{d.name}</td>
                      <td className="px-4 py-3 text-sm font-mono">{d.license || "—"}</td>
                      <td className="px-4 py-3 text-sm text-right">{d.hours_driven}/{d.max_hours}h</td>
                      <td className="px-4 py-3 text-sm">{d.assigned_vehicle || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${d.status === "available" ? "bg-emerald-100 text-emerald-700" : d.status === "driving" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{d.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          vehicles.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No vehicles added yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <table className="w-full">
                <thead><tr className="border-b bg-gray-50 text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Plate</th><th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Mileage</th><th className="px-4 py-3 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-sm font-mono font-medium">{v.plate}</td>
                      <td className="px-4 py-3 text-sm capitalize">{v.type}</td>
                      <td className="px-4 py-3 text-sm text-right">{v.mileage_km?.toLocaleString() || 0} km</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${v.status === "available" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>{v.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )
      )}
    </div>
  );
}
