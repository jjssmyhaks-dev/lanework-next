"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare, LayoutDashboard, Truck, Package, Route, Warehouse, Users,
  LogOut, Menu, X, Bot, Shield, BookOpen, Plug, ChevronDown, IndianRupee,
  CreditCard, BarChart3,  Settings, AlertTriangle, CheckCircle, Zap, BookMarked
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { GlobalSearch } from "@/components/ui/global-search";
import { NotificationBell } from "@/components/ui/notification-bell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ToastProvider } from "@/components/ui/toast";

// ── Organized Navigation with role requirements ──

const primaryNav = [
  { href: "/chat", label: "Chat", icon: MessageSquare, minRole: "viewer" as const },
];

const operationsNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, minRole: "viewer" as const },
  { href: "/shipment", label: "Shipments", icon: Truck, minRole: "viewer" as const },
  { href: "/inventory", label: "Inventory", icon: Package, minRole: "viewer" as const },
  { href: "/routes", label: "Routes", icon: Route, minRole: "viewer" as const },
  { href: "/warehouse", label: "Warehouse", icon: Warehouse, minRole: "viewer" as const },
  { href: "/fleet", label: "Fleet", icon: Users, minRole: "viewer" as const },
  { href: "/customer", label: "Customers", icon: BookOpen, minRole: "viewer" as const },
];

const agentsNav = [
  { href: "/agents", label: "Agents", icon: Bot, minRole: "member" as const },
  { href: "/agents/control", label: "Control Panel", icon: Settings, minRole: "admin" as const },
  { href: "/agents/harness", label: "Harness", icon: Zap, minRole: "admin" as const },
  { href: "/approvals", label: "Approvals", icon: CheckCircle, minRole: "admin" as const },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle, minRole: "admin" as const },
  { href: "/agents/metrics", label: "Metrics", icon: BarChart3, minRole: "admin" as const },
  { href: "/agents/trust", label: "Trust Settings", icon: Shield, minRole: "admin" as const },
];

const settingsNav = [
  { href: "/integrations", label: "Integrations", icon: Plug, minRole: "admin" as const },
  { href: "/knowledge", label: "Knowledge Base", icon: BookMarked, minRole: "member" as const },
  { href: "/team", label: "Team", icon: Users, minRole: "admin" as const },
  { href: "/pricing", label: "Pricing", icon: IndianRupee, minRole: "admin" as const },
  { href: "/billing", label: "Billing", icon: CreditCard, minRole: "super_admin" as const },
];

const ROLE_LEVELS: Record<string, number> = {
  super_admin: 0,
  admin: 1,
  member: 2,
  viewer: 3,
};

function canAccess(userRole: string | null | undefined, minRole: string): boolean {
  if (!userRole) return true; // No org yet — show all (they'll create one)
  const userLevel = ROLE_LEVELS[userRole] ?? 3;
  const requiredLevel = ROLE_LEVELS[minRole] ?? 3;
  return userLevel <= requiredLevel;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentsExpanded, setAgentsExpanded] = useState(true);

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

  const userRole = (user as any).orgRole || "viewer";
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const filterByRole = <T extends { minRole: string }>(items: T[]) =>
    items.filter(item => canAccess(userRole, item.minRole));

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
          {filterByRole(primaryNav).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive(item.href) ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          ))}

          {/* Operations */}
          <div className="pt-3 pb-1">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Operations</p>
          </div>
          {filterByRole(operationsNav).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                isActive(item.href) ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          ))}

          {/* AI Agents */}
          <div className="pt-3 pb-1">
            <button
              onClick={() => setAgentsExpanded(!agentsExpanded)}
              className="flex items-center gap-2 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 w-full"
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", !agentsExpanded && "-rotate-90")} />
              AI Agents
            </button>
          </div>
          {agentsExpanded && filterByRole(agentsNav).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                isActive(item.href) ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          ))}

          {/* Settings */}
          <div className="pt-3 pb-1">
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Settings</p>
          </div>
          {filterByRole(settingsNav).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                isActive(item.href) ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          ))}
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
                <p className="text-xs text-gray-500 truncate">{user.org ? user.org.name : "No organisation"}</p>
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
        {/* Header */}
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

          {/* Notification Bell */}
          <NotificationBell />

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

        {/* Page content */}
        <main className="flex-1 overflow-hidden bg-gray-50">
          <div className="h-full"><ErrorBoundary>{children}</ErrorBoundary></div>
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
