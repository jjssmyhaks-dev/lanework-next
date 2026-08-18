"use client";

import {
  Search, Package, Route, BarChart3, Plug, ScanLine,
  ShoppingCart, Truck, MapPin, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  template: string;
  color?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "track-shipment",
    label: "Track Shipment",
    icon: <Search className="h-4 w-4" />,
    template: "Track shipment ",
    color: "hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200",
  },
  {
    id: "check-inventory",
    label: "Check Inventory",
    icon: <Package className="h-4 w-4" />,
    template: "Check current inventory levels for all items ",
    color: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
  },
  {
    id: "plan-route",
    label: "Plan Route",
    icon: <Route className="h-4 w-4" />,
    template: "Optimize delivery routes for today's shipments ",
    color: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200",
  },
  {
    id: "generate-report",
    label: "Generate Report",
    icon: <BarChart3 className="h-4 w-4" />,
    template: "Generate a summary report of ",
    color: "hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200",
  },
  {
    id: "connect-integration",
    label: "Connect Integration",
    icon: <Plug className="h-4 w-4" />,
    template: "Connect ",
    color: "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200",
  },
  {
    id: "scan-barcode",
    label: "Scan Barcode",
    icon: <ScanLine className="h-4 w-4" />,
    template: "Scan barcode ",
    color: "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200",
  },
];

interface QuickActionsBarProps {
  onAction: (template: string) => void;
}

export default function QuickActionsBar({ onAction }: QuickActionsBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.template)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
            "border border-gray-200 text-gray-600 bg-white",
            "transition-all duration-150",
            action.color || "hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300",
            "focus:outline-none focus:ring-2 focus:ring-gray-200"
          )}
          title={action.label}
        >
          <span className="flex-shrink-0">{action.icon}</span>
          <span className="hidden sm:inline">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

export { QUICK_ACTIONS };
export type { QuickAction };
