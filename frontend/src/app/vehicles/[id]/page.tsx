"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  Car,
  CalendarDays,
  CalendarPlus,
  UserCheck,
  Lock,
  Unlock,
  BookOpen,
  CalendarX2,
  Loader2,
} from "lucide-react";

import useSWR, { mutate } from "swr";
import { fetcher, API_BASE_URL as baseUrl } from "@/lib/api";
import { useVehicleDetail, useVehicleStatus, useVehicleWallet, invalidateVehicleData } from "@/hooks/useVehicleData";
import {
  formatCurrency,
  formatDateNice,
  formatDateTimeNice,
  formatDateTimeShortYear,
  formatMonthParam,
  getBookingDurationDays,
  getBookingDurationLabel,
  getLocalTodayDateString,
  toLocalISOString,
} from "@/lib/formatters";

import { Booking, BookingPayment, VehicleLock } from "@/types";
import { BookingDetailModal } from "@/components/bookings/BookingDetailModal";
import { EditBookingModal } from "@/components/bookings/EditBookingModal";
import { OverpayWarningModal } from "@/components/bookings/OverpayWarningModal";

interface MonthlyData {
  bookings: Booking[];
  locks: VehicleLock[];
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  // Three mutually-exclusive detail states
  const [selectedBookings, setSelectedBookings] = useState<Booking[]>([]);
  const [selectedLock, setSelectedLock] = useState<VehicleLock | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Lock form state
  const [showLockForm, setShowLockForm] = useState(false);
  const [lockStartDateTime, setLockStartDateTime] = useState<string>("");
  const [lockEndDateTime, setLockEndDateTime] = useState<string>("");
  const [lockReason, setLockReason] = useState<string>("");
  const [lockSubmitting, setLockSubmitting] = useState(false);
  const [lockError, setLockError] = useState<string>("");
  const [deletingLock, setDeletingLock] = useState(false);

  // Full Booking Detail & Payment Modal State
  const [activeModalBooking, setActiveModalBooking] = useState<Booking | null>(null);
  const [bookingPayments, setBookingPayments] = useState<BookingPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
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

  // Edit Booking Modal State
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editStartDateTime, setEditStartDateTime] = useState("");
  const [editEndDateTime, setEditEndDateTime] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState<string>("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const { vehicle, isLoading: vehicleLoading, error: vehicleError } = useVehicleDetail(id);
  const { status, isLoading: statusLoading, error: statusError } = useVehicleStatus(id);
  const { wallet, isLoading: walletLoading, error: walletError } = useVehicleWallet(id);

  const monthParam = formatMonthParam(currentMonth);
  const swrKey = id ? `/api/vehicles/${id}/bookings?month=${monthParam}` : null;
  const {
    data: monthlyData,
    isLoading: bookingsLoading,
    error: bookingsError,
  } = useSWR<MonthlyData>(swrKey, fetcher);

  const bookings = monthlyData?.bookings || [];
  const locks = monthlyData?.locks || [];

  const loading = vehicleLoading || statusLoading || walletLoading;
  const calendarLoading = bookingsLoading;

  const anyError = vehicleError || statusError || walletError || bookingsError;
  const errorStatus = anyError ? ((anyError as any).status || 500) : null;
  const errorMessage = anyError
    ? (anyError as any).status === 403
      ? "You do not have permission to view this vehicle."
      : (anyError as any).status === 404
      ? "Vehicle not found."
      : anyError.message || "An unexpected error occurred."
    : "";

  // Auth redirect if 401
  useEffect(() => {
    if (anyError && (anyError as any).status === 401) {
      router.push("/login");
    }
  }, [anyError, router]);

  // Switch month
  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
    clearSelections();
  };

  const clearSelections = () => {
    setSelectedBookings([]);
    setSelectedLock(null);
    setSelectedDate(null);
    setShowLockForm(false);
    setLockStartDateTime("");
    setLockEndDateTime("");
    setLockReason("");
    setLockError("");
  };

  // Expand bookings into individual booked days
  const bookedDays = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];
    const dates: Date[] = [];

    for (const b of bookings) {
      if (b.isCancelled) continue;
      const sStr = b.startDateTime;
      const eStr = b.endDateTime;
      if (!sStr || !eStr) continue;
      const start = new Date(sStr);
      const end = new Date(eStr);
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0, 0);
      const finalEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0, 0, 0);
      while (cur <= finalEnd) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return dates;
  }, [bookings]);

  // Expand locks into individual locked days (exclude days already booked)
  const lockedDays = useMemo(() => {
    if (!locks || locks.length === 0) return [];
    const dates: Date[] = [];
    const bookedKeySet = new Set(
      bookedDays.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)
    );

    for (const l of locks) {
      const sStr = typeof l.startDate === "string" ? l.startDate.slice(0, 10) : new Date(l.startDate).toISOString().slice(0, 10);
      const eStr = typeof l.endDate === "string" ? l.endDate.slice(0, 10) : new Date(l.endDate).toISOString().slice(0, 10);
      if (!sStr || !eStr) continue;

      const [sY, sM, sD] = sStr.split("-").map(Number);
      const [eY, eM, eD] = eStr.split("-").map(Number);

      const cur = new Date(sY, sM - 1, sD, 12, 0, 0, 0);
      const finalEnd = new Date(eY, eM - 1, eD, 12, 0, 0, 0);

      while (cur <= finalEnd) {
        const key = `${cur.getFullYear()}-${cur.getMonth() + 1}-${cur.getDate()}`;
        if (!bookedKeySet.has(key)) {
          dates.push(new Date(cur));
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return dates;
  }, [locks, bookedDays]);

  // Expand the currently selected bookings into days to highlight on the calendar
  const selectedBookingDays = useMemo(() => {
    if (!selectedBookings || selectedBookings.length === 0) return [];
    const dates: Date[] = [];
    for (const b of selectedBookings) {
      if (!b.startDateTime || !b.endDateTime) continue;
      const start = new Date(b.startDateTime);
      const end = new Date(b.endDateTime);
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0, 0);
      const finalEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0, 0, 0);
      while (cur <= finalEnd) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return dates;
  }, [selectedBookings]);

  // When a day on the calendar is clicked
  const handleDayClick = (day: Date) => {
    clearSelections();
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
    const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

    // 1. Check booking match — retrieve ALL overlapping bookings on this day in chronological order
    const dayBookings = bookings
      .filter((b) => {
        if (b.isCancelled) return false;
        const bStart = new Date(b.startDateTime);
        const bEnd = new Date(b.endDateTime);
        return bStart <= dayEnd && bEnd >= dayStart;
      })
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

    if (dayBookings.length > 0) {
      setSelectedBookings(dayBookings);
      return;
    }

    // 2. Check lock match (using calendar date strings)
    const lockMatch = locks.find((l) => {
      const sStr = typeof l.startDate === "string" ? l.startDate.slice(0, 10) : new Date(l.startDate).toISOString().slice(0, 10);
      const eStr = typeof l.endDate === "string" ? l.endDate.slice(0, 10) : new Date(l.endDate).toISOString().slice(0, 10);
      return sStr <= dayStr && eStr >= dayStr;
    });

    if (lockMatch) {
      setSelectedLock(lockMatch);
      return;
    }

    // 3. Free day — show action card
    setSelectedDate(day);
    setShowLockForm(false);
    // Pre-fill starting at 09:00 AM and ending at 21:00 PM (same day) in local time
    const defaultStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0, 0);
    const defaultEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 21, 0, 0);
    setLockStartDateTime(toLocalISOString(defaultStart));
    setLockEndDateTime(toLocalISOString(defaultEnd));
  };

  // Submit a new lock
  const handleLockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockStartDateTime || !lockEndDateTime || !lockReason.trim()) return;
    setLockSubmitting(true);
    setLockError("");

    try {
      const res = await fetch(`${baseUrl}/api/vehicles/${id}/locks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(lockStartDateTime).toISOString(),
          endDate: new Date(lockEndDateTime).toISOString(),
          reason: lockReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to lock vehicle");

      // Refresh calendar data
      await mutate(swrKey);
      clearSelections();
    } catch (err: unknown) {
      setLockError(err instanceof Error ? err.message : "Error creating lock");
    } finally {
      setLockSubmitting(false);
    }
  };

  // Delete a lock
  const handleDeleteLock = async () => {
    if (!selectedLock) return;
    setDeletingLock(true);
    try {
      const res = await fetch(`${baseUrl}/api/vehicles/${id}/locks/${selectedLock._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete lock");
      await mutate(swrKey);
      clearSelections();
    } catch (err) {
      // Silent — could show a toast in future
    } finally {
      setDeletingLock(false);
    }
  };

  // Full Booking Detail Modal Handlers
  const openBookingDetails = async (booking: Booking) => {
    setActiveModalBooking(booking);
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

  const handleRecordPartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalBooking || submittingPayment) return;

    const numAmount = Number(partAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPaymentError("Please enter a valid positive payment amount.");
      return;
    }

    if (numAmount > activeModalBooking.balanceAmount && !overpayConfirmData) {
      const newTotal = (activeModalBooking.paidAmount || 0) + numAmount;
      const excess = numAmount - (activeModalBooking.balanceAmount || 0);
      setOverpayConfirmData({ numAmount, newTotal, excess });
      return;
    }

    await executePayment(numAmount);
  };

  const executePayment = async (numAmount: number) => {
    if (!activeModalBooking || submittingPayment) return;

    setSubmittingPayment(true);
    setPaymentError("");
    setPaymentSuccessMsg("");
    setOverpayConfirmData(null);

    try {
      const res = await fetch(`${baseUrl}/api/bookings/${activeModalBooking._id}/payments`, {
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

      const updatedBooking = data.booking;
      setActiveModalBooking(updatedBooking);
      setSelectedBookings((prev) =>
        prev.map((b) => (b._id === updatedBooking._id ? updatedBooking : b))
      );

      if (data.payment) {
        setBookingPayments((prev) => [data.payment, ...prev]);
      }

      setPartAmount(updatedBooking.balanceAmount > 0 ? String(updatedBooking.balanceAmount) : "");
      setPartNote("");
      setPaymentSuccessMsg("Payment recorded successfully & credited to vehicle wallet!");

      await mutate(swrKey);
      if (id) await invalidateVehicleData(id);
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : "Error recording payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setEditCustomerName(booking.customerName || "");
    setEditStartDateTime(toLocalISOString(new Date(booking.startDateTime)));
    setEditEndDateTime(toLocalISOString(new Date(booking.endDateTime)));
    setEditTotalAmount(String(booking.totalAmount || ""));
    setEditError("");
  };

  const handleEditBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || submittingEdit) return;

    if (!editCustomerName.trim()) {
      setEditError("Customer name cannot be empty.");
      return;
    }

    const start = new Date(editStartDateTime);
    const end = new Date(editEndDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      setEditError("End date must be strictly after start date.");
      return;
    }

    const numTotal = Number(editTotalAmount);
    if (isNaN(numTotal) || numTotal < (editingBooking.paidAmount || 0)) {
      setEditError(
        `Total amount cannot be less than the already collected amount (${formatCurrency(editingBooking.paidAmount || 0)}).`
      );
      return;
    }

    setSubmittingEdit(true);
    setEditError("");

    try {
      const res = await fetch(`${baseUrl}/api/bookings/${editingBooking._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerName: editCustomerName.trim(),
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          totalAmount: numTotal,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned unexpected response (${res.status} ${res.statusText})`);
      }

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update booking details");
      }

      const updated = data.booking;
      setEditingBooking(null);
      if (activeModalBooking && activeModalBooking._id === updated._id) {
        setActiveModalBooking(updated);
      }
      setSelectedBookings((prev) =>
        prev.map((b) => (b._id === updated._id ? updated : b))
      );

      await mutate(swrKey);
      if (id) await invalidateVehicleData(id);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Error updating booking");
    } finally {
      setSubmittingEdit(false);
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
        <Link href="/dashboard" className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2">
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
        <Link href="/dashboard" className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2">
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
        <button onClick={() => window.location.reload()} className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#1a1a2e] rounded-2xl animate-pulse shrink-0" />
              <div className="space-y-2">
                <div className="h-6 sm:h-7 bg-[#1a1a2e] rounded-xl w-36 sm:w-44 animate-pulse" />
                <div className="h-5 bg-[#1a1a2e] rounded-lg w-24 animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-44 bg-[#1a1a2e] rounded-xl animate-pulse" />
          </div>
          <div className="h-44 bg-[#1a1a2e] rounded-3xl animate-pulse" />
          <div className="h-80 bg-[#1a1a2e] rounded-3xl animate-pulse" />
        </div>
      ) : (
        <div className="px-6 flex flex-col gap-6 mt-2">
          {/* 1. Header Section */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 pb-1">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-sm shrink-0 overflow-hidden relative">
                {vehicle?.imageUrl ? (
                  <Image src={vehicle.imageUrl} alt={vehicle.name} width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <Car className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
                    {vehicle?.name}
                  </h1>
                  {!vehicle?.isActive && (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-mono text-xs font-semibold tracking-wider text-slate-200 bg-[#12121f] px-2.5 py-1 rounded-lg border border-white/10 shadow-inner">
                    {vehicle?.plateNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Status Badge */}
            <div className="self-start sm:self-center">
              {status?.status === "booked" ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium shadow-sm backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                  <span>
                    Booked until <span className="font-semibold text-white">{formatDateNice(status.until)}</span>
                  </span>
                </div>
              ) : status?.status === "available" && status?.nextBookingDate ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium shadow-sm backdrop-blur-sm">
                  <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400 ring-4 ring-emerald-500/20" />
                  <span>
                    Available <span className="text-slate-400 font-normal">· next</span>{" "}
                    <span className="font-semibold text-white">{formatDateNice(status.nextBookingDate)}</span>
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium shadow-sm backdrop-blur-sm">
                  <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400 ring-4 ring-emerald-500/20" />
                  <span className="font-semibold text-emerald-300">Available</span>
                </div>
              )}
            </div>
          </header>

          {/* 2. Wallet Section */}
          <section className="relative overflow-hidden bg-[#1a1a2e] rounded-3xl p-5 border border-white/10 card-gradient-purple shadow-xl">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2 text-slate-400">
                <WalletIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">Vehicle Wallet</span>
              </div>
              <span className="text-[11px] font-medium text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                Live Balance
              </span>
            </div>
            <div className="mb-5 relative z-10">
              <p className="text-xs text-slate-400 mb-1">Total Balance</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {formatCurrency(wallet?.totalBalance || 0)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
              <div className="bg-[#12121f]/80 backdrop-blur-sm rounded-2xl p-3 border border-white/5">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cash</span>
                </div>
                <p className="text-lg font-bold text-white">{formatCurrency(wallet?.cashBalance || 0)}</p>
              </div>
              <div className="bg-[#12121f]/80 backdrop-blur-sm rounded-2xl p-3 border border-white/5">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Bank</span>
                </div>
                <p className="text-lg font-bold text-white">{formatCurrency(wallet?.bankBalance || 0)}</p>
              </div>
            </div>
            <Link
              href={`/vehicles/${id}/wallet`}
              className="w-full btn-ghost rounded-xl py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-1.5 text-indigo-300 hover:text-white relative z-10"
            >
              <span>View all transactions</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </section>

          {/* 3. Booking Calendar Section */}
          <section className="bg-[#1a1a2e] rounded-3xl border border-white/10 shadow-xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-rose-500/8 blur-3xl rounded-full pointer-events-none" />

            {/* Section Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-0 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">Booking Calendar</h2>
                  <p className="text-[11px] text-slate-500 mt-px">Tap a date to view details or take action</p>
                </div>
              </div>
              {calendarLoading && (
                <span className="text-[11px] text-indigo-400 animate-pulse font-medium">Updating&hellip;</span>
              )}
            </div>

            {/* Calendar */}
            <div className="px-3 pt-3 pb-1 relative z-10">
              <DayPicker
                className="renteasy-calendar"
                month={currentMonth}
                onMonthChange={handleMonthChange}
                modifiers={{ booked: bookedDays, locked: lockedDays, selectedBooking: selectedBookingDays }}
                modifiersClassNames={{ booked: "rdp-booked", locked: "rdp-locked", selectedBooking: "rdp-selected-booking" }}
                onDayClick={handleDayClick}
              />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-5 pb-4 text-[11px] text-slate-500 relative z-10 flex-wrap px-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/25 border border-rose-400/50" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/25 border border-amber-400/50" />
                <span>Locked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-indigo-400 bg-indigo-500/10" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-700" />
                <span>Available</span>
              </div>
            </div>

            {/* ── Selected Booking(s) Card ── */}
            {selectedBookings.length > 0 && (
              <div className="mx-5 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-gradient-to-br from-rose-500/8 to-rose-600/5 border border-rose-500/25 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/20 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Booking Details</span>
                        {selectedBookings.length > 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                            {selectedBookings.length} Bookings on this day
                          </span>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={clearSelections}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Close booking details"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* List of bookings on this day */}
                  <div className="space-y-3.5">
                    {selectedBookings.map((b, idx) => (
                      <div
                        key={b._id}
                        className={`${
                          selectedBookings.length > 1
                            ? "p-3.5 rounded-xl bg-black/25 border border-white/5 space-y-2.5"
                            : "space-y-2"
                        }`}
                      >
                        {selectedBookings.length > 1 && (
                          <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                              Booking #{idx + 1}
                            </span>
                          </div>
                        )}

                        <div className="space-y-2 text-xs">
                          {/* Always show Customer row */}
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-500" />Customer
                            </span>
                            <span className="font-semibold text-white">{b.customerName}</span>
                          </div>

                          {/* Starting Date & Time */}
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />Starting
                            </span>
                            <span className="font-semibold text-slate-200">
                              {formatDateTimeShortYear(b.startDateTime)}
                            </span>
                          </div>

                          {/* Ending Date & Time */}
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />Ending
                            </span>
                            <span className="font-semibold text-slate-200">
                              {formatDateTimeShortYear(b.endDateTime)}
                            </span>
                          </div>

                          {/* Duration */}
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />Duration
                            </span>
                            <span className="font-semibold text-rose-300">
                              {getBookingDurationLabel(b.startDateTime, b.endDateTime) ||
                                `${getBookingDurationDays(b.startDateTime, b.endDateTime)} day(s)`}
                            </span>
                          </div>

                          {b.totalAmount !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <Banknote className="w-3.5 h-3.5 text-slate-500" />Total Rent
                              </span>
                              <span className="font-bold text-white">{formatCurrency(b.totalAmount)}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Paid Amount
                            </span>
                            <span className="font-bold text-emerald-400">{formatCurrency(b.paidAmount || 0)}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  (b.balanceAmount || 0) > 0 ? "bg-amber-400" : "bg-emerald-400"
                                }`}
                              />
                              Balance Due
                            </span>
                            <span
                              className={`font-bold ${
                                (b.balanceAmount || 0) > 0 ? "text-amber-400" : "text-emerald-400"
                              }`}
                            >
                              {formatCurrency(b.balanceAmount || 0)}
                            </span>
                          </div>

                          {b.createdBy && (
                            <div className="flex justify-between items-center pt-2 mt-1 border-t border-white/5">
                              <span className="text-slate-500 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-slate-500" />Recorded By
                              </span>
                              <span className="font-medium text-slate-300">{b.createdBy.username}</span>
                            </div>
                          )}
                        </div>

                        {/* Button to open full booking detail modal in-place */}
                        <button
                          type="button"
                          onClick={() => openBookingDetails(b)}
                          className="mt-2.5 w-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/45 text-rose-200 hover:text-white rounded-xl py-2 px-3 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
                        >
                          <span>View Booking Details & Payments</span>
                          <ChevronRight className="w-3.5 h-3.5 text-rose-300" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Selected Lock Card ── */}
            {selectedLock && (
              <div className="mx-5 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-gradient-to-br from-amber-500/8 to-amber-600/5 border border-amber-500/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <span className="text-xs font-bold text-white">Vehicle Locked</span>
                    </div>
                    <button
                      onClick={clearSelections}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Close lock details"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-500" />Starting
                      </span>
                      <span className="text-amber-200 font-semibold text-right">
                        {formatDateTimeShortYear(selectedLock.startDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-500" />Ending
                      </span>
                      <span className="text-amber-200 font-semibold text-right">
                        {formatDateTimeShortYear(selectedLock.endDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />Duration
                      </span>
                      <span className="text-slate-200 font-medium">
                        {getBookingDurationLabel(selectedLock.startDate, selectedLock.endDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <CalendarX2 className="w-3.5 h-3.5 text-slate-500" />Reason
                      </span>
                      <span className="text-slate-200 font-medium text-right max-w-[60%]">{selectedLock.reason}</span>
                    </div>
                    {selectedLock.lockedBy && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />Locked By
                        </span>
                        <span className="font-medium text-slate-300">{selectedLock.lockedBy.username}</span>
                      </div>
                    )}
                    <div className="pt-2 mt-1 border-t border-white/5">
                      <button
                        onClick={handleDeleteLock}
                        disabled={deletingLock}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 hover:text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {deletingLock ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                        {deletingLock ? "Releasing…" : "Release Lock"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Free Date Action Card ── */}
            {selectedDate && selectedBookings.length === 0 && !selectedLock && (
              <div className="mx-5 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-gradient-to-br from-indigo-500/8 to-indigo-600/5 border border-indigo-500/25 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white">Available Date</span>
                        <p className="text-[10px] text-slate-400">{formatDateNice(selectedDate)}</p>
                      </div>
                    </div>
                    <button
                      onClick={clearSelections}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Close action card"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!showLockForm ? (
                    /* ── Two Action Buttons ── */
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLockForm(true);
                          setLockError("");
                        }}
                        className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 hover:text-white text-xs font-bold transition-all active:scale-95 group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Lock Vehicle</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-amber-400" />
                      </button>

                      <Link
                        href={`/vehicles/${id}/book?date=${getLocalTodayDateString(selectedDate)}`}
                        className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-bold transition-all active:scale-95 group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Record Booking from this Day</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-indigo-400" />
                      </Link>
                    </div>
                  ) : (
                    /* ── Lock Form ── */
                    <div className="bg-[#12121f]/80 border border-amber-500/20 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          Lock Vehicle Schedule
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowLockForm(false);
                            setLockError("");
                          }}
                          className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>

                      <form onSubmit={handleLockSubmit} className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-400 mb-1">
                              Starting Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={lockStartDateTime}
                              onChange={(e) => setLockStartDateTime(e.target.value)}
                              className="w-full bg-[#101020] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60 transition-all [color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-400 mb-1">
                              Ending Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              required
                              value={lockEndDateTime}
                              min={lockStartDateTime}
                              onChange={(e) => setLockEndDateTime(e.target.value)}
                              className="w-full bg-[#101020] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60 transition-all [color-scheme:dark]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-1">Reason</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Maintenance, Personal use, Servicing…"
                            value={lockReason}
                            onChange={(e) => setLockReason(e.target.value)}
                            className="w-full bg-[#101020] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all"
                          />
                        </div>

                        {lockError && (
                          <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1.5">
                            {lockError}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowLockForm(false);
                              setLockError("");
                            }}
                            className="w-1/3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={lockSubmitting || !lockReason.trim() || !lockStartDateTime || !lockEndDateTime}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 hover:text-white text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {lockSubmitting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                            {lockSubmitting ? "Locking…" : "Confirm Lock"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Booking Detail & Payments Modal ── */}
      <BookingDetailModal
        selectedBooking={activeModalBooking}
        bookingPayments={bookingPayments}
        paymentsLoading={paymentsLoading}
        partAmount={partAmount}
        partMethod={partMethod}
        partNote={partNote}
        submittingPayment={submittingPayment}
        paymentError={paymentError}
        paymentSuccessMsg={paymentSuccessMsg}
        formatCurrency={formatCurrency}
        formatDateTimeNice={formatDateTimeNice}
        getBookingDurationLabel={getBookingDurationLabel}
        onClose={() => setActiveModalBooking(null)}
        onOpenEdit={handleOpenEdit}
        onPartAmountChange={setPartAmount}
        onPartMethodChange={setPartMethod}
        onPartNoteChange={setPartNote}
        onRecordPartPayment={handleRecordPartPayment}
      />

      {/* ── Overpay Confirmation Warning Modal ── */}
      {overpayConfirmData && activeModalBooking && (
        <OverpayWarningModal
          overpayConfirmData={overpayConfirmData}
          selectedBooking={activeModalBooking}
          submittingPayment={submittingPayment}
          formatCurrency={formatCurrency}
          onClose={() => setOverpayConfirmData(null)}
          onConfirm={(num) => executePayment(num)}
        />
      )}

      {/* ── Edit Booking Modal ── */}
      {editingBooking && (
        <EditBookingModal
          editingBooking={editingBooking}
          editCustomerName={editCustomerName}
          editStartDateTime={editStartDateTime}
          editEndDateTime={editEndDateTime}
          editTotalAmount={editTotalAmount}
          submittingEdit={submittingEdit}
          editError={editError}
          vehicleId={id}
          formatCurrency={formatCurrency}
          getBookingDurationLabel={getBookingDurationLabel}
          onClose={() => setEditingBooking(null)}
          onCustomerNameChange={setEditCustomerName}
          onStartDateTimeChange={setEditStartDateTime}
          onEndDateTimeChange={setEditEndDateTime}
          onTotalAmountChange={setEditTotalAmount}
          onSubmit={handleEditBookingSubmit}
        />
      )}
    </div>
  );
}
