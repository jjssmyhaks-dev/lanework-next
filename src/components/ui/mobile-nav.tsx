"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, LayoutDashboard, MessageSquare, Truck, Package,
  Route, Warehouse, Users, Plug, Bot, Shield, BarChart3,
  Bell, Settings, IndianRupee, CreditCard, BookMarked, Flag,
  Activity, AlertTriangle, CheckCircle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/shipment", label: "Shipments", icon: Truck },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/fleet", label: "Fleet", icon: Truck },
  { href: "/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/routes", label: "Routes", icon: Route },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/agents", label: "AI Agents", icon: Bot },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/team", label: "Team", icon: Users },
  { href: "/knowledge", label: "Knowledge Base", icon: BookMarked },
  { href: "/monitoring", label: "Monitoring", icon: Activity },
  { href: "/feature-flags", label: "Feature Flags", icon: Flag },
  { href: "/pricing", label: "Pricing", icon: IndianRupee },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-white border border-gray-200 shadow-sm"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out panel */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200">
          <div className="w-8 h-8 bg-[#1a1a2e] rounded-lg flex items-center justify-center">
            <div className="w-3.5 h-3.5 bg-white rounded-sm rotate-45" />
          </div>
          <span className="font-bold text-[#1a1a2e]">Lanework</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1" role="navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#1a1a2e] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
