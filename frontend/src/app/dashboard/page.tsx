"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, AlertCircle, Plus, X, Copy, Check, Calendar, Wallet, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
  isActive?: boolean;
  totalBookings?: number;
  monthBookings?: number;
  currentBalance?: number;
  currentBookingStatus?: {
    isBooked: boolean;
    endsAt?: string;
    nextBookingDate?: string;
    hasNextBookingThisMonth: boolean;
    customerName?: string;
    message?: string;
  };
}

interface User {
  _id: string;
  username: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatFriendlyDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();

    const isToday = d.toDateString() === now.toDateString();

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;

    const datePart = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    return `${datePart}, ${timeStr}`;
  };

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText("9496432072");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
        
        // Fetch user info
        const userRes = await fetch(`${baseUrl}/api/user/me`, { credentials: "include" });
        if (!userRes.ok) {
          if (userRes.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to load user info");
        }
        const userData = await userRes.json();
        setUser(userData);

        // Fetch user vehicles
        const vehiclesRes = await fetch(`${baseUrl}/api/user/vehicles`, { credentials: "include" });
        if (!vehiclesRes.ok) throw new Error("Failed to load vehicles");
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 sticky top-0 z-10 bg-[#0b0b18]/90 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">My Garage</h1>
            <p className="text-sm text-slate-400 mt-1">Manage your vehicles</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowContactModal(true)}
              className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2a2a46] transition-colors"
              aria-label="Add Vehicle"
            >
              <Plus className="w-5 h-5" />
            </button>
            <Link href="/profile">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full rounded-full bg-[#12121f] flex items-center justify-center">
                  <span className="text-sm font-medium text-white uppercase">
                    {user ? user.username.charAt(0) : "?"}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-6 flex flex-col mt-2">
        {loading ? (
          <div className="flex flex-col gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1a1a2e] rounded-3xl p-5 border border-white/5 animate-pulse h-48"></div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
            <p className="text-rose-400">{error}</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-[#12121f] rounded-3xl border border-white/5 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
              <Car className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No vehicles found</h3>
            <p className="text-sm text-slate-400 max-w-[250px]">
              You don&apos;t have any vehicles assigned to your account yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {vehicles.map((car) => {
              const isBooked = !!car.currentBookingStatus?.isBooked;

              return (
                <div
                  key={car._id}
                  className="bg-[#1a1a2e] rounded-3xl p-5 border border-white/5 relative overflow-hidden shadow-lg group hover:border-white/10 transition-all flex flex-col gap-4"
                >
                  {/* Ambient Background Glow */}
                  <div
                    className={`absolute top-0 right-0 w-36 h-36 blur-[50px] rounded-full -mr-10 -mt-10 pointer-events-none transition-colors ${
                      isBooked ? "bg-amber-500/10" : "bg-indigo-500/10"
                    }`}
                  />

                  {/* Header: Identity + Status Badge */}
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex gap-3.5 items-center">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                          isBooked
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        }`}
                      >
                        <Car className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">
                          {car.name}
                        </h3>
                        <span className="text-xs font-mono font-medium text-slate-400 bg-[#0f0f20] px-2 py-0.5 rounded-md border border-white/5 mt-1 inline-block">
                          {car.plateNumber}
                        </span>
                      </div>
                    </div>

                    {/* Live Status Pill */}
                    {isBooked ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        In Booking
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Available
                      </div>
                    )}
                  </div>

                  {/* Booking Status Banner */}
                  <div className="relative z-10">
                    {isBooked ? (
                      <div className="bg-gradient-to-r from-amber-500/10 via-[#171728] to-[#12121f] rounded-2xl p-3.5 border border-amber-500/20 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                              Currently In Booking
                            </span>
                            {car.currentBookingStatus?.customerName && (
                              <span className="text-xs text-slate-400 truncate">
                                • {car.currentBookingStatus.customerName}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-white mt-0.5">
                            Ends {formatFriendlyDateTime(car.currentBookingStatus?.endsAt)}
                          </p>
                        </div>
                      </div>
                    ) : car.currentBookingStatus?.hasNextBookingThisMonth &&
                      car.currentBookingStatus.nextBookingDate ? (
                      <div className="bg-[#12121f] rounded-2xl p-3.5 border border-white/5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Next Booking (This Month)
                          </span>
                          <p className="text-sm font-semibold text-white mt-0.5">
                            {formatFriendlyDateTime(car.currentBookingStatus.nextBookingDate)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#12121f] rounded-2xl p-3.5 border border-white/5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Booking Status
                          </span>
                          <p className="text-sm font-medium text-slate-300 mt-0.5">
                            No upcoming bookings this month
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2-Column Metrics */}
                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <div className="bg-[#12121f] rounded-2xl p-3.5 border border-white/5 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <p className="text-xs font-medium text-slate-400">This Month</p>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-xl font-bold text-white tracking-tight">
                          {car.monthBookings ?? 0}
                        </p>
                        <span className="text-xs text-slate-500 font-medium">bookings</span>
                      </div>
                    </div>

                    <div className="bg-[#12121f] rounded-2xl p-3.5 border border-white/5 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <p className="text-xs font-medium text-slate-400">Current Balance</p>
                      </div>
                      <p
                        className={`text-xl font-bold tracking-tight ${
                          (car.currentBalance ?? 0) < 0
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {formatCurrency(car.currentBalance ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Manage Button */}
                  <Link
                    href={`/vehicles/${car._id}`}
                    className="w-full btn-primary rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 relative z-10 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99] transition-all group/btn"
                  >
                    <span>Manage {car.name.split(" ")[0]}</span>
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#12121f] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2">Add New Vehicle</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              For Adding new vehicle Contact the Developer:
            </p>
            <div className="bg-[#0f0f20] rounded-xl p-4 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Name</span>
                <span className="text-sm font-medium text-white">muhammed safvan</span>
              </div>
              <div className="flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" onClick={handleCopyPhone}>
                <span className="text-sm text-slate-500">Phone</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">9496432072</span>
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full mt-6 btn-primary rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
