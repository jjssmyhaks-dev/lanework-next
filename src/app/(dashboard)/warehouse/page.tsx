"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { generateId } from "@/lib/utils";
import { Warehouse, Plus, PackageCheck } from "lucide-react";

interface WarehouseTask {
  id: string;
  type: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  dock: string | null;
}

export default function WarehousePage() {
  const [tasks, setTasks] = useState<WarehouseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "pick", priority: "medium", assignedTo: "", dock: "" });
  const [saving, setSaving] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/warehouse?limit=100");
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.data;
      if (Array.isArray(items)) setTasks(items);
      else if (data.error) setError(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId: generateId() }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ type: "pick", priority: "medium", assignedTo: "", dock: "" });
        fetchTasks();
      }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const typeColors: Record<string, string> = {
    pick: "bg-blue-100 text-blue-700", pack: "bg-purple-100 text-purple-700",
    ship: "bg-emerald-100 text-emerald-700", receive: "bg-amber-100 text-amber-700",
  };
  const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Operations</h1>
          <p className="text-gray-500 mt-1">Task management, dock scheduling, and labor optimization</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[{ label: "Pending", value: tasks.filter(t => t.status === "pending").length, color: "text-yellow-600" },
          { label: "In Progress", value: tasks.filter(t => t.status === "in_progress").length, color: "text-blue-600" },
          { label: "Completed", value: tasks.filter(t => t.status === "completed").length, color: "text-emerald-600" },
          { label: "High Priority", value: tasks.filter(t => t.priority === "high").length, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-gray-500">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p></CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Task</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Type *</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="pick">Pick</option><option value="pack">Pack</option>
                  <option value="ship">Ship</option><option value="receive">Receive</option>
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
              <div><Label>Assigned Worker</Label><Input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} placeholder="Worker name" /></div>
              <div><Label>Dock</Label><Input value={form.dock} onChange={e => setForm({ ...form, dock: e.target.value })} placeholder="Dock A-3" /></div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Task"}</Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <PackageCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No warehouse tasks yet. Add your first task to start managing operations.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm text-gray-500">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Worker</th>
                <th className="px-4 py-3 font-medium">Dock</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[task.type] || "bg-gray-100"}`}>{task.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority] || ""}`}>{task.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{task.status?.replace("_", " ") || "pending"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{task.assigned_to || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{task.dock || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
