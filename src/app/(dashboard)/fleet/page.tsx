"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { generateId, cn } from "@/lib/utils";
import { Users, Plus, Truck, Car, Clock, Shield, AlertTriangle, X, Loader2 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

interface Driver {
  id: string; name: string; license: string | null; status: string;
  hours_driven: number; max_hours: number; assigned_vehicle: string | null;
}
interface Vehicle {
  id: string; plate: string; type: string; status: string; mileage_km: number;
}

export default function FleetPage() {
  const { toast } = useToast();
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
      const [dRes, vRes] = await Promise.all([fetch("/api/fleet/drivers?limit=100"), fetch("/api/fleet/vehicles?limit=100")]);
      const dData = await dRes.json();
      const vData = await vRes.json();
      const dItems = Array.isArray(dData) ? dData : dData.data;
      const vItems = Array.isArray(vData) ? vData : vData.data;
      if (Array.isArray(dItems)) setDrivers(dItems);
      if (Array.isArray(vItems)) setVehicles(vItems);
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
      if (res.ok) { setShowForm(false); setDForm({ name: "", license: "", maxHours: 11 }); fetchData(); toast("Driver added", "success"); }
    } catch { toast("Failed to add driver", "error"); }
    finally { setSaving(false); }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/fleet/vehicles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vForm, userId: generateId() }),
      });
      if (res.ok) { setShowForm(false); setVForm({ plate: "", type: "truck", mileageKm: 0 }); fetchData(); toast("Vehicle added", "success"); }
    } catch { toast("Failed to add vehicle", "error"); }
    finally { setSaving(false); }
  };

  const availableDrivers = drivers.filter((d) => d.status === "available").length;
  const drivingDrivers = drivers.filter((d) => d.status === "driving").length;
  const availableVehicles = vehicles.filter((v) => v.status === "available").length;
  const driversAtLimit = drivers.filter((d) => d.hours_driven >= d.max_hours).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet & Driver Management"
        description="Compliance, maintenance, and availability tracking."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Fleet" }]}
        action={
          <Button onClick={() => setShowForm(true)} className="bg-black text-white hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" /> Add {tab === "drivers" ? "Driver" : "Vehicle"}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Drivers" value={drivers.length} icon={Users} color="blue" />
        <StatCard label="Available" value={availableDrivers} icon={Users} color="emerald" />
        <StatCard label="Vehicles" value={vehicles.length} icon={Truck} color="purple" />
        <StatCard label="Hours Alert" value={driversAtLimit} icon={Clock} color={driversAtLimit > 0 ? "amber" : "slate"} />
      </div>

      {/* Hours Warning */}
      {driversAtLimit > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">{driversAtLimit} driver{driversAtLimit > 1 ? "s" : ""} at or near max hours</p>
            <p className="text-xs text-amber-600">These drivers should not be assigned new routes until rested.</p>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab("drivers")} className={cn("flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all", tab === "drivers" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
          <Users className="h-4 w-4" /> Drivers ({drivers.length})
        </button>
        <button onClick={() => setTab("vehicles")} className={cn("flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all", tab === "vehicles" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
          <Truck className="h-4 w-4" /> Vehicles ({vehicles.length})
        </button>
      </div>

      {/* Forms */}
      {showForm && (
        <Card className="border border-gray-200 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Add {tab === "drivers" ? "Driver" : "Vehicle"}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            {tab === "drivers" ? (
              <form onSubmit={handleAddDriver} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Name *</Label><Input required value={dForm.name} onChange={(e) => setDForm({ ...dForm, name: e.target.value })} placeholder="Driver name" /></div>
                <div><Label>License</Label><Input value={dForm.license} onChange={(e) => setDForm({ ...dForm, license: e.target.value })} placeholder="DL-12345" /></div>
                <div><Label>Max Hours</Label><Input type="number" value={dForm.maxHours || ""} onChange={(e) => setDForm({ ...dForm, maxHours: parseInt(e.target.value) || 11 })} /></div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="bg-black text-white hover:bg-gray-800">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{saving ? "Adding..." : "Add Driver"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>Plate *</Label><Input required value={vForm.plate} onChange={(e) => setVForm({ ...vForm, plate: e.target.value })} placeholder="AB-12-CD-3456" /></div>
                <div><Label>Type</Label>
                  <select className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5" value={vForm.type} onChange={(e) => setVForm({ ...vForm, type: e.target.value })}>
                    <option value="truck">Truck</option><option value="van">Van</option><option value="trailer">Trailer</option>
                  </select>
                </div>
                <div><Label>Mileage (km)</Label><Input type="number" value={vForm.mileageKm || ""} onChange={(e) => setVForm({ ...vForm, mileageKm: parseInt(e.target.value) || 0 })} /></div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} className="bg-black text-white hover:bg-gray-800">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{saving ? "Adding..." : "Add Vehicle"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">{error}</div>}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : tab === "drivers" ? (
        drivers.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />} title="No drivers added yet" description="Add your first driver to start tracking compliance and hours."
            action={<Button onClick={() => setShowForm(true)} className="bg-black text-white"><Plus className="h-4 w-4 mr-2" /> Add Driver</Button>} />
        ) : (
          <div className="space-y-2">
            {drivers.map((d) => {
              const hoursPct = Math.min((d.hours_driven / d.max_hours) * 100, 100);
              const atLimit = d.hours_driven >= d.max_hours;
              return (
                <Card key={d.id} className={cn("border transition-all hover:shadow-sm", atLimit ? "border-amber-200 bg-amber-50/30" : "border-gray-200")}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-100">
                        <Users className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{d.name}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                            d.status === "available" ? "bg-emerald-100 text-emerald-700"
                            : d.status === "driving" ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                          )}>{d.status}</span>
                          {d.assigned_vehicle && <span className="text-xs text-gray-400">• {d.assigned_vehicle}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[200px]">
                            <div className={cn("h-full rounded-full transition-all duration-500",
                              atLimit ? "bg-amber-500" : hoursPct > 70 ? "bg-amber-400" : "bg-emerald-400"
                            )} style={{ width: `${Math.max(hoursPct, 2)}%` }} />
                          </div>
                          <span className={cn("text-xs font-medium", atLimit ? "text-amber-600" : "text-gray-500")}>
                            {d.hours_driven}h / {d.max_hours}h
                          </span>
                          {d.license && <span className="text-xs text-gray-400 font-mono">/license: {d.license}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        vehicles.length === 0 ? (
          <EmptyState icon={<Truck className="h-8 w-8" />} title="No vehicles added yet" description="Add your first vehicle to start tracking fleet status."
            action={<Button onClick={() => setShowForm(true)} className="bg-black text-white"><Plus className="h-4 w-4 mr-2" /> Add Vehicle</Button>} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <Card key={v.id} className="border border-gray-200 hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-100">
                      <Truck className="h-5 w-5 text-gray-500" />
                    </div>
                    <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium",
                      v.status === "available" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                    )}>{v.status}</span>
                  </div>
                  <p className="font-mono font-semibold text-gray-900 text-lg">{v.plate}</p>
                  <p className="text-sm text-gray-500 capitalize mt-1">{v.type}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                    <span>{(v.mileage_km || 0).toLocaleString()} km</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
