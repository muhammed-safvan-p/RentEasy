"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  User,
  Banknote,
  Building2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Car,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
  imageUrl?: string;
  dailyRate?: number;
  hourlyRate?: number;
  fuelType?: string;
  transmission?: string;
  seatingCapacity?: number;
  isActive?: boolean;
}

interface CalendarBooking {
  id: string;
  _id: string;
  customerName: string;
  startDateTime: string;
  endDateTime: string;
  isCancelled: boolean;
  totalAmount: number;
}

interface ConfirmedBooking {
  _id: string;
  vehicleId?: string;
  customerName: string;
  startDateTime: string;
  endDateTime: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod?: "cash" | "bank" | null;
}

// Format a Date object to "YYYY-MM-DDTHH:mm" for datetime-local input
const toLocalISOString = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Format currency in INR
const formatCurrency = (amount: number = 0) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date nicely
const formatDateNice = (dateStr?: string | Date) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function VehicleBookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  // State
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form Fields
  const [customerName, setCustomerName] = useState("");

  // Default start date = next clean hour, end date = +24 hours
  const [startDateTime, setStartDateTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return toLocalISOString(now);
  });

  const [endDateTime, setEndDateTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 25, 0, 0, 0);
    return toLocalISOString(now);
  });

  // Total amount & manual override tracking
  const [customTotalAmount, setCustomTotalAmount] = useState<number | null>(null);
  const isAmountOverridden = customTotalAmount !== null;

  // Initial Payment states
  const [recordPaymentNow, setRecordPaymentNow] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [paymentNote, setPaymentNote] = useState("");

  // Success State
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);

  // 1. Fetch Vehicle & Existing Calendar Bookings
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const [vehRes, calRes] = await Promise.all([
          fetch(`${baseUrl}/api/vehicles/${id}`, { credentials: "include" }),
          fetch(`${baseUrl}/api/vehicles/${id}/calendar`, { credentials: "include" }),
        ]);

        if (vehRes.status === 401 || calRes.status === 401) {
          router.push("/login");
          return;
        }

        if (!vehRes.ok) throw new Error("Could not fetch vehicle details");

        const vehData = await vehRes.json();
        const calData = calRes.ok ? await calRes.json() : { bookings: [] };

        if (isMounted) {
          setVehicle(vehData);
          setCalendarBookings(calData.bookings || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to load booking data");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, baseUrl, router]);

  // 2. Duration & Pricing Calculations
  const durationInfo = useMemo(() => {
    if (!startDateTime || !endDateTime) return null;
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0 || isNaN(diffMs)) {
      return {
        isValid: false,
        diffMs: 0,
        totalHours: 0,
        days: 0,
        remainingHours: 0,
        label: "Invalid duration",
      };
    }

    const totalHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    let label = "";
    if (days > 0 && remainingHours > 0) {
      label = `${days}d ${remainingHours}h`;
    } else if (days > 0) {
      label = `${days} day${days > 1 ? "s" : ""}`;
    } else {
      label = `${totalHours} hour${totalHours > 1 ? "s" : ""}`;
    }

    return {
      isValid: true,
      diffMs,
      totalHours,
      days,
      remainingHours,
      label,
    };
  }, [startDateTime, endDateTime]);

  // Calculate Suggested Rent based on vehicle rates
  const suggestedRent = useMemo(() => {
    if (!vehicle || !durationInfo || !durationInfo.isValid) return 0;
    const { totalHours, diffMs } = durationInfo;

    if (vehicle.hourlyRate && vehicle.hourlyRate > 0) {
      return totalHours * vehicle.hourlyRate;
    }
    if (vehicle.dailyRate && vehicle.dailyRate > 0) {
      const rentalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return rentalDays * vehicle.dailyRate;
    }
    return 0;
  }, [vehicle, durationInfo]);

  // Derived effective total amount (no effect required)
  const totalAmount = isAmountOverridden && customTotalAmount !== null ? customTotalAmount : suggestedRent;

  // 3. Overlap Conflict Detection
  const conflictingBooking = useMemo(() => {
    if (!durationInfo || !durationInfo.isValid) return null;
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    return calendarBookings.find((b) => {
      if (b.isCancelled) return false;
      const bStart = new Date(b.startDateTime);
      const bEnd = new Date(b.endDateTime);
      // Overlap: (bStart < end) && (bEnd > start)
      return bStart < end && bEnd > start;
    });
  }, [calendarBookings, startDateTime, endDateTime, durationInfo]);

  // Remaining balance calculation
  const remainingBalance = useMemo(() => {
    const total = Number(totalAmount) || 0;
    const paid = recordPaymentNow ? Number(paidAmount) || 0 : 0;
    return Math.max(0, total - paid);
  }, [totalAmount, recordPaymentNow, paidAmount]);

  // Quick Preset Handlers
  const handleApplyPreset = (daysToAdd: number) => {
    const start = startDateTime ? new Date(startDateTime) : new Date();
    const end = new Date(start.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    setEndDateTime(toLocalISOString(end));
    setCustomTotalAmount(null);
  };

  const handleApplyWeekendPreset = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0: Sun, 5: Fri
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;

    const friday = new Date(now);
    friday.setDate(now.getDate() + daysUntilFriday);
    friday.setHours(17, 0, 0, 0); // Friday 5:00 PM

    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    sunday.setHours(21, 0, 0, 0); // Sunday 9:00 PM

    setStartDateTime(toLocalISOString(friday));
    setEndDateTime(toLocalISOString(sunday));
    setCustomTotalAmount(null);
  };

  // Quick Payment Percentage Handlers
  const setPaymentFraction = (fraction: number) => {
    const calculated = Math.round(totalAmount * fraction);
    setPaidAmount(calculated);
  };

  // 4. Form Submit Handler
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;

    // Validation
    if (!customerName.trim()) {
      setErrorMessage("Please enter the customer name.");
      return;
    }

    if (!durationInfo || !durationInfo.isValid) {
      setErrorMessage("End date & time must be strictly after the start date & time.");
      return;
    }

    if (conflictingBooking) {
      setErrorMessage("The vehicle is already booked during this time range. Please pick other dates.");
      return;
    }

    if (totalAmount < 0) {
      setErrorMessage("Total rental amount must be greater than or equal to 0.");
      return;
    }

    if (recordPaymentNow && paidAmount > totalAmount) {
      setErrorMessage("Paid amount cannot exceed the total rental amount.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Create Booking
      const createRes = await fetch(`${baseUrl}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vehicleId: vehicle._id,
          customerName: customerName.trim(),
          startDateTime: new Date(startDateTime).toISOString(),
          endDateTime: new Date(endDateTime).toISOString(),
          totalAmount: Number(totalAmount),
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        throw new Error(createData.message || "Failed to create booking");
      }

      const newBooking = createData.booking;

      // 2. Record Payment if toggled and amount > 0
      let finalPaidAmount = 0;
      let finalBalanceAmount = Number(totalAmount);

      if (recordPaymentNow && Number(paidAmount) > 0) {
        const paymentRes = await fetch(`${baseUrl}/api/bookings/${newBooking._id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            amount: Number(paidAmount),
            paymentMethod: paymentMethod,
            note: paymentNote.trim() || `Advance payment via ${paymentMethod}`,
          }),
        });

        const paymentData = await paymentRes.json();
        if (paymentRes.ok && paymentData.booking) {
          finalPaidAmount = paymentData.booking.paidAmount;
          finalBalanceAmount = paymentData.booking.balanceAmount;
        }
      }

      // Success! Set confirmed state
      setConfirmedBooking({
        ...newBooking,
        paidAmount: finalPaidAmount,
        balanceAmount: finalBalanceAmount,
        paymentMethod: recordPaymentNow && Number(paidAmount) > 0 ? paymentMethod : null,
      });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while creating booking."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Loading Skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen px-6 pt-8 pb-32 animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#1a1a2e]" />
          <div className="w-32 h-5 bg-[#1a1a2e] rounded-lg" />
          <div className="w-10" />
        </div>
        <div className="h-28 bg-[#1a1a2e] rounded-3xl" />
        <div className="h-20 bg-[#1a1a2e] rounded-2xl" />
        <div className="h-44 bg-[#1a1a2e] rounded-3xl" />
        <div className="h-24 bg-[#1a1a2e] rounded-2xl" />
      </div>
    );
  }

  // Confirmed Booking Screen
  if (confirmedBooking) {
    return (
      <div className="flex flex-col min-h-screen px-6 pt-8 pb-12 animate-in fade-in zoom-in-95 duration-300">
        {/* Success Header */}
        <div className="flex flex-col items-center text-center mt-6 mb-8">
          <div className="w-18 h-18 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_35px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">
            Confirmed
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Booking Created!
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Reservation has been registered and scheduled into the fleet calendar.
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 mb-8">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{vehicle?.name}</p>
                <p className="font-mono text-[11px] text-slate-400">{vehicle?.plateNumber}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
              #{confirmedBooking._id.slice(-6).toUpperCase()}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Customer</span>
              <span className="font-semibold text-white">{confirmedBooking.customerName}</span>
            </div>

            <div className="flex justify-between items-start">
              <span className="text-slate-400">Duration</span>
              <div className="text-right">
                <p className="font-medium text-slate-200">
                  {formatDateNice(confirmedBooking.startDateTime)} &rarr;{" "}
                  {formatDateNice(confirmedBooking.endDateTime)}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-slate-400">Total Rental</span>
              <span className="text-base font-bold text-white">
                {formatCurrency(confirmedBooking.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Paid Now</span>
              <div className="flex items-center gap-1.5">
                {confirmedBooking.paymentMethod && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                    {confirmedBooking.paymentMethod}
                  </span>
                )}
                <span className="font-semibold text-emerald-400">
                  {formatCurrency(confirmedBooking.paidAmount)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-slate-400">Remaining Balance</span>
              <span
                className={`text-sm font-bold ${
                  confirmedBooking.balanceAmount === 0 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {confirmedBooking.balanceAmount === 0
                  ? "Fully Paid ✓"
                  : formatCurrency(confirmedBooking.balanceAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mt-auto">
          <Link
            href={`/vehicles/${id}`}
            className="w-full btn-primary rounded-2xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 text-white"
          >
            <span>Back to Vehicle Overview</span>
            <ChevronRight className="w-4 h-4" />
          </Link>

          <button
            onClick={() => {
              setConfirmedBooking(null);
              setCustomerName("");
              setRecordPaymentNow(false);
              setPaidAmount(0);
              setPaymentNote("");
              setCustomTotalAmount(null);
            }}
            className="w-full bg-[#1a1a2e] hover:bg-[#23233c] border border-white/10 text-slate-300 hover:text-white rounded-2xl py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Create Another Booking</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pt-7 pb-36 relative">
      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between pb-4">
        <Link
          href={`/vehicles/${id}`}
          className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2a2a46] transition-colors"
          aria-label="Back to Overview"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <h1 className="text-sm font-bold text-white tracking-wide">New Booking</h1>
          <p className="text-[10px] text-indigo-400 font-medium">Fast Fleet Reservation</p>
        </div>
        <div className="w-10" /> {/* Spacer balance */}
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <p className="flex-1">{errorMessage}</p>
        </div>
      )}

      {/* 2. Vehicle Context Card */}
      <section className="bg-gradient-to-br from-[#1c1c30] to-[#141426] border border-white/10 rounded-3xl p-4 mb-5 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-13 h-13 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 overflow-hidden shadow-sm">
            {vehicle?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vehicle.imageUrl}
                alt={vehicle.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Car className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                {vehicle?.name}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-[11px] font-semibold text-slate-300 bg-[#0f0f1c] px-2 py-0.5 rounded-md border border-white/10">
                {vehicle?.plateNumber}
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                {vehicle?.fuelType} &middot; {vehicle?.transmission}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Standard Rate
            </p>
            <p className="text-sm font-extrabold text-white">
              {vehicle?.dailyRate && vehicle.dailyRate > 0
                ? `${formatCurrency(vehicle.dailyRate)}/day`
                : vehicle?.hourlyRate && vehicle.hourlyRate > 0
                ? `${formatCurrency(vehicle.hourlyRate)}/hr`
                : "Free / Negotiated"}
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleCreateBooking} className="space-y-5">
        {/* 3. Customer Details Section */}
        <section className="bg-[#17172a] border border-white/10 rounded-3xl p-4 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-slate-400">
            <User className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Customer Information
            </span>
          </div>

          <div>
            <label
              htmlFor="customerName"
              className="block text-[11px] font-medium text-slate-400 mb-1.5"
            >
              Customer Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="customerName"
              type="text"
              required
              autoFocus
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-[#101020] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
            />
          </div>
        </section>

        {/* 4. Rental Schedule & Duration Section */}
        <section className="bg-[#17172a] border border-white/10 rounded-3xl p-4 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <CalendarIcon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Rental Schedule
              </span>
            </div>

            {/* Quick Duration Preset Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => handleApplyPreset(1)}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5 transition-all"
              >
                +1d
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(2)}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5 transition-all"
              >
                +2d
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(3)}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5 transition-all"
              >
                +3d
              </button>
              <button
                type="button"
                onClick={handleApplyWeekendPreset}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5 transition-all"
              >
                Weekend
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Start Date & Time */}
            <div>
              <label
                htmlFor="startDateTime"
                className="block text-[11px] font-medium text-slate-400 mb-1.5"
              >
                Start Date & Time
              </label>
              <input
                id="startDateTime"
                type="datetime-local"
                required
                value={startDateTime}
                onChange={(e) => {
                  setStartDateTime(e.target.value);
                  setCustomTotalAmount(null);
                }}
                className="w-full bg-[#101020] border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner [color-scheme:dark]"
              />
            </div>

            {/* End Date & Time */}
            <div>
              <label
                htmlFor="endDateTime"
                className="block text-[11px] font-medium text-slate-400 mb-1.5"
              >
                End Date & Time
              </label>
              <input
                id="endDateTime"
                type="datetime-local"
                required
                value={endDateTime}
                onChange={(e) => {
                  setEndDateTime(e.target.value);
                  setCustomTotalAmount(null);
                }}
                className="w-full bg-[#101020] border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Duration & Overlap Status Indicator */}
          <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Calculated Duration:</span>
                <span className="font-bold text-indigo-300">
                  {durationInfo?.isValid ? durationInfo.label : "Invalid"}
                </span>
              </div>

              {!conflictingBooking && durationInfo?.isValid && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Available</span>
                </div>
              )}
            </div>

            {/* Overlap Alert Card if clashing */}
            {conflictingBooking && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-rose-200">Schedule Conflict Detected!</p>
                  <p className="text-[11px] text-rose-300/90 mt-0.5 leading-relaxed">
                    Already booked for{" "}
                    <span className="font-semibold text-white">
                      {conflictingBooking.customerName}
                    </span>{" "}
                    from {formatDateNice(conflictingBooking.startDateTime)} to{" "}
                    {formatDateNice(conflictingBooking.endDateTime)}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 5. Rental Charges & Override Section */}
        <section className="bg-[#17172a] border border-white/10 rounded-3xl p-4 shadow-lg space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <Banknote className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Rental Charges
              </span>
            </div>

            {isAmountOverridden && suggestedRent > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCustomTotalAmount(null);
                }}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to suggested ({formatCurrency(suggestedRent)})</span>
              </button>
            )}
          </div>

          <div>
            <label
              htmlFor="totalAmount"
              className="block text-[11px] font-medium text-slate-400 mb-1.5"
            >
              Total Rent Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                ₹
              </span>
              <input
                id="totalAmount"
                type="number"
                min="0"
                step="1"
                required
                value={totalAmount || ""}
                onChange={(e) => {
                  setCustomTotalAmount(Number(e.target.value));
                }}
                className="w-full bg-[#101020] border border-white/10 rounded-2xl pl-9 pr-4 py-3 text-base font-bold text-white focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
              <span>
                Suggested:{" "}
                <strong className="text-slate-300">{formatCurrency(suggestedRent)}</strong>
              </span>
              {vehicle?.dailyRate ? (
                <span>Rate: {formatCurrency(vehicle.dailyRate)}/day</span>
              ) : vehicle?.hourlyRate ? (
                <span>Rate: {formatCurrency(vehicle.hourlyRate)}/hr</span>
              ) : null}
            </div>
          </div>
        </section>

        {/* 6. Initial Payment / Advance Section (Optional Toggle) */}
        <section className="bg-[#17172a] border border-white/10 rounded-3xl p-4 shadow-lg space-y-3.5 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white">Record Payment / Advance Now</span>
            </div>

            {/* Switch Toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={recordPaymentNow}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRecordPaymentNow(checked);
                  if (checked && paidAmount === 0 && totalAmount > 0) {
                    setPaidAmount(totalAmount); // Default to full or user can adjust
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {/* Accordion Content */}
          {recordPaymentNow && (
            <div className="pt-3 border-t border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Payment Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="paidAmount" className="text-[11px] font-medium text-slate-400">
                    Amount Received Now (₹)
                  </label>
                  {/* Quick percentage buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPaymentFraction(1)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 border border-white/5"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFraction(0.5)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFraction(0.25)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5"
                    >
                      25%
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                    ₹
                  </span>
                  <input
                    id="paidAmount"
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={paidAmount || ""}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full bg-[#101020] border border-white/10 rounded-2xl pl-9 pr-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-left ${
                      paymentMethod === "cash"
                        ? "bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm shadow-emerald-500/10"
                        : "bg-[#101020] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        paymentMethod === "cash"
                          ? "bg-emerald-500/25 text-emerald-300"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Cash</p>
                      <p className="text-[10px] text-slate-400">Cash in Hand</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank")}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-left ${
                      paymentMethod === "bank"
                        ? "bg-indigo-500/15 border-indigo-500/50 text-white shadow-sm shadow-indigo-500/10"
                        : "bg-[#101020] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        paymentMethod === "bank"
                          ? "bg-indigo-500/25 text-indigo-300"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Bank / UPI</p>
                      <p className="text-[10px] text-slate-400">Direct Account</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Optional Note */}
              <div>
                <label htmlFor="paymentNote" className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  Reference / Note (Optional)
                </label>
                <input
                  id="paymentNote"
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. GPay ref #8291 or Received at front desk"
                  className="w-full bg-[#101020] border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-all"
                />
              </div>

              {/* Mini Balance Due Strip */}
              <div className="bg-[#101020] rounded-2xl p-3 border border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">Remaining Balance:</span>
                <span
                  className={`font-bold ${
                    remainingBalance === 0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {remainingBalance === 0 ? "Fully Settled ✓" : formatCurrency(remainingBalance)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* 7. Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto p-4 bg-[#0f0f1a]/95 backdrop-blur-xl border-t border-white/10 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Total Rental
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-extrabold text-white">
                  {formatCurrency(totalAmount)}
                </p>
                {recordPaymentNow && remainingBalance > 0 && (
                  <span className="text-[11px] font-semibold text-amber-400">
                    ({formatCurrency(remainingBalance)} due)
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || Boolean(conflictingBooking) || !durationInfo?.isValid}
              className={`btn-primary rounded-2xl px-6 py-3.5 text-sm font-bold flex items-center gap-2 transition-all ${
                submitting || Boolean(conflictingBooking) || !durationInfo?.isValid
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:shadow-indigo-500/30 active:scale-95"
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Create Booking</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
