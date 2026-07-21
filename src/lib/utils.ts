import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-700",
    completed: "bg-emerald-100 text-emerald-700",
    in_transit: "bg-sky-100 text-sky-700",
    delivered: "bg-green-100 text-green-700",
    active: "bg-emerald-100 text-emerald-700",
    available: "bg-emerald-100 text-emerald-700",
    open: "bg-blue-100 text-blue-700",
    closed: "bg-neutral-100 text-neutral-700",
    escalated: "bg-red-100 text-red-700",
    positive: "bg-green-100 text-green-700",
    negative: "bg-red-100 text-red-700",
    neutral: "bg-blue-100 text-blue-700",
  };
  return colors[status] || "bg-neutral-100 text-neutral-700";
}

export function generateId(): string {
  return crypto.randomUUID();
}
