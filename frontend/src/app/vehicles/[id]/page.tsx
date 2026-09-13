"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Wallet as WalletIcon,
  ShieldAlert,
  ChevronRight,
  User,
  Clock,
  Banknote,
  Building2,
  X,
  AlertCircle,
} from "lucide-react";

interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
  isActive: boolean;
  notes?: string;
  imageUrl?: string;
  ownerIds: string[];
}

interface VehicleStatus {
  status: "booked" | "available";
  until?: string;
  nextBookingDate?: string;
}

interface WalletData {
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
}

interface Booking {
  _id: string;
  customerName: string;
  startDate: string;
  endDate: string;
  isPaid: boolean;
  paid?: boolean;
  amount?: number;
  paymentMethod?: "cash" | "bank";
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [status, setStatus] = useState<VehicleStatus | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  const formatMonthParam = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const formatDateNice = (dateStr?: string | Date) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Initial parallel fetch
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const fetchInitialData = async () => {
      setLoading(true);
      setErrorStatus(null);
      setErrorMessage("");

      const monthParam = formatMonthParam(new Date());

      try {
        const [vehicleRes, statusRes, walletRes, bookingsRes] = await Promise.all([
          fetch(`${baseUrl}/api/vehicles/${id}`, { credentials: "include" }),
          fetch(`${baseUrl}/api/vehicles/${id}/status`, { credentials: "include" }),
          fetch(`${baseUrl}/api/vehicles/${id}/wallet`, { credentials: "include" }),
          fetch(`${baseUrl}/api/vehicles/${id}/bookings?month=${monthParam}`, { credentials: "include" }),
        ]);

        // Check for auth / permission errors
        if (
          vehicleRes.status === 401 ||
          statusRes.status === 401 ||
          walletRes.status === 401 ||
          bookingsRes.status === 401
        ) {
          router.push("/login");
          return;
        }

        if (
          vehicleRes.status === 403 ||
          statusRes.status === 403 ||
          walletRes.status === 403 ||
          bookingsRes.status === 403
        ) {
          if (isMounted) {
            setErrorStatus(403);
            setErrorMessage("You do not have permission to view this vehicle.");
            setLoading(false);
          }
          return;
        }

        if (vehicleRes.status === 404) {
          if (isMounted) {
            setErrorStatus(404);
            setErrorMessage("Vehicle not found.");
            setLoading(false);
          }
          return;
        }

        if (!vehicleRes.ok) throw new Error("Failed to load vehicle details");
        if (!statusRes.ok) throw new Error("Failed to load vehicle status");
        if (!walletRes.ok) throw new Error("Failed to load vehicle wallet");
        if (!bookingsRes.ok) throw new Error("Failed to load vehicle bookings");

        const vehicleData = await vehicleRes.json();
        const statusData = await statusRes.json();
        const walletData = await walletRes.json();
        const bookingsData = await bookingsRes.json();

        if (isMounted) {
          setVehicle(vehicleData);
          setStatus(statusData);
          setWallet(walletData.wallet || walletData);
          setBookings(bookingsData);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorStatus(500);
          setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, [id, baseUrl, router]);

  // Re-fetch bookings when the visible month changes
  const handleMonthChange = useCallback(
    async (newMonth: Date) => {
      setCurrentMonth(newMonth);
      setSelectedBooking(null);
      if (!id) return;

      setCalendarLoading(true);
      const monthParam = formatMonthParam(newMonth);

      try {
        const res = await fetch(`${baseUrl}/api/vehicles/${id}/bookings?month=${monthParam}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setBookings(data);
        }
      } catch (err) {
        console.error("Failed to re-fetch bookings for month", err);
      } finally {
        setCalendarLoading(false);
      }
    },
    [id, baseUrl]
  );

  // Expand each booking's date range into individual days clipped to visible month
  const bookedDays = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    const dates: Date[] = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    for (const b of bookings) {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);

      // Clip start and end to the visible month
      const startClipped = new Date(Math.max(start.getTime(), monthStart.getTime()));
      const endClipped = new Date(Math.min(end.getTime(), monthEnd.getTime()));

      const cur = new Date(startClipped);
      cur.setHours(12, 0, 0, 0); // use noon to prevent timezone shifts

      const finalEnd = new Date(endClipped);
      finalEnd.setHours(12, 0, 0, 0);

      while (cur <= finalEnd) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }

    return dates;
  }, [bookings, currentMonth]);

  // When a day on the calendar is clicked, check if there is a matching booking
  const handleDayClick = (day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const match = bookings.find((b) => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return bStart <= dayEnd && bEnd >= dayStart;
    });

    if (match) {
      setSelectedBooking(match);
    } else {
      setSelectedBooking(null);
    }
  };

  // 403 Forbidden State
  if (errorStatus === 403) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          This vehicle is only accessible to authorized vehicle owners or system administrators.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Garage
        </Link>
      </div>
    );
  }

  // 404 Not Found State
  if (errorStatus === 404) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Vehicle Not Found</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          The requested vehicle does not exist or may have been removed.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Garage
        </Link>
      </div>
    );
  }

  // Generic Error State
  if (errorStatus && errorStatus !== 403 && errorStatus !== 404) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Something Went Wrong</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Top Bar with Back Button */}
      <div className="px-6 pt-8 pb-3 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2a2a46] transition-colors"
          aria-label="Back to Garage"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Vehicle Details
        </span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {loading ? (
        /* Loading Skeleton */
        <div className="px-6 flex flex-col gap-6 mt-4">
          {/* Header Skeleton */}
          <div className="space-y-3">
            <div className="h-8 bg-[#1a1a2e] rounded-xl w-3/4 animate-pulse" />
            <div className="h-6 bg-[#1a1a2e] rounded-lg w-1/3 animate-pulse" />
            <div className="h-6 bg-[#1a1a2e] rounded-lg w-1/2 animate-pulse" />
          </div>

          {/* Wallet Skeleton */}
          <div className="h-44 bg-[#1a1a2e] rounded-3xl animate-pulse" />

          {/* Calendar Skeleton */}
          <div className="h-80 bg-[#1a1a2e] rounded-3xl animate-pulse" />
        </div>
      ) : (
        <div className="px-6 flex flex-col gap-6 mt-2">
          {/* 1. Header Section (top-left aligned) */}
          <header className="flex flex-col items-start space-y-2.5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {vehicle?.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-mono text-xs font-semibold tracking-wider text-slate-300 bg-[#12121f] px-2.5 py-1 rounded-md border border-white/10">
                  {vehicle?.plateNumber}
                </span>
                {!vehicle?.isActive && (
                  <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic Status Line */}
            <div className="pt-1">
              {status?.status === "booked" ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                  <span>Booked until {formatDateNice(status.until)}</span>
                </div>
              ) : status?.status === "available" && status?.nextBookingDate ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                  <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  <span>
                    Available — next booking {formatDateNice(status.nextBookingDate)}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                  <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  <span>Available</span>
                </div>
              )}
            </div>
          </header>

          {/* 2. Wallet Section */}
          <section className="relative overflow-hidden bg-[#1a1a2e] rounded-3xl p-5 border border-white/10 card-gradient-purple shadow-xl">
            {/* Ambient background glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2 text-slate-400">
                <WalletIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Vehicle Wallet
                </span>
              </div>
              <span className="text-[11px] font-medium text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                Live Balance
              </span>
            </div>

            {/* Total Balance */}
            <div className="mb-5 relative z-10">
              <p className="text-xs text-slate-400 mb-1">Total Balance</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {formatCurrency(wallet?.totalBalance || 0)}
              </p>
            </div>

            {/* Cash & Bank Balances */}
            <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
              <div className="bg-[#12121f]/80 backdrop-blur-sm rounded-2xl p-3 border border-white/5">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cash</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(wallet?.cashBalance || 0)}
                </p>
              </div>

              <div className="bg-[#12121f]/80 backdrop-blur-sm rounded-2xl p-3 border border-white/5">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Bank</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {formatCurrency(wallet?.bankBalance || 0)}
                </p>
              </div>
            </div>

            {/* View All Transactions Link */}
            <Link
              href={`/vehicles/${id}/wallet`}
              className="w-full btn-ghost rounded-xl py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 text-indigo-300 hover:text-white relative z-10"
            >
              <span>View all transactions</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </section>

          {/* 3. Booking Calendar Section */}
          <section className="bg-[#1a1a2e] rounded-3xl p-5 border border-white/10 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Booking Calendar</h2>
                  <p className="text-[11px] text-slate-400">Monthly vehicle availability</p>
                </div>
              </div>

              {calendarLoading && (
                <span className="text-[11px] text-indigo-400 animate-pulse font-medium">
                  Updating...
                </span>
              )}
            </div>

            {/* Calendar Component */}
            <div className="flex justify-center my-2">
              <DayPicker
                className="renteasy-calendar"
                month={currentMonth}
                onMonthChange={handleMonthChange}
                modifiers={{
                  booked: bookedDays,
                }}
                modifiersClassNames={{
                  booked: "rdp-booked",
                }}
                onDayClick={handleDayClick}
              />
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center justify-around pt-3 mt-2 border-t border-white/5 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-md bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-md border border-indigo-400" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-md bg-slate-700" />
                <span>Available</span>
              </div>
            </div>

            {/* Selected Booking Popover / Card */}
            {selectedBooking && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[#12121f] border border-rose-500/30 shadow-lg relative animate-in fade-in duration-200">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white"
                  aria-label="Close booking details"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Active Booking Information</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" /> Customer:
                    </span>
                    <span className="font-semibold text-white">
                      {selectedBooking.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-slate-200">
                      {formatDateNice(selectedBooking.startDate)} –{" "}
                      {formatDateNice(selectedBooking.endDate)}
                    </span>
                  </div>
                  {selectedBooking.amount !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Amount:</span>
                      <span className="font-semibold text-white">
                        {formatCurrency(selectedBooking.amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        selectedBooking.isPaid || selectedBooking.paid
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {selectedBooking.isPaid || selectedBooking.paid ? "Paid" : "Unpaid"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
