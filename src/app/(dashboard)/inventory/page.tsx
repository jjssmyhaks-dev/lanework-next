"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { statusColor, formatDate, generateId } from "@/lib/utils";
import { Package, Plus, TrendingDown } from "lucide-react";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  reorder_point: number | null;
  warehouse: string | null;
  location: string | null;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", quantity: 0, reorderPoint: 0, warehouse: "", location: "" });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
      else if (data.error) setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: form.sku,
          name: form.name,
          quantity: form.quantity,
          reorderPoint: form.reorderPoint,
          warehouse: form.warehouse,
          location: form.location,
          userId: generateId(),
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ sku: "", name: "", quantity: 0, reorderPoint: 0, warehouse: "", location: "" });
        fetchItems();
      }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const criticalCount = items.filter(i => i.quantity <= (i.reorder_point || 10)).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track stock levels and reorder intelligence</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total SKUs</p>
            <p className="text-2xl font-bold">{loading ? "—" : items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Units</p>
            <p className="text-2xl font-bold">{loading ? "—" : items.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={criticalCount > 0 ? "border-red-300 bg-red-50" : ""}>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Low Stock
            </p>
            <p className={`text-2xl font-bold ${criticalCount > 0 ? "text-red-600" : ""}`}>
              {loading ? "—" : criticalCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add New Item</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>SKU *</Label>
                <Input required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU-1234" />
              </div>
              <div>
                <Label>Name *</Label>
                <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input type="number" required value={form.quantity || ""} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} placeholder="0" />
              </div>
              <div>
                <Label>Reorder Point</Label>
                <Input type="number" value={form.reorderPoint || ""} onChange={e => setForm({ ...form, reorderPoint: parseInt(e.target.value) || 0 })} placeholder="10" />
              </div>
              <div>
                <Label>Warehouse</Label>
                <Input value={form.warehouse} onChange={e => setForm({ ...form, warehouse: e.target.value })} placeholder="DC-West" />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Aisle 3, Bay 7" />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Item"}</Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No inventory items yet. Add your first item to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium text-right">Quantity</th>
                <th className="px-4 py-3 font-medium text-right">Reorder Point</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const low = item.quantity <= (item.reorder_point || 10);
                return (
                  <tr key={item.id} className={`border-b last:border-0 ${low ? "bg-red-50" : ""}`}>
                    <td className="px-4 py-3 text-sm font-mono">{item.sku}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.reorder_point || 10}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.warehouse || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.location || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${low ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {low ? "Low Stock" : "In Stock"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
