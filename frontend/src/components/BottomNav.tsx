"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Wallet, Settings } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Bookings", href: "/bookings", icon: Calendar },
    { name: "Wallet", href: "/wallet", icon: Wallet },
    { name: "Admin", href: "/admin", icon: Settings },
  ];

  // Don't show bottom nav on login or signup pages
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white pb-safe">
      <nav className="flex h-16 max-w-md mx-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname?.startsWith(link.href);
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 ${
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
