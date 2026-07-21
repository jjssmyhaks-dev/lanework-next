"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  X,
  Loader2,
  PackageSearch,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { statusColor, formatDate, generateId } from "@/lib/utils";

interface Shipment {
  id: string;
  tracking_number: string;
  carrier: string;
  status: string;
  origin: string;
  destination: string;
  eta: string;
  created_at: string;
}

const STATUS_OPTIONS = ["all", "pending", "in_transit", "delivered", "delayed"];

const defaultShipments: Shipment[] = [
  { id: "shp-1", tracking_number: "LX-2026-00421", carrier: "BlueDart", status: "in_transit", origin: "Mumbai, MH", destination: "Delhi, DL", eta: "2026-07-23", created_at: "2026-07-20T10:30:00Z" },
  { id: "shp-2", tracking_number: "LX-2026-00422", carrier: "Delhivery", status: "pending", origin: "Bengaluru, KA", destination: "Chennai, TN", eta: "2026-07-25", created_at: "2026-07-21T08:15:00Z" },
  { id: "shp-3", tracking_number: "LX-2026-00423", carrier: "FedEx", status: "delivered", origin: "Hyderabad, TG", destination: "Pune, MH", eta: "2026-07-20", created_at: "2026-07-18T14:00:00Z" },
  { id: "shp-4", tracking_number: "LX-2026-00424", carrier: "BlueDart", status: "in_transit", origin: "Kolkata, WB", destination: "Mumbai, MH", eta: "2026-07-24", created_at: "2026-07-20T16:45:00Z" },
  { id: "shp-5", tracking_number: "LX-2026-00425", carrier: "DTDC", status: "delayed", origin: "Ahmedabad, GJ", destination: "Jaipur, RJ", eta: "2026-07-22", created_at: "2026-07-19T09:20:00Z" },
];

export default function ShipmentPage() {
  const [shipments, setShipments] = useState<Shipment[]>(defaultShipments);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New shipment form state
  const [newShipment, setNewShipment] = useState({
    tracking_number: "",
    carrier: "",
    origin: "",
    destination: "",
    eta: "",
    status: "pending",
  });

  useEffect(() => {
    async function fetchShipments() {
      try {
        const res = await fetch("/api/shipment");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setShipments(data);
          }
        }
      } catch (err) {
        // Use default data on fetch failure
      } finally {
        setLoading(false);
      }
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
        carrier: newShipment.carrier || "BlueDart",
        status: newShipment.status,
        origin: newShipment.origin,
        destination: newShipment.destination,
        eta: newShipment.eta,
        created_at: new Date().toISOString(),
      };

      await fetch("/api/shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shipment),
      });

      setShipments((prev) => [shipment, ...prev]);
      setNewShipment({ tracking_number: "", carrier: "", origin: "", destination: "", eta: "", status: "pending" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create shipment");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredShipments = shipments.filter((s) => {
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      s.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.carrier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const carrierColors: Record<string, string> = {
    BlueDart: "bg-blue-100 text-blue-700",
    Delhivery: "bg-red-100 text-red-700",
    FedEx: "bg-purple-100 text-purple-700",
    DTDC: "bg-yellow-100 text-yellow-700",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-4 w-56" />
        <Card>
          <CardContent className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Shipments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage all your shipments.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-black text-white hover:bg-black/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Shipment
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Add shipment modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowForm(false)} />
          <div className="relative z-50 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Shipment</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddShipment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                  <Input
                    value={newShipment.tracking_number}
                    onChange={(e) => setNewShipment({ ...newShipment, tracking_number: e.target.value })}
                    placeholder="LX-2026-XXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
                  <Input
                    value={newShipment.carrier}
                    onChange={(e) => setNewShipment({ ...newShipment, carrier: e.target.value })}
                    placeholder="BlueDart"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
                  <Input
                    value={newShipment.origin}
                    onChange={(e) => setNewShipment({ ...newShipment, origin: e.target.value })}
                    placeholder="Mumbai, MH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <Input
                    value={newShipment.destination}
                    onChange={(e) => setNewShipment({ ...newShipment, destination: e.target.value })}
                    placeholder="Delhi, DL"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ETA</label>
                  <Input
                    type="date"
                    value={newShipment.eta}
                    onChange={(e) => setNewShipment({ ...newShipment, eta: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newShipment.status}
                    onChange={(e) => setNewShipment({ ...newShipment, status: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-black text-white hover:bg-black/90" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {submitting ? "Creating..." : "Create Shipment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search shipments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "all" ? "All Statuses" : opt.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shipments table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {filteredShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <PackageSearch className="h-10 w-10 mb-3" />
              <p className="text-sm">No shipments found</p>
              <p className="text-xs mt-1">Try adjusting your filters or add a new shipment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Tracking #</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Carrier</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Origin</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Destination</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-gray-900">
                        {shipment.tracking_number}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge
                          variant="outline"
                          className={carrierColors[shipment.carrier] || "bg-gray-100 text-gray-700"}
                        >
                          {shipment.carrier}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant="outline" className={statusColor(shipment.status)}>
                          {shipment.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{shipment.origin}</td>
                      <td className="px-6 py-3.5 text-gray-600">{shipment.destination}</td>
                      <td className="px-6 py-3.5 text-gray-600">{formatDate(shipment.eta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
