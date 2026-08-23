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
import { Warehouse, Plus, PackageCheck, Clock, CheckCircle2, AlertTriangle, X, Loader2, Package } from "lucide-react";
import { generateId, cn } from "@/lib/utils";

interface WarehouseTask {
  id: string;
  type: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  dock: string | null;
}

export default function WarehousePage() {
  const { toast } = useToast();
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
        toast("Task created", "success");
      }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const pendingCount = tasks.filter(t => t.status === "pending").length;
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const highPriorityCount = tasks.filter(t => t.priority === "high").length;

  const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
    pick: { label: "Pick", color: "text-blue-700", bg: "bg-blue-100" },
    pack: { label: "Pack", color: "text-purple-700", bg: "bg-purple-100" },
    ship: { label: "Ship", color: "text-emerald-700", bg: "bg-emerald-100" },
    receive: { label: "Receive", color: "text-amber-700", bg: "bg-amber-100" },
  };

  const priorityConfig: Record<string, { color: string; bg: string }> = {
    high: { color: "text-red-700", bg: "bg-red-100" },
    medium: { color: "text-amber-700", bg: "bg-amber-100" },
    low: { color: "text-gray-600", bg: "bg-gray-100" },
  };

  const statusConfig: Record<string, { color: string; bg: string }> = {
    pending: { color: "text-amber-700", bg: "bg-amber-100" },
    in_progress: { color: "text-blue-700", bg: "bg-blue-100" },
    completed: { color: "text-emerald-700", bg: "bg-emerald-100" },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Operations"
        description="Task management, dock scheduling, and labor optimization."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Warehouse" }]}
        action={
          <Button onClick={() => setShowForm(true)} className="bg-black text-white hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" /> Add Task
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending Tasks" value={pendingCount} icon={Clock} color="amber" />
        <StatCard label="In Progress" value={inProgressCount} icon={Package} color="blue" />
        <StatCard label="Completed" value={completedCount} icon={CheckCircle2} color="emerald" />
        <StatCard label="High Priority" value={highPriorityCount} icon={AlertTriangle} color="red" />
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="border border-gray-200 animate-in slide-in-from-top-2 duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50">
                  <PackageCheck className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Create Warehouse Task</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Task Type *</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  <option value="pick">📦 Pick</option>
                  <option value="pack">📋 Pack</option>
                  <option value="ship">🚚 Ship</option>
                  <option value="receive">📥 Receive</option>
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors"
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>
              <div>
                <Label>Assigned Worker</Label>
                <Input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} placeholder="Worker name" className="mt-1" />
              </div>
              <div>
                <Label>Dock</Label>
                <Input value={form.dock} onChange={e => setForm({ ...form, dock: e.target.value })} placeholder="Dock A-3" className="mt-1" />
              </div>
              <div className="md:col-span-2 lg:col-span-4 flex gap-2 pt-2">
                <Button type="submit" disabled={saving} className="bg-black text-white hover:bg-gray-800">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {saving ? "Creating..." : "Create Task"}
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

      {/* Tasks List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<Warehouse className="h-8 w-8" />}
          title="No warehouse tasks yet"
          description="Create your first task to start managing warehouse operations efficiently."
          action={
            <Button onClick={() => setShowForm(true)} className="bg-black text-white">
              <Plus className="h-4 w-4 mr-2" /> Create Task
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const tc = typeConfig[task.type] || { label: task.type, color: "text-gray-700", bg: "bg-gray-100" };
            const pc = priorityConfig[task.priority] || priorityConfig.medium;
            const sc = statusConfig[task.status] || statusConfig.pending;

            return (
              <Card key={task.id} className="border border-gray-200 hover:shadow-md transition-all duration-200 group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn("grid h-10 w-10 place-items-center rounded-xl group-hover:scale-110 transition-transform", tc.bg)}>
                      <PackageCheck className={cn("h-5 w-5", tc.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", tc.bg, tc.color)}>
                          {tc.label}
                        </span>
                        <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", pc.bg, pc.color)}>
                          {task.priority}
                        </span>
                        <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", sc.bg, sc.color)}>
                          {task.status?.replace("_", " ") || "pending"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {task.assigned_to && (
                          <span className="flex items-center gap-1">
                            <span className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-600">
                              {task.assigned_to.charAt(0).toUpperCase()}
                            </span>
                            {task.assigned_to}
                          </span>
                        )}
                        {task.dock && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            📍 {task.dock}
                          </span>
                        )}
                      </div>
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
