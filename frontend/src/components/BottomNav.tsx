"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Settings, Calendar, Wallet, Car } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  // Don't show bottom nav on login, signup, admin, or booking flow pages
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/" ||
    pathname?.startsWith("/admin") ||
    pathname?.endsWith("/book")
  ) {
    return null;
  }

  // Check if we are inside a vehicle detail section (/vehicles/[id]...)
  const vehicleMatch = pathname?.match(/^\/vehicles\/([^/]+)/);
  const vehicleId = vehicleMatch ? vehicleMatch[1] : null;

  const links = vehicleId
    ? [
        { name: "Home", href: `/vehicles/${vehicleId}`, icon: Home, exact: true },
        { name: "Bookings", href: `/vehicles/${vehicleId}/bookings`, icon: Calendar, exact: false },
        { name: "Wallet", href: `/vehicles/${vehicleId}/wallet`, icon: Wallet, exact: false },
        { name: "Details", href: `/vehicles/${vehicleId}/details`, icon: Car, exact: false },
      ]
    : [
        { name: "Garage", href: "/dashboard", icon: Home, exact: false },
        { name: "Profile", href: "/profile", icon: User, exact: false },
        { name: "Settings", href: "/settings", icon: Settings, exact: false },
      ];

  // Find active index for the sliding animation
  const activeIndex = links.findIndex((link) => {
    if (link.exact) {
      return pathname === link.href;
    }
    return pathname?.startsWith(link.href);
  });
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div className="fixed bottom-6 max-w-[420px] w-[calc(100%-2rem)] left-1/2 -translate-x-1/2 z-50">
      <nav className="relative flex items-center h-[72px] rounded-full bg-[#16162a]/90 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl px-2">
        
        {/* Sliding Active Pill */}
        <div 
          className="absolute left-2 top-2 bottom-2 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-gradient-to-b from-indigo-500/25 to-indigo-600/10 border border-indigo-400/30 shadow-[0_0_24px_rgba(99,102,241,0.25)]"
          style={{ 
            width: `calc((100% - 16px) / ${links.length})`,
            transform: `translateX(${safeIndex * 100}%)` 
          }}
        />

        {/* Navigation Items */}
        {links.map((link, index) => {
          const Icon = link.icon;
          const isActive = index === safeIndex;
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className="relative z-10 flex flex-1 flex-col items-center justify-center h-full min-h-[44px] rounded-full transition-all duration-200 active:scale-95 group"
            >
              <Icon 
                className={`h-5 w-5 mb-1 transition-all duration-200 ${
                  isActive 
                    ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" 
                    : "text-slate-400 group-hover:text-slate-200"
                }`} 
                strokeWidth={isActive ? 2.5 : 1.75}
              />
              <span className={`text-[11px] tracking-wide transition-all duration-200 ${
                isActive ? "text-white font-semibold" : "text-slate-400 font-medium group-hover:text-slate-200"
              }`}>
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
