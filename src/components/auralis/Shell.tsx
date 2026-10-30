"use client";

import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useApp, type NotificationItem } from "./store";
import { api, patch, timeAgo, Avatar } from "./ui";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import DashboardView from "./views/DashboardView";
import AppointmentsView from "./views/AppointmentsView";
import PatientsView from "./views/PatientsView";
import LeadsView from "./views/LeadsView";
import AiGrowthView from "./views/AiGrowthView";
import MarketingView from "./views/MarketingView";
import BillingView from "./views/BillingView";
import InventoryView from "./views/InventoryView";
import StaffView from "./views/StaffView";
import LocationsView from "./views/LocationsView";
import AnalyticsView from "./views/AnalyticsView";
import SettingsView from "./views/SettingsView";
import Concierge from "./Concierge";

// Icon resolver — nav item icons come from constants as string names
const Icon = ({ name, className }: { name: string; className?: string }) => {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.Circle;
  return <C className={className} />;
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { boot, activeView, setView } = useApp();
  return (
    <div className="flex h-full flex-col">
      <button onClick={() => { setView("dashboard"); onNavigate?.(); }} className="flex items-center gap-2.5 px-5 h-16 shrink-0">
        <span className="text-2xl leading-none text-amber-500">✦</span>
        <div className="text-left">
          <p className="font-display text-lg font-semibold text-stone-900 leading-none">Auralis</p>
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">MedSpa OS</p>
        </div>
      </button>
      <nav className="flex-1 overflow-y-auto auralis-light-scroll px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setView(item.id); onNavigate?.(); }}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-stone-900 text-white font-medium shadow-md shadow-stone-900/15"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              <Icon name={item.icon} className={cn("size-4 shrink-0", active ? "text-amber-400" : "text-stone-400")} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-amber-400/25 text-amber-300" : "bg-amber-100 text-amber-700"
                )}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-stone-100 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-stone-400 px-1">
          <span className={cn("size-1.5 rounded-full", boot?.dbMode === "TURSO" ? "bg-emerald-500" : "bg-amber-500")} />
          {boot?.dbMode === "TURSO" ? "Turso cloud connected" : "Local fallback DB"}
        </div>
        <button
          onClick={() => useApp.getState().setStage("landing")}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
        >
          <Icons.LogOut className="size-3.5" /> Exit to website
        </button>
      </div>
    </div>
  );
}

export default function Shell({ booting }: { booting: boolean }) {
  const { boot, activeView, branchFilter, setBranchFilter, notifications, unread, setNotifications, conciergeOpen } = useApp();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    api<{ notifications: NotificationItem[]; unread: number }>("/api/notifications")
      .then((d) => setNotifications(d.notifications, d.unread))
      .catch(() => {});
  }, [setNotifications]);

  if (booting || !boot) {
    return (
      <div className="min-h-screen grid place-items-center bg-stone-50">
        <div className="text-center">
          <div className="mx-auto size-14 rounded-2xl bg-stone-900 grid place-items-center mb-4 animate-pulse">
            <span className="text-2xl text-amber-400">✦</span>
          </div>
          <p className="font-display text-lg text-stone-700">Loading Auralis…</p>
          <p className="text-xs text-stone-400 mt-1">Connecting to Turso cloud</p>
        </div>
      </div>
    );
  }

  const user = boot.user!;
  const currentBranch = boot.branches.find((b) => b.id === branchFilter);

  async function markAllRead() {
    const d = await patch<{ unread: number }>("/api/notifications", {});
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })), d.unread);
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Desktop sidebar — light porcelain, onyx active pill */}
      <aside className="hidden lg:block w-64 shrink-0 bg-white fixed inset-y-0 left-0 z-40 border-r border-stone-200/80">
        <div className="h-full"><SidebarContent /></div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden fixed top-3 left-3 z-50 bg-white/90">
            <Icons.Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-white border-r border-stone-200">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMobileNav(false)} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 border-b border-stone-200 bg-white/80 backdrop-blur-md flex items-center gap-3 px-4 lg:px-6">
          <div className="hidden sm:block w-52 lg:w-56 ml-10 lg:ml-0">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-9 bg-white border-stone-200 text-sm">
                <Icons.MapPin className="size-3.5 text-emerald-700" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {boot.branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name} · {b.country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1" />
          {currentBranch && (
            <span className="hidden md:inline text-xs text-stone-400">
              {currentBranch.currency === "GBP" ? "£ GBP · VAT 20%" : "$ USD"} · {currentBranch.timezone.split("/")[1]?.replace("_", " ")}
            </span>
          )}
          <Button variant="outline" size="sm" className="hidden sm:inline-flex h-9 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            onClick={() => useApp.getState().setConciergeOpen(true)}>
            <Icons.Sparkles className="size-3.5 text-amber-500" /> Ask Aura AI
          </Button>
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative h-9 w-9 rounded-full">
                <Icons.Bell className="size-4 text-stone-500" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">
                    {unread}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                <p className="font-semibold text-sm">Notifications</p>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-emerald-700 hover:underline">Mark all read</button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto auralis-scroll">
                {notifications.length === 0 && <p className="text-sm text-stone-400 text-center py-8">You&apos;re all caught up ✦</p>}
                {notifications.map((n) => (
                  <div key={n.id} className={cn("px-4 py-3 border-b border-stone-50 flex gap-3", !n.isRead && "bg-emerald-50/40")}>
                    <div className="mt-0.5">
                      {n.type === "ALERT" ? <Icons.TriangleAlert className="size-4 text-amber-600" />
                        : n.type === "PAYMENT" ? <Icons.CreditCard className="size-4 text-emerald-700" />
                        : n.type === "LEAD" ? <Icons.Filter className="size-4 text-violet-600" />
                        : n.type === "AI" ? <Icons.Sparkles className="size-4 text-amber-500" />
                        : <Icons.Info className="size-4 text-stone-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-800">{n.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-stone-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="ml-auto mt-1.5 size-2 rounded-full bg-emerald-500 shrink-0" />}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {/* User */}
          <div className="flex items-center gap-2.5 pl-1">
            <Avatar name={user.name} color={user.avatarColor} size={34} />
            <div className="hidden md:block leading-tight">
              <p className="text-sm font-medium text-stone-800">{user.name}</p>
              <p className="text-[11px] text-stone-400">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>
        </header>

        {/* View container */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1500px] w-full mx-auto">
          <ViewRouter view={activeView} />
        </main>
      </div>

      {conciergeOpen && <Concierge />}
    </div>
  );
}

function ViewRouter({ view }: { view: string }) {
  switch (view) {
    case "dashboard": return <DashboardView />;
    case "appointments": return <AppointmentsView />;
    case "patients": return <PatientsView />;
    case "leads": return <LeadsView />;
    case "ai-growth": return <AiGrowthView />;
    case "marketing": return <MarketingView />;
    case "billing": return <BillingView />;
    case "inventory": return <InventoryView />;
    case "staff": return <StaffView />;
    case "locations": return <LocationsView />;
    case "analytics": return <AnalyticsView />;
    case "settings": return <SettingsView />;
    default: return <DashboardView />;
  }
}
