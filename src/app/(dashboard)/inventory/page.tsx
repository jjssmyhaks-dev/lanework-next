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
import { Package, Plus, TrendingDown, Search, AlertTriangle, ArrowUpDown, X, Loader2, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

interface InventoryItem {
  id: string; sku: string; name: string; quantity: number;
  reorder_point: number | null; warehouse: string | null; location: string | null;
}

export default function InventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "quantity">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [form, setForm] = useState({ sku: "", name: "", quantity: 0, reorderPoint: 10, warehouse: "", location: "" });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory?limit=100");
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data;
      if (Array.isArray(items)) setItems(items);
      else if (data.error) setError(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId: generateId() }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ sku: "", name: "", quantity: 0, reorderPoint: 10, warehouse: "", location: "" });
        fetchItems();
        toast("Item added to inventory", "success");
      }
    } catch (e: any) { toast("Failed to add item", "error"); }
    finally { setSaving(false); }
  };

  const filtered = items
    .filter((i) => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aVal = sortField === "quantity" ? a.quantity : a.name;
      const bVal = sortField === "quantity" ? b.quantity : b.name;
      const cmp = sortField === "quantity" ? (aVal as number) - (bVal as number) : String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const criticalCount = items.filter((i) => i.quantity <= (i.reorder_point || 10)).length;
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  const maxQty = Math.max(...items.map((i) => i.quantity), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Track stock levels and reorder intelligence."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory" }]}
        action={
          <Button onClick={() => setShowForm(true)} className="bg-black text-white hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total SKUs" value={items.length} icon={Package} color="blue" />
        <StatCard label="Total Units" value={totalUnits} icon={BarChart3} color="emerald" />
        <StatCard label="Low Stock" value={criticalCount} icon={TrendingDown} color={criticalCount > 0 ? "red" : "slate"} />
      </div>

      {/* Low Stock Alert */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">{criticalCount} item{criticalCount > 1 ? "s" : ""} below reorder point</p>
            <p className="text-xs text-red-600">These items need restocking to avoid stockouts.</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search by name or SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="border border-gray-200 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Add New Item</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>SKU *</Label><Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-1234" /></div>
              <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" /></div>
              <div><Label>Quantity *</Label><Input type="number" required value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} placeholder="0" /></div>
              <div><Label>Reorder Point</Label><Input type="number" value={form.reorderPoint || ""} onChange={(e) => setForm({ ...form, reorderPoint: parseInt(e.target.value) || 10 })} placeholder="10" /></div>
              <div><Label>Warehouse</Label><Input value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} placeholder="DC-West" /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Aisle 3, Bay 7" /></div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" disabled={saving} className="bg-black text-white hover:bg-gray-800">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {saving ? "Adding..." : "Add Item"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No inventory items yet"
          description="Add your first item to start tracking stock levels."
          action={<Button onClick={() => setShowForm(true)} className="bg-black text-white"><Plus className="h-4 w-4 mr-2" /> Add Item</Button>}
        />
      ) : (
        <Card className="border border-gray-200 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">SKU</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => { setSortField("quantity"); setSortDir((d) => d === "asc" ? "desc" : "asc"); }}>
                      <span className="flex items-center gap-1">Quantity <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Stock Level</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Reorder</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Warehouse</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item) => {
                    const reorderPoint = item.reorder_point || 10;
                    const low = item.quantity <= reorderPoint;
                    const out = item.quantity === 0;
                    const pct = Math.min((item.quantity / maxQty) * 100, 100);
                    return (
                      <tr key={item.id} className={cn("transition-colors", low ? "bg-red-50/40 hover:bg-red-50/70" : "hover:bg-gray-50")}>
                        <td className="px-5 py-3.5 font-mono text-xs font-medium text-gray-900">{item.sku}</td>
                        <td className="px-5 py-3.5 font-medium text-gray-800">{item.name}</td>
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{item.quantity.toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                              <div className={cn("h-full rounded-full transition-all duration-500",
                                out ? "bg-red-400" : low ? "bg-amber-400" : "bg-emerald-400"
                              )} style={{ width: `${Math.max(pct, 2)}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-400">{Math.round(pct)}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">{reorderPoint}</td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">{item.warehouse || "—"}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn("inline-flex text-xs px-2.5 py-1 rounded-full font-medium",
                            out ? "bg-red-100 text-red-700" : low ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {out ? "Out of Stock" : low ? "Low Stock" : "In Stock"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
