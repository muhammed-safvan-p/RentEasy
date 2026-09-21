"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Car,
  ChevronRight,
} from "lucide-react";
import useSWR from "swr";
import { useVehicleDetail, invalidateVehicleData } from "@/hooks/useVehicleData";
import { api, fetcher, ApiError } from "@/lib/api";
import {
  formatCurrency,
  formatDateNice,
  toLocalISOString,
  toSafeDateISOString,
} from "@/lib/formatters";
import { BookingVehicle, CalendarBooking } from "@/types/booking";
import { VehicleLock } from "@/types";
import { DateTimeSelector } from "@/components/book/DateTimeSelector";
import { ConflictAlert } from "@/components/book/ConflictAlert";
import { LockConflictAlert } from "@/components/book/LockConflictAlert";
import { CustomerDetailsForm } from "@/components/book/CustomerDetailsForm";
import { BookingPricingSummary } from "@/components/book/BookingPricingSummary";
import { ErrorBanner } from "@/components/common/ErrorBanner";

interface ConfirmedBooking {
  _id: string;
  customerName: string;
  startDateTime: string;
  endDateTime: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod?: string;
  paymentNote?: string;
  status?: string;
}

export default function VehicleBookingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [startDateTime, setStartDateTime] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get("date");
      if (dateParam) {
        const [year, month, day] = dateParam.split("-").map(Number);
        return toLocalISOString(new Date(year, month - 1, day, 9, 0, 0));
      }
    }
    const now = new Date();
    const start = new Date(now);
    start.setHours(start.getHours() + 1, 0, 0, 0);
    return toLocalISOString(start);
  });
  const [endDateTime, setEndDateTime] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get("date");
      if (dateParam) {
        const [year, month, day] = dateParam.split("-").map(Number);
        const start = new Date(year, month - 1, day, 9, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return toLocalISOString(end);
      }
    }
    const now = new Date();
    const start = new Date(now);
    start.setHours(start.getHours() + 1, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return toLocalISOString(end);
  });
  const [customTotalAmount, setCustomTotalAmount] = useState<number | null>(null);

  // Payment section state
  const [recordPaymentNow, setRecordPaymentNow] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [paymentNote, setPaymentNote] = useState("");

  // Success state
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);

  const isAmountOverridden = customTotalAmount !== null;

  // Centralized SWR hooks
  const { vehicle: rawVehicle, isLoading: vehicleLoading, error: vehicleError } = useVehicleDetail(id);
  const vehicle = rawVehicle as unknown as BookingVehicle | null;

  const monthKey = startDateTime ? startDateTime.slice(0, 7) : "";
  const from = useMemo(() => {
    const baseDate = monthKey ? new Date(`${monthKey}-01`) : new Date();
    const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;
    return new Date(validBase.getFullYear(), validBase.getMonth() - 1, 1).toISOString();
  }, [monthKey]);

  const to = useMemo(() => {
    const baseDate = monthKey ? new Date(`${monthKey}-01`) : new Date();
    const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;
    return new Date(validBase.getFullYear(), validBase.getMonth() + 2, 0, 23, 59, 59, 999).toISOString();
  }, [monthKey]);

  const calKey = id
    ? `/api/vehicles/${id}/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    : null;

  const {
    data: calData,
    error: calError,
    isLoading: calLoading,
  } = useSWR<{ bookings?: CalendarBooking[]; locks?: VehicleLock[] }>(calKey, fetcher, {
    refreshInterval: 15000,
  });

  const calendarBookings = useMemo(() => calData?.bookings || [], [calData]);
  const calendarLocks = useMemo(() => calData?.locks || [], [calData]);
  const loading = (vehicleLoading && !vehicle) || (calLoading && !calData);

  const anyError = vehicleError || calError;
  useEffect(() => {
    if (anyError && (anyError as ApiError).status === 401) {
      router.push("/login");
    }
  }, [anyError, router]);

  // Duration & Pricing Calculations
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

  // Default suggested rent (0 as fixed daily/hourly rates are removed)
  const suggestedRent = 0;

  // Derived effective total amount
  const totalAmount = isAmountOverridden && customTotalAmount !== null ? customTotalAmount : suggestedRent;

  // Overlap Booking Conflict Detection
  const conflictingBooking = useMemo(() => {
    if (!durationInfo || !durationInfo.isValid) return null;
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    return calendarBookings.find((b) => {
      if (b.isCancelled) return false;
      const bStart = new Date(b.startDateTime);
      const bEnd = new Date(b.endDateTime);
      return bStart < end && bEnd > start;
    });
  }, [calendarBookings, startDateTime, endDateTime, durationInfo]);

  // Overlap Vehicle Lock Conflict Detection
  const conflictingLock = useMemo(() => {
    if (!durationInfo || !durationInfo.isValid) return null;
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    return calendarLocks.find((l) => {
      const lStart = new Date(l.startDate);
      const lEnd = new Date(l.endDate);
      return lStart < end && lEnd > start;
    });
  }, [calendarLocks, startDateTime, endDateTime, durationInfo]);

  // Remaining balance calculation
  const remainingBalance = useMemo(() => {
    const total = Number(totalAmount) || 0;
    const paid = recordPaymentNow ? Number(paidAmount) || 0 : 0;
    return total - paid;
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
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;

    const friday = new Date(now);
    friday.setDate(now.getDate() + daysUntilFriday);
    friday.setHours(17, 0, 0, 0);

    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    sunday.setHours(21, 0, 0, 0);

    setStartDateTime(toLocalISOString(friday));
    setEndDateTime(toLocalISOString(sunday));
    setCustomTotalAmount(null);
  };

  const setPaymentFraction = (fraction: number) => {
    const calculated = Math.round(totalAmount * fraction);
    setPaidAmount(calculated);
  };

  // Form Submit Handler
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || submitting) return;

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

    if (conflictingLock) {
      setErrorMessage("The vehicle is locked during this time range. Please pick other dates.");
      return;
    }

    if (totalAmount < 0) {
      setErrorMessage("Total rental amount must be greater than or equal to 0.");
      return;
    }

    if (recordPaymentNow && Number(paidAmount) < 0) {
      setErrorMessage("Paid amount cannot be negative.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Create Booking
      const createData = await api.post<{ booking: ConfirmedBooking }>(`/api/bookings`, {
        vehicleId: vehicle._id,
        customerName: customerName.trim(),
        startDateTime: toSafeDateISOString(startDateTime),
        endDateTime: toSafeDateISOString(endDateTime),
        totalAmount: Number(totalAmount),
      });

      const newBooking = createData.booking;
      let finalBookingState = newBooking;

      // 2. If Payment recorded immediately
      if (recordPaymentNow && Number(paidAmount) > 0) {
        try {
          const payData = await api.post<{ booking: ConfirmedBooking }>(
            `/api/bookings/${newBooking._id}/payments`,
            {
              amount: Number(paidAmount),
              paymentMethod,
              note: paymentNote.trim() || "Initial Advance / Token Payment",
            }
          );
          finalBookingState = payData.booking;
        } catch {
          // Booking exists in database! Invalidate caches so other screens reflect the booking,
          // then redirect operator to bookings page with query params to retry payment without ghost bookings.
          await invalidateVehicleData(vehicle._id);
          router.push(
            `/vehicles/${vehicle._id}/bookings?bookingId=${newBooking._id}&paymentFailed=true`
          );
          return;
        }
      }

      // Invalidate global SWR caches
      await invalidateVehicleData(id);

      setConfirmedBooking({
        ...finalBookingState,
        paymentMethod: recordPaymentNow ? paymentMethod : undefined,
        paymentNote: recordPaymentNow ? paymentNote : undefined,
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred while booking");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-8 pb-28 max-w-lg mx-auto w-full space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#1a1a2e]" />
          <div className="w-28 h-6 bg-[#1a1a2e] rounded-lg" />
          <div className="w-10 h-10" />
        </div>
        <div className="h-28 bg-[#1a1a2e] rounded-3xl" />
        <div className="h-20 bg-[#1a1a2e] rounded-3xl" />
        <div className="h-44 bg-[#1a1a2e] rounded-3xl" />
        <div className="h-32 bg-[#1a1a2e] rounded-3xl" />
      </div>
    );
  }

  // Confirmation View
  if (confirmedBooking) {
    return (
      <div className="flex flex-col min-h-screen px-5 pt-8 pb-28 max-w-lg mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">Booking Confirmed!</h1>
          <p className="text-xs text-slate-400 mt-1">
            Trip reservation created & scheduled successfully.
          </p>
        </div>

        <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl mb-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Customer Name
              </p>
              <p className="text-base font-bold text-white mt-0.5">
                {confirmedBooking.customerName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Booking ID
              </p>
              <p className="font-mono text-xs text-indigo-400 font-bold mt-0.5">
                #{confirmedBooking._id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Vehicle:</span>
              <span className="font-bold text-white">
                {vehicle?.name} ({vehicle?.plateNumber})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Starts:</span>
              <span className="font-semibold text-slate-200">
                {formatDateNice(confirmedBooking.startDateTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ends:</span>
              <span className="font-semibold text-slate-200">
                {formatDateNice(confirmedBooking.endDateTime)}
              </span>
            </div>
          </div>

          <div className="bg-[#101020] rounded-2xl p-4 border border-white/5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Rental:</span>
              <span className="font-bold text-white">
                {formatCurrency(confirmedBooking.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-400">Paid / Advance:</span>
              <span className="font-bold text-emerald-400">
                {formatCurrency(confirmedBooking.paidAmount)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/5">
              <span className={confirmedBooking.balanceAmount < 0 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {confirmedBooking.balanceAmount < 0 ? "Customer Credit:" : "Balance Remaining:"}
              </span>
              <span className={confirmedBooking.balanceAmount < 0 ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>
                {confirmedBooking.balanceAmount < 0
                  ? `+${formatCurrency(Math.abs(confirmedBooking.balanceAmount))}`
                  : formatCurrency(confirmedBooking.balanceAmount)}
              </span>
            </div>
          </div>
        </div>

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
    <div className="flex flex-col min-h-screen px-5 pt-7 pb-36 max-w-lg mx-auto w-full relative">
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
        <div className="w-10" />
      </div>

      {/* Global Error Banner */}
      <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage("")} />

      {/* 2. Vehicle Context Card */}
      <section className="bg-gradient-to-br from-[#1c1c30] to-[#141426] border border-white/10 rounded-3xl p-4 mb-5 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-13 h-13 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 overflow-hidden shadow-sm relative">
            {vehicle?.imageUrl ? (
              <Image
                src={vehicle.imageUrl}
                alt={vehicle.name}
                width={80}
                height={80}
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
            <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {vehicle?.seatingCapacity || 5} Seater
            </span>
          </div>
        </div>
      </section>

      <form onSubmit={handleCreateBooking} className="space-y-5">
        {/* 3. Customer Details */}
        <CustomerDetailsForm
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          vehicleId={id}
        />

        {/* 4. Schedule & Duration */}
        <DateTimeSelector
          startDateTime={startDateTime}
          endDateTime={endDateTime}
          durationInfo={durationInfo}
          hasConflict={!!conflictingBooking || !!conflictingLock}
          onStartDateTimeChange={(val) => {
            setStartDateTime(val);
            setCustomTotalAmount(null);
          }}
          onEndDateTimeChange={(val) => {
            setEndDateTime(val);
            setCustomTotalAmount(null);
          }}
          onApplyPreset={handleApplyPreset}
          onApplyWeekendPreset={handleApplyWeekendPreset}
        />

        {/* Overlap Conflict Cards */}
        <ConflictAlert
          conflictingBooking={conflictingBooking}
          formatDateNice={formatDateNice}
        />
        <LockConflictAlert
          conflictingLock={conflictingLock}
          formatDateNice={formatDateNice}
        />

        {/* 5. Pricing & Advance Payment */}
        <BookingPricingSummary
          vehicle={vehicle}
          suggestedRent={suggestedRent}
          totalAmount={totalAmount}
          isAmountOverridden={isAmountOverridden}
          recordPaymentNow={recordPaymentNow}
          paidAmount={paidAmount}
          paymentMethod={paymentMethod}
          paymentNote={paymentNote}
          remainingBalance={remainingBalance}
          formatCurrency={formatCurrency}
          onResetToSuggested={() => setCustomTotalAmount(null)}
          onTotalAmountChange={(val) => setCustomTotalAmount(val)}
          onRecordPaymentToggle={(checked) => {
            setRecordPaymentNow(checked);
            if (checked && paidAmount === 0 && totalAmount > 0) {
              setPaidAmount(totalAmount);
            }
          }}
          onPaidAmountChange={setPaidAmount}
          onPaymentFraction={setPaymentFraction}
          onPaymentMethodChange={setPaymentMethod}
          onPaymentNoteChange={setPaymentNote}
        />

        {/* 6. Sticky Floating Submit Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0e0e1a]/90 backdrop-blur-md border-t border-white/10 z-40">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Amount</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white">{formatCurrency(totalAmount)}</span>
                {recordPaymentNow && Number(paidAmount) > 0 && (
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    ({formatCurrency(paidAmount)} now)
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || (durationInfo !== null && !durationInfo.isValid) || !!conflictingBooking || !!conflictingLock}
              className="btn-primary rounded-2xl px-6 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Reserving...</span>
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
