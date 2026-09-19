"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, Car, LogOut } from "lucide-react";
import { API_BASE_URL as baseUrl } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: Home },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Vehicles", href: "/admin/vehicles", icon: Car },
  ];

  const handleLogout = async () => {
    try {
      await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Failed to logout", err);
    }
  };

  return (
    <div className="admin-layout flex h-screen w-full bg-[#f8fafc] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </span>
            RentEasy <span className="text-sm font-normal text-indigo-400 mt-1">Admin</span>
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all text-left"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white rounded-l-2xl shadow-[-10px_0_30px_rgba(0,0,0,0.05)] my-2 mr-2">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white shrink-0">
          <h1 className="text-xl font-semibold text-slate-800">
            {navItems.find(item => pathname?.startsWith(item.href))?.name || "Dashboard"}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right">
              <p className="font-medium text-slate-700">Admin User</p>
              <p className="text-slate-400 text-xs">System Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50/50">
          {children}
        </div>
      </main>
    </div>
  );
}
