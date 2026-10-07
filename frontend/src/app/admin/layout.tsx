"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Car, LogOut, Menu, X } from "lucide-react";
import { api, clearAuthToken } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: Home },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Vehicles", href: "/admin/vehicles", icon: Car },
  ];

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
      clearAuthToken();
      router.push("/login");
      router.refresh();
    } catch (err: unknown) {
      logger.error("Failed to logout", err);
    }
  };

  const getPageTitle = () => {
    if (pathname === "/admin/vehicles/add") return "Add Vehicle";
    if (pathname?.startsWith("/admin/vehicles/")) return "Vehicle Detail";
    return navItems.find((item) => pathname?.startsWith(item.href))?.name || "Admin Portal";
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64">
      {/* Brand Header */}
      <div className="p-5 sm:p-6 flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5"
        >
          <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5 text-white" />
          </span>
          <span>
            RentEasy <span className="text-xs sm:text-sm font-normal text-indigo-400">Admin</span>
          </span>
        </Link>

        {/* Close button for mobile drawer */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Action */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-layout flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-Over Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:hidden transition-transform duration-300 ease-in-out shadow-2xl ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white lg:rounded-l-2xl lg:shadow-[-10px_0_30px_rgba(0,0,0,0.05)] lg:my-2 lg:mr-2">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-base sm:text-xl font-bold text-slate-800 truncate">
              {getPageTitle()}
            </h1>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-xs text-slate-700">Admin User</p>
              <p className="text-slate-400 text-[10px]">System Administrator</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shadow-xs">
              A
            </div>
          </div>
        </header>

        {/* Scrollable Page Content Container */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50">
          {children}
        </div>
      </main>
    </div>
  );
}
