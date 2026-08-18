"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, Filter, AlertTriangle, RefreshCw, X, Loader2,
  PackageSearch, ExternalLink, Trash2, MoreHorizontal, Eye,
  MapPin, Clock, Truck as TruckIcon, CheckCircle2, ArrowUpDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { statusColor, formatDate, generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Shipment {
  id: string;
  tracking_number: string;
  carrier: string;
  status: string;
  origin: string;
  destination: string;
  eta: string;
  created_at: string;
  customer_name?: string;
}

const STATUS_OPTIONS = ["all", "pending", "in_transit", "delivered", "delayed", "cancelled"];
const CARRIERS = ["BlueDart", "Delhivery", "FedEx", "DTDC", "Ecom Express", "XpressBees"];

const carrierColors: Record<string, string> = {
  BlueDart: "bg-blue-100 text-blue-700 border-blue-200",
  Delhivery: "bg-red-100 text-red-700 border-red-200",
  FedEx: "bg-purple-100 text-purple-700 border-purple-200",
  DTDC: "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Ecom Express": "bg-orange-100 text-orange-700 border-orange-200",
  XpressBees: "bg-teal-100 text-teal-700 border-teal-200",
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  in_transit: TruckIcon,
  delivered: CheckCircle2,
  delayed: AlertTriangle,
  cancelled: X,
};

const defaultShipments: Shipment[] = [
  { id: "shp-1", tracking_number: "LX-2026-00421", carrier: "BlueDart", status: "in_transit", origin: "Mumbai, MH", destination: "Delhi, DL", eta: "2026-07-23", created_at: "2026-07-20T10:30:00Z", customer_name: "Rahul Sharma" },
  { id: "shp-2", tracking_number: "LX-2026-00422", carrier: "Delhivery", status: "pending", origin: "Bengaluru, KA", destination: "Chennai, TN", eta: "2026-07-25", created_at: "2026-07-21T08:15:00Z", customer_name: "Priya Patel" },
  { id: "shp-3", tracking_number: "LX-2026-00423", carrier: "FedEx", status: "delivered", origin: "Hyderabad, TG", destination: "Pune, MH", eta: "2026-07-20", created_at: "2026-07-18T14:00:00Z", customer_name: "Amit Kumar" },
  { id: "shp-4", tracking_number: "LX-2026-00424", carrier: "BlueDart", status: "in_transit", origin: "Kolkata, WB", destination: "Mumbai, MH", eta: "2026-07-24", created_at: "2026-07-20T16:45:00Z", customer_name: "Neha Gupta" },
  { id: "shp-5", tracking_number: "LX-2026-00425", carrier: "DTDC", status: "delayed", origin: "Ahmedabad, GJ", destination: "Jaipur, RJ", eta: "2026-07-22", created_at: "2026-07-19T09:20:00Z", customer_name: "Vikram Singh" },
];

export default function ShipmentPage() {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>(defaultShipments);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sortField, setSortField] = useState<"created_at" | "eta" | "tracking_number">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  const [newShipment, setNewShipment] = useState({
    tracking_number: "", carrier: "BlueDart", origin: "", destination: "", eta: "", status: "pending",
    customer_name: "", customer_phone: "",
  });

  useEffect(() => {
    async function fetchShipments() {
      try {
        const res = await fetch("/api/shipment");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setShipments(data);
        }
      } catch {} finally { setLoading(false); }
    }
    fetchShipments();
  }, []);

  const handleAddShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const shipment: Shipment = {
        id: generateId(),
        tracking_number: newShipment.tracking_number || `LX-${Date.now().toString(36).toUpperCase()}`,
        carrier: newShipment.carrier,
        status: newShipment.status,
        origin: newShipment.origin,
        destination: newShipment.destination,
        eta: newShipment.eta,
        created_at: new Date().toISOString(),
        customer_name: newShipment.customer_name,
      };
      await fetch("/api/shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shipment),
      });
      setShipments((prev) => [shipment, ...prev]);
      setNewShipment({ tracking_number: "", carrier: "BlueDart", origin: "", destination: "", eta: "", status: "pending", customer_name: "", customer_phone: "" });
      setShowForm(false);
      toast("Shipment created successfully", "success");
    } catch (err) {
      toast("Failed to create shipment", "error");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/shipment/${id}`, { method: "DELETE" });
      setShipments((prev) => prev.filter((s) => s.id !== id));
      toast("Shipment deleted", "success");
    } catch { toast("Failed to delete shipment", "error"); }
  };

  const filtered = shipments
    .filter((s) => {
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesSearch = !searchQuery ||
        s.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.carrier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  // Stats
  const stats = {
    total: shipments.length,
    inTransit: shipments.filter((s) => s.status === "in_transit").length,
    delivered: shipments.filter((s) => s.status === "delivered").length,
    delayed: shipments.filter((s) => s.status === "delayed").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-36" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Track and manage all your shipments across carriers."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Shipments" }]}
        action={
          <Button onClick={() => setShowForm(true)} className="bg-black text-white hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" /> New Shipment
          </Button>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="p-1 rounded hover:bg-red-100"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "In Transit", value: stats.inTransit, color: "text-blue-600" },
          { label: "Delivered", value: stats.delivered, color: "text-emerald-600" },
          { label: "Delayed", value: stats.delayed, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
            <span className="text-xs text-gray-500">{s.label}</span>
            <span className={cn("text-lg font-semibold ml-auto", s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search by tracking #, carrier, origin, destination, customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt} onClick={() => setStatusFilter(opt)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  statusFilter === opt ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}>
                {opt === "all" ? "All" : opt.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                {opt !== "all" && (
                  <span className="ml-1 text-[10px] opacity-60">
                    {shipments.filter((s) => s.status === opt).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="border border-gray-200 overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="h-8 w-8" />}
              title="No shipments found"
              description="Try adjusting your filters or create a new shipment."
              action={<Button onClick={() => setShowForm(true)} className="bg-black text-white"><Plus className="h-4 w-4 mr-2" /> New Shipment</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => toggleSort("tracking_number")}>
                      <span className="flex items-center gap-1">Tracking # <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Carrier</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Route</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Customer</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => toggleSort("eta")}>
                      <span className="flex items-center gap-1">ETA <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((shipment) => {
                    const StatusIcon = statusIcons[shipment.status] || Clock;
                    const isSelected = selectedRow === shipment.id;
                    return (
                      <tr key={shipment.id}
                        className={cn(
                          "transition-colors",
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50",
                          shipment.status === "delayed" && "bg-red-50/30"
                        )}
                        onClick={() => setSelectedRow(isSelected ? null : shipment.id)}
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-medium text-gray-900">{shipment.tracking_number}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="outline" className={cn("text-xs", carrierColors[shipment.carrier] || "bg-gray-100 text-gray-700")}>
                            {shipment.carrier}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium", statusColor(shipment.status))}>
                            <StatusIcon className="h-3 w-3" />
                            {shipment.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span>{shipment.origin}</span>
                            <span className="text-gray-300">→</span>
                            <span>{shipment.destination}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{shipment.customer_name || "—"}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{formatDate(shipment.eta)}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); window.open(`/chat?track=${shipment.tracking_number}`, "_blank"); }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Track">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(shipment.id); }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Shipment Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-50 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl border border-gray-200 animate-fade-in">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">New Shipment</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleAddShipment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Tracking Number</label>
                  <Input value={newShipment.tracking_number} onChange={(e) => setNewShipment({ ...newShipment, tracking_number: e.target.value })} placeholder="Auto-generated if empty" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Carrier</label>
                  <select value={newShipment.carrier} onChange={(e) => setNewShipment({ ...newShipment, carrier: e.target.value })}
                    className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black">
                    {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Origin</label>
                  <Input value={newShipment.origin} onChange={(e) => setNewShipment({ ...newShipment, origin: e.target.value })} placeholder="Mumbai, MH" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Destination</label>
                  <Input value={newShipment.destination} onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })} placeholder="Delhi, DL" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Customer Name</label>
                  <Input value={newShipment.customer_name} onChange={(e) => setNewShipment({ ...newShipment, customer_name: e.target.value })} placeholder="Rahul Sharma" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">ETA</label>
                  <Input type="date" value={newShipment.eta} onChange={(e) => setNewShipment({ ...newShipment, eta: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" className="bg-black text-white hover:bg-gray-800" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {submitting ? "Creating..." : "Create Shipment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
