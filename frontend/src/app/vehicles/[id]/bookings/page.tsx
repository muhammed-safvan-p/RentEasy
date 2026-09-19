"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Banknote,
  Building2,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  Car,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  History,
} from "lucide-react";

type FilterKey = "all" | "active" | "due" | "upcoming" | "completed" | "cancelled";

interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
}

interface BookingPayment {
  _id: string;
  bookingId: string;
  vehicleId: string;
  amount: number;
  paymentMethod: "cash" | "bank";
  paidAt: string;
  note?: string;
  recordedBy?: {
    _id: string;                
    username: string;
  };
}

interface Booking {
  _id: string;
  vehicleId: string | { _id: string; name: string; plateNumber: string };
  customerName: string;
  startDateTime: string;
  endDateTime: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  refundedAmount?: number;
  isCancelled: boolean;
  cancelledAt?: string;
  cancellationNote?: string;
  createdBy?: {
    _id: string;
    username: string;
  };
}

export default function VehicleBookingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  // State
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "due" | "upcoming" | "completed" | "cancelled"
  >("all");

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Detail & Payment Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingPayments, setBookingPayments] = useState<BookingPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // New Part Payment Form Inside Modal
  const [partAmount, setPartAmount] = useState<string>("");
  const [partMethod, setPartMethod] = useState<"cash" | "bank">("cash");
  const [partNote, setPartNote] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState("");
  const [overpayConfirmData, setOverpayConfirmData] = useState<{
    numAmount: number;
    newTotal: number;
    excess: number;
  } | null>(null);

  // Cancellation / Deletion Modal
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("0");
  const [refundMethod, setRefundMethod] = useState<"cash" | "bank">("cash");
  const [cancellationNote, setCancellationNote] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Currency Formatter
  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Nice Date & Time Formatter
  const formatDateTimeNice = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatMonthDisplay = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return (
      selectedMonth.getFullYear() === now.getFullYear() &&
      selectedMonth.getMonth() === now.getMonth()
    );
  }, [selectedMonth]);

  // Fetch Vehicle Info (once)
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchVehicle = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/vehicles/${id}`, { credentials: "include" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to load vehicle details");
        const data = await res.json();
        if (isMounted) setVehicle(data);
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : "Error fetching vehicle");
        }
      }
    };

    fetchVehicle();
    return () => {
      isMounted = false;
    };
  }, [id, baseUrl, router]);

  // Fetch Bookings for Selected Month
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const loadBookings = async () => {
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const from = new Date(year, month, 1, 0, 0, 0, 0).toISOString();
        const to = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

        const res = await fetch(
          `${baseUrl}/api/bookings?vehicleId=${id}&from=${from}&to=${to}&limit=100`,
          { credentials: "include" }
        );

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch bookings for this month");
        const data = await res.json();
        if (isMounted) {
          setBookings(data.bookings || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : "Error loading monthly bookings");
        }
      } finally {
        if (isMounted) {
          setListLoading(false);
          setLoading(false);
        }
      }
    };

    loadBookings();
    return () => {
      isMounted = false;
    };
  }, [id, baseUrl, selectedMonth, router]);

  // Duration Helper
  const getBookingDurationLabel = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0 || isNaN(diffMs)) return "";

    const totalHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days > 0 && hours > 0) return `${days}d ${hours}h`;
    if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
    return `${totalHours} hour${totalHours > 1 ? "s" : ""}`;
  };

  // Booking lifecycle state helper
  const getBookingStatus = (b: Booking) => {
    if (b.isCancelled) return "cancelled";
    const now = new Date();
    const start = new Date(b.startDateTime);
    const end = new Date(b.endDateTime);

    if (now >= start && now <= end) return "active";
    if (now < start) return "upcoming";
    return "completed";
  };

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const status = getBookingStatus(b);
      if (activeFilter === "all") return true;
      if (activeFilter === "active") return status === "active";
      if (activeFilter === "upcoming") return status === "upcoming";
      if (activeFilter === "completed") return status === "completed";
      if (activeFilter === "cancelled") return b.isCancelled;
      if (activeFilter === "due") return !b.isCancelled && b.balanceAmount > 0;
      return true;
    });
  }, [bookings, activeFilter]);

  // Month Metrics Calculation
  const monthMetrics = useMemo(() => {
    const nonCancelled = bookings.filter((b) => !b.isCancelled);
    const totalCount = nonCancelled.length;
    const totalRevenue = nonCancelled.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPaid = nonCancelled.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalDue = nonCancelled.reduce((sum, b) => sum + (b.balanceAmount || 0), 0);

    return {
      totalCount,
      totalRevenue,
      totalPaid,
      totalDue,
    };
  }, [bookings]);

  // Load Payments For a Booking
  const openBookingDetails = async (booking: Booking) => {
    setSelectedBooking(booking);
    setPartAmount(booking.balanceAmount > 0 ? String(booking.balanceAmount) : "");
    setPartMethod("cash");
    setPartNote("");
    setPaymentError("");
    setPaymentSuccessMsg("");
    setPaymentsLoading(true);

    try {
      const res = await fetch(`${baseUrl}/api/bookings/${booking._id}/payments`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setBookingPayments(data.payments || []);
      }
    } catch {
      // Non-blocking
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Record Part Payment inside Detail Modal
  const handleRecordPartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    const numAmount = Number(partAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPaymentError("Please enter a valid positive payment amount.");
      return;
    }

    // If payment amount exceeds remaining balance, prompt for confirmation to increase totalAmount
    if (numAmount > selectedBooking.balanceAmount && !overpayConfirmData) {
      const newTotal = selectedBooking.paidAmount + numAmount;
      const excess = numAmount - selectedBooking.balanceAmount;
      setOverpayConfirmData({ numAmount, newTotal, excess });
      return;
    }

    await executePayment(numAmount);
  };

  const executePayment = async (numAmount: number) => {
    if (!selectedBooking) return;

    setSubmittingPayment(true);
    setPaymentError("");
    setPaymentSuccessMsg("");
    setOverpayConfirmData(null);

    try {
      const res = await fetch(`${baseUrl}/api/bookings/${selectedBooking._id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod: partMethod,
          note: partNote.trim() || `Part-payment via ${partMethod}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to record payment");
      }

      // Success! Update selectedBooking state
      const updatedBooking = data.booking;
      setSelectedBooking(updatedBooking);

      // Prepend new payment to timeline
      if (data.payment) {
        setBookingPayments((prev) => [data.payment, ...prev]);
      }

      // Update in main list
      setBookings((prev) =>
        prev.map((b) => (b._id === updatedBooking._id ? { ...b, ...updatedBooking } : b))
      );

      // Reset form
      setPartAmount(updatedBooking.balanceAmount > 0 ? String(updatedBooking.balanceAmount) : "");
      setPartNote("");
      setPaymentSuccessMsg("Payment recorded successfully & credited to vehicle wallet!");
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : "Error recording payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Cancellation Confirmation Modal
  const openCancelModal = (booking: Booking) => {
    setCancellingBooking(booking);
    setRefundAmount(booking.paidAmount > 0 ? String(booking.paidAmount) : "0");
    setRefundMethod("cash");
    setCancellationNote("");
    setCancelError("");
  };

  // Execute Cancellation
  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBooking) return;

    const parsedRefund = Number(refundAmount) || 0;
    if (parsedRefund < 0 || parsedRefund > cancellingBooking.paidAmount) {
      setCancelError(`Refund cannot exceed the paid amount (${formatCurrency(cancellingBooking.paidAmount)}).`);
      return;
    }

    setSubmittingCancel(true);
    setCancelError("");

    try {
      const res = await fetch(`${baseUrl}/api/bookings/${cancellingBooking._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          refundAmount: parsedRefund,
          refundPaymentMethod: parsedRefund > 0 ? refundMethod : undefined,
          cancellationNote: cancellationNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to cancel booking");
      }

      // Update state
      const cancelledBooking = data.booking;
      setBookings((prev) =>
        prev.map((b) => (b._id === cancelledBooking._id ? { ...b, ...cancelledBooking } : b))
      );

      if (selectedBooking && selectedBooking._id === cancelledBooking._id) {
        setSelectedBooking(cancelledBooking);
      }

      setCancellingBooking(null);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Error cancelling booking");
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Skeleton Loader
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen px-4 sm:px-6 pt-7 pb-32 max-w-lg mx-auto w-full space-y-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#1a1a2e]" />
          <div className="w-32 h-6 bg-[#1a1a2e] rounded-lg" />
          <div className="w-10 h-10 rounded-full bg-[#1a1a2e]" />
        </div>
        <div className="h-12 bg-[#1a1a2e] rounded-2xl" />
        <div className="grid grid-cols-3 gap-2.5">
          <div className="h-20 bg-[#1a1a2e] rounded-2xl" />
          <div className="h-20 bg-[#1a1a2e] rounded-2xl" />
          <div className="h-20 bg-[#1a1a2e] rounded-2xl" />
        </div>
        <div className="h-10 bg-[#1a1a2e] rounded-2xl" />
        <div className="space-y-3">
          <div className="h-36 bg-[#1a1a2e] rounded-3xl" />
          <div className="h-36 bg-[#1a1a2e] rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-4 sm:px-6 pt-6 pb-32 max-w-lg mx-auto w-full relative">
      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between pb-3">
        <Link
          href={`/vehicles/${id}`}
          className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2a2a46] transition-colors"
          aria-label="Back to Overview"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <h1 className="text-sm font-bold text-white tracking-wide">Vehicle Bookings</h1>
          {vehicle && (
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
              {vehicle.name} &bull; <span className="font-mono">{vehicle.plateNumber}</span>
            </p>
          )}
        </div>
        <Link
          href={`/vehicles/${id}/book`}
          className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 border border-indigo-400/30 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-transform"
          aria-label="Create New Booking"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <p className="flex-1">{errorMessage}</p>
        </div>
      )}

      {/* 2. Monthly Navigator (Past & Future Supported) */}
      <div className="bg-[#17172a] border border-white/10 rounded-2xl p-2 mb-4 flex items-center justify-between shadow-lg relative">
        <button
          onClick={handlePrevMonth}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
          aria-label="Previous Month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-white tracking-wide">
            {formatMonthDisplay(selectedMonth)}
          </span>
          {!isCurrentMonth && (
            <button
              onClick={handleResetToCurrentMonth}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
            >
              This Month
            </button>
          )}
        </div>

        <button
          onClick={handleNextMonth}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
          aria-label="Next Month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 3. Monthly Financial Metrics Strip */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* Total Bookings */}
        <div className="bg-[#17172a] border border-white/10 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Car className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Bookings</span>
          </div>
          <p className="text-base font-extrabold text-white">
            {monthMetrics.totalCount}
          </p>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#17172a] border border-white/10 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Revenue</span>
          </div>
          <p className="text-base font-extrabold text-emerald-400 truncate">
            {formatCurrency(monthMetrics.totalRevenue)}
          </p>
        </div>

        {/* Pending Due */}
        <div
          className={`rounded-2xl p-3 border flex flex-col justify-between shadow-md ${
            monthMetrics.totalDue > 0
              ? "bg-amber-500/10 border-amber-500/25"
              : "bg-[#17172a] border-white/10"
          }`}
        >
          <div className="flex items-center gap-1.5 text-amber-400 text-xs mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Due</span>
          </div>
          <p
            className={`text-base font-extrabold truncate ${
              monthMetrics.totalDue > 0 ? "text-amber-400" : "text-slate-400"
            }`}
          >
            {formatCurrency(monthMetrics.totalDue)}
          </p>
        </div>
      </div>

      {/* 4. Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2 text-xs font-semibold">
        {[
          { key: "all", label: `All (${bookings.length})` },
          { key: "active", label: "Active" },
          { key: "due", label: "Pending Due" },
          { key: "upcoming", label: "Upcoming" },
          { key: "completed", label: "Completed" },
          { key: "cancelled", label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as FilterKey)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border ${
              activeFilter === tab.key
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                : "bg-[#17172a] text-slate-400 border-white/5 hover:text-white hover:border-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. Bookings List Content */}
      {listLoading ? (
        <div className="space-y-3 pt-2 animate-pulse">
          <div className="h-32 bg-[#17172a] rounded-3xl" />
          <div className="h-32 bg-[#17172a] rounded-3xl" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-[#17172a]/60 border border-white/5 rounded-3xl mt-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3 text-indigo-400 shadow-inner">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Bookings Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mb-5">
            {activeFilter === "all"
              ? `No reservations scheduled for ${formatMonthDisplay(selectedMonth)}.`
              : `No ${activeFilter} bookings match your filter for this month.`}
          </p>
          <Link
            href={`/vehicles/${id}/book`}
            className="btn-primary rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Create Booking</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const status = getBookingStatus(booking);
            const durationLabel = getBookingDurationLabel(
              booking.startDateTime,
              booking.endDateTime
            );
            const pctPaid =
              booking.totalAmount > 0
                ? Math.min(100, Math.round((booking.paidAmount / booking.totalAmount) * 100))
                : 100;

            return (
              <div
                key={booking._id}
                className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-4 shadow-xl hover:border-white/20 transition-all space-y-3 relative overflow-hidden"
              >
                {/* Header: Customer Name & Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate tracking-tight">
                        {booking.customerName}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        #{booking._id.slice(-6).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Status Badge */}
                  <div>
                    {status === "active" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Now
                      </span>
                    )}
                    {status === "upcoming" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                        Upcoming
                      </span>
                    )}
                    {status === "completed" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/15 border border-slate-500/30 text-slate-400">
                        Completed
                      </span>
                    )}
                    {status === "cancelled" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                        Cancelled
                      </span>
                    )}
                  </div>
                </div>

                {/* Rental Period & Duration */}
                <div className="bg-[#121222] rounded-2xl p-2.5 border border-white/5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="text-slate-300 font-medium">
                      {formatDateTimeNice(booking.startDateTime)} &rarr;{" "}
                      {formatDateTimeNice(booking.endDateTime)}
                    </p>
                  </div>
                  {durationLabel && (
                    <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 shrink-0">
                      {durationLabel}
                    </span>
                  )}
                </div>

                {/* Financial Progress & Dues */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      Total: <strong className="text-white">{formatCurrency(booking.totalAmount)}</strong>
                    </span>

                    {booking.balanceAmount === 0 ? (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Fully Paid
                      </span>
                    ) : booking.paidAmount > 0 ? (
                      <span className="text-[11px] font-bold text-amber-400">
                        Paid: {formatCurrency(booking.paidAmount)} &bull;{" "}
                        <span className="underline">{formatCurrency(booking.balanceAmount)} Due</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-400">
                        Unpaid ({formatCurrency(booking.balanceAmount)} Due)
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        booking.balanceAmount === 0
                          ? "bg-emerald-500"
                          : booking.paidAmount > 0
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${pctPaid}%` }}
                    />
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  {!booking.isCancelled ? (
                    <button
                      type="button"
                      onClick={() => openCancelModal(booking)}
                      className="text-xs font-semibold px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic pl-1">
                      {booking.cancellationNote || "Cancelled reservation"}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => openBookingDetails(booking)}
                    className="btn-primary rounded-xl px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition-transform ml-auto"
                  >
                    <span>Details & Payment</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. DETAIL & PART-BY-PART PAYMENT MODAL                                    */}
      {/* ========================================================================= */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-[#161628] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a2e]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Booking Details</h3>
                  <span className="font-mono text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                    #{selectedBooking._id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-indigo-400 font-medium">
                  {selectedBooking.customerName}
                </p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 no-scrollbar">
              {/* Financial Balance Summary Box */}
              <div className="bg-[#101020] border border-white/10 rounded-2xl p-4 shadow-inner">
                <div className="grid grid-cols-3 gap-2 text-center pb-3 border-b border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Rent
                    </p>
                    <p className="text-sm font-extrabold text-white mt-0.5">
                      {formatCurrency(selectedBooking.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Collected
                    </p>
                    <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
                      {formatCurrency(selectedBooking.paidAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      Balance Due
                    </p>
                    <p className="text-sm font-extrabold text-amber-400 mt-0.5">
                      {formatCurrency(selectedBooking.balanceAmount)}
                    </p>
                  </div>
                </div>

                <div className="pt-3">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-400">Payment Completion</span>
                    <span className="font-bold text-white">
                      {selectedBooking.totalAmount > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (selectedBooking.paidAmount / selectedBooking.totalAmount) * 100
                            )
                          )
                        : 100}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all"
                      style={{
                        width: `${
                          selectedBooking.totalAmount > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (selectedBooking.paidAmount / selectedBooking.totalAmount) * 100
                                )
                              )
                            : 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="bg-[#1c1c30] rounded-2xl p-3 border border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Rental Period</span>
                  <span className="font-medium text-slate-200 text-right">
                    {formatDateTimeNice(selectedBooking.startDateTime)} &rarr;{" "}
                    {formatDateTimeNice(selectedBooking.endDateTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration</span>
                  <span className="font-semibold text-indigo-300">
                    {getBookingDurationLabel(
                      selectedBooking.startDateTime,
                      selectedBooking.endDateTime
                    )}
                  </span>
                </div>
                {selectedBooking.createdBy && (
                  <div className="flex justify-between pt-1 border-t border-white/5 text-[11px]">
                    <span className="text-slate-500">Created By</span>
                    <span className="text-slate-400">{selectedBooking.createdBy.username}</span>
                  </div>
                )}
              </div>

              {/* Payment Success or Error Alerts */}
              {paymentSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <p>{paymentSuccessMsg}</p>
                </div>
              )}
              {paymentError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <p>{paymentError}</p>
                </div>
              )}

              {/* RECORD NEW PART-PAYMENT FORM (If balance remains) */}
              {!selectedBooking.isCancelled && selectedBooking.balanceAmount > 0 && (
                <form
                  onSubmit={handleRecordPartPayment}
                  className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Add Part Payment
                      </span>
                    </div>
                    {/* Quick Fill Chips */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPartAmount(String(selectedBooking.balanceAmount))}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/5"
                      >
                        Full Due
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPartAmount(String(Math.round(selectedBooking.balanceAmount / 2)))
                        }
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 border border-white/5"
                      >
                        50%
                      </button>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label htmlFor="partAmount" className="block text-[11px] text-slate-400 mb-1">
                      Payment Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        ₹
                      </span>
                      <input
                        id="partAmount"
                        type="number"
                        min="1"
                        max={selectedBooking.balanceAmount}
                        required
                        value={partAmount}
                        onChange={(e) => setPartAmount(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full bg-[#101020] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/80 shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPartMethod("cash")}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          partMethod === "cash"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "bg-[#101020] border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Cash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPartMethod("bank")}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          partMethod === "bank"
                            ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                            : "bg-[#101020] border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Bank / UPI</span>
                      </button>
                    </div>
                  </div>

                  {/* Note / Reference */}
                  <div>
                    <label htmlFor="partNote" className="block text-[11px] text-slate-400 mb-1">
                      Note / Reference (Optional)
                    </label>
                    <input
                      id="partNote"
                      type="text"
                      value={partNote}
                      onChange={(e) => setPartNote(e.target.value)}
                      placeholder="e.g. Received at return or GPay ref"
                      className="w-full bg-[#101020] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPayment || !partAmount}
                    className="w-full btn-primary rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 active:scale-98 transition-transform disabled:opacity-50"
                  >
                    {submittingPayment ? (
                      <span>Saving Payment...</span>
                    ) : (
                      <>
                        <span>Record Payment ({formatCurrency(Number(partAmount) || 0)})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* All Settled Banner */}
              {selectedBooking.balanceAmount === 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2 justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>All payments have been settled for this booking.</span>
                </div>
              )}

              {/* INSTALLMENTS PAYMENT HISTORY TIMELINE */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Payment Installment History
                  </span>
                </div>

                {paymentsLoading ? (
                  <p className="text-xs text-slate-500 animate-pulse">Loading payments...</p>
                ) : bookingPayments.length === 0 ? (
                  <div className="bg-[#121222] p-3 rounded-2xl border border-white/5 text-center text-xs text-slate-400">
                    No individual payments recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookingPayments.map((p, idx) => (
                      <div
                        key={p._id || idx}
                        className="bg-[#121222] border border-white/5 rounded-2xl p-3 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                p.paymentMethod === "cash"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              }`}
                            >
                              {p.paymentMethod}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {formatDateTimeNice(p.paidAt)}
                            </span>
                          </div>
                          {p.note && <p className="text-[11px] text-slate-300 italic">{p.note}</p>}
                        </div>
                        <p className="text-sm font-extrabold text-emerald-400">
                          +{formatCurrency(p.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CANCELLATION / DELETION CONFIRMATION MODAL                             */}
      {/* ========================================================================= */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#18182c] border border-rose-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
            {/* Warning Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cancel Booking?</h3>
                <p className="text-xs text-slate-400">This will release the calendar slot.</p>
              </div>
            </div>

            {/* Booking Snippet */}
            <div className="bg-[#121222] p-3 rounded-2xl border border-white/5 text-xs space-y-1">
              <p className="text-slate-300 font-bold">{cancellingBooking.customerName}</p>
              <p className="text-slate-400 text-[11px]">
                {formatDateTimeNice(cancellingBooking.startDateTime)} &rarr;{" "}
                {formatDateTimeNice(cancellingBooking.endDateTime)}
              </p>
              <p className="text-slate-400 text-[11px] pt-1 border-t border-white/5">
                Total: <strong className="text-white">{formatCurrency(cancellingBooking.totalAmount)}</strong> &bull;
                Paid:{" "}
                <strong className="text-emerald-400">
                  {formatCurrency(cancellingBooking.paidAmount)}
                </strong>
              </p>
            </div>

            {cancelError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleConfirmCancellation} className="space-y-3">
              {/* Optional Refund input if amount was paid */}
              {cancellingBooking.paidAmount > 0 && (
                <div className="space-y-2 p-3 bg-rose-500/5 rounded-2xl border border-rose-500/20">
                  <label htmlFor="refundAmount" className="block text-[11px] font-semibold text-rose-300">
                    Process Refund to Customer (₹)
                  </label>
                  <input
                    id="refundAmount"
                    type="number"
                    min="0"
                    max={cancellingBooking.paidAmount}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full bg-[#101020] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-rose-500/80"
                  />
                  {Number(refundAmount) > 0 && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setRefundMethod("cash")}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border ${
                          refundMethod === "cash"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "bg-[#101020] border-white/5 text-slate-400"
                        }`}
                      >
                        Refund Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefundMethod("bank")}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border ${
                          refundMethod === "bank"
                            ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                            : "bg-[#101020] border-white/5 text-slate-400"
                        }`}
                      >
                        Refund Bank
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Cancellation Note */}
              <div>
                <label htmlFor="cancellationNote" className="block text-[11px] text-slate-400 mb-1">
                  Reason / Cancellation Note
                </label>
                <input
                  id="cancellationNote"
                  type="text"
                  value={cancellationNote}
                  onChange={(e) => setCancellationNote(e.target.value)}
                  placeholder="e.g. Customer cancelled trip"
                  className="w-full bg-[#101020] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/20"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingBooking(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submittingCancel ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 8. OVERPAYMENT CONFIRMATION MODAL                                        */}
      {/* ========================================================================= */}
      {overpayConfirmData && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#18182c] border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Overpayment Detected</h3>
                <p className="text-xs text-slate-400">Total amount will be increased</p>
              </div>
            </div>

            <div className="bg-[#121222] p-3.5 rounded-2xl border border-white/5 text-xs space-y-2.5">
              <p className="text-slate-300">
                The payment of <strong className="text-emerald-400 font-bold">{formatCurrency(overpayConfirmData.numAmount)}</strong> exceeds the remaining balance of <strong className="text-amber-300 font-bold">{formatCurrency(selectedBooking.balanceAmount)}</strong>.
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Total:</span>
                  <span className="text-white font-semibold">{formatCurrency(selectedBooking.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">New Total Amount:</span>
                  <span className="text-emerald-300 font-bold">{formatCurrency(overpayConfirmData.newTotal)}</span>
                </div>
                <p className="text-slate-400 text-[10px] pt-1 border-t border-amber-500/20">
                  Total increases by +{formatCurrency(overpayConfirmData.excess)} to match total received payment.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOverpayConfirmData(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executePayment(overpayConfirmData.numAmount)}
                disabled={submittingPayment}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 active:scale-95 transition-all disabled:opacity-50"
              >
                {submittingPayment ? "Recording..." : "Confirm & Increase"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
