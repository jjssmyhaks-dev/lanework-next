"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare, LayoutDashboard, Truck, Package, Route, Warehouse, Users,
  LogOut, Menu, X, Bot, Shield, BookOpen, Plug, ChevronDown, Settings, IndianRupee
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { GlobalSearch } from "@/components/ui/global-search";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ToastProvider } from "@/components/ui/toast";

const primaryNav = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

const secondaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/shipment", label: "Shipments", icon: Truck },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/routes", label: "Routes", icon: Route },
  { href: "/warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/fleet", label: "Fleet", icon: Users },
  { href: "/customer", label: "Customers", icon: BookOpen },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/onboarding", label: "Setup", icon: Shield },
  { href: "/pricing", label: "Pricing", icon: IndianRupee },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !loading && !user) { router.push("/login"); }
  }, [mounted, loading, user, router]);



  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <ToastProvider>
    <div className="flex h-screen overflow-hidden bg-white">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link href="/chat" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-black">
              <div className="h-3.5 w-3.5 rounded-sm bg-white" style={{ transform: "rotate(45deg)" }} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-black">Lanework</span>
          </Link>
          <button className="lg:hidden p-1 rounded-md hover:bg-gray-100" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Primary — Chat */}
          {primaryNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="pt-3 pb-1">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Manage</p>
          </div>

          {/* Secondary — collapsed by default on mobile, always visible on desktop */}
          <div className={cn("space-y-1", !secondaryOpen && "hidden lg:block")}>
            {secondaryNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                    isActive ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Expand/collapse secondary on mobile */}
          <button
            onClick={() => setSecondaryOpen(!secondaryOpen)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-700"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", secondaryOpen && "rotate-180")} />
            {secondaryOpen ? "Less" : "More"}
          </button>
        </nav>

        {/* User */}
        <div className="border-t border-gray-200 p-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user.email || ""}</p>
              </div>
              <button
                onClick={() => { logout(); router.push("/login"); }}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header — minimal, just search + mobile toggle */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white gap-4">
          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div className="hidden sm:block flex-1 max-w-sm">
            <GlobalSearch />
          </div>
          <div className="flex-1 sm:hidden" />
          {user && (
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <button
                onClick={() => { logout(); router.push("/login"); }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <LogOut className="h-3.5 w-3.5" />Sign out
              </button>
            </div>
          )}
        </header>

        {/* Page content — full height for chat */}
        <main className="flex-1 overflow-hidden bg-gray-50">
          <div className="h-full"><ErrorBoundary>{children}</ErrorBoundary></div>
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
