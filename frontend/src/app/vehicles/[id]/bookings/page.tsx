"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Calendar } from "lucide-react";
import useSWR from "swr";
import { useVehicleDetail, invalidateVehicleData } from "@/hooks/useVehicleData";
import { fetcher, api, ApiError } from "@/lib/api";
import {
  formatCurrency,
  formatDateTimeNice,
  formatMonthDisplay,
  toLocalISOString,
  getBookingDurationLabel,
  getBookingStatus,
} from "@/lib/formatters";
import { Booking, BookingPayment, FilterKey } from "@/types/booking";
import { BookingFilterBar } from "@/components/bookings/BookingFilterBar";
import { BookingCard } from "@/components/bookings/BookingCard";
import { BookingDetailModal } from "@/components/bookings/BookingDetailModal";
import { EditBookingModal } from "@/components/bookings/EditBookingModal";
import { CancelBookingModal } from "@/components/bookings/CancelBookingModal";
import { OverpayWarningModal } from "@/components/bookings/OverpayWarningModal";
import { ErrorBanner } from "@/components/common/ErrorBanner";

export default function VehicleBookingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get("date");
      if (dateParam) {
        const [year, month] = dateParam.split("-").map(Number);
        if (year && month) {
          return new Date(year, month - 1, 1);
        }
      }
    }
    return new Date();
  });
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const [errorMessage, setErrorMessage] = useState("");

  // Detail & Payment Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingPayments, setBookingPayments] = useState<BookingPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Part Payment Form
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

  // Cancellation Modal
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("0");
  const [refundMethod, setRefundMethod] = useState<"cash" | "bank">("cash");
  const [cancellationNote, setCancellationNote] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Edit Booking Modal
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editStartDateTime, setEditStartDateTime] = useState("");
  const [editEndDateTime, setEditEndDateTime] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState<string>("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Vehicle SWR hook
  const { vehicle, isLoading: vehicleLoading, error: vehicleError } = useVehicleDetail(id);

  // Monthly Bookings SWR query
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const from = useMemo(() => new Date(year, month, 1, 0, 0, 0, 0).toISOString(), [year, month]);
  const to = useMemo(() => new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString(), [year, month]);

  const bookingsKey = id
    ? `/api/bookings?vehicleId=${id}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=100`
    : null;

  const {
    data: bookingsData,
    error: bookingsError,
    isLoading: bookingsLoading,
    mutate: mutateBookings,
  } = useSWR<{ bookings: Booking[] }>(bookingsKey, fetcher);

  const bookings = useMemo(() => bookingsData?.bookings || [], [bookingsData]);

  const anyError = vehicleError || bookingsError;
  useEffect(() => {
    if (anyError && (anyError as ApiError).status === 401) {
      router.push("/login");
    }
  }, [anyError, router]);

  const loading = vehicleLoading && !vehicle;
  const listLoading = bookingsLoading && !bookingsData;

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

  const openBookingDetails = useCallback(async (booking: Booking) => {
    setSelectedBooking(booking);
    setPartAmount(booking.balanceAmount > 0 ? String(booking.balanceAmount) : "");
    setPartMethod("cash");
    setPartNote("");
    setPaymentError("");
    setPaymentSuccessMsg("");
    setPaymentsLoading(true);

    try {
      const data = await api.get<{ payments: BookingPayment[] }>(`/api/bookings/${booking._id}/payments`);
      setBookingPayments(data.payments || []);
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : "Failed to load payment history. Please try again.");
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  // Auto-select booking & check paymentFailed param from URL search parameters
  useEffect(() => {
    if (typeof window === "undefined" || !bookings.length) return;
    const params = new URLSearchParams(window.location.search);
    const bookingIdParam = params.get("bookingId");
    const paymentFailedParam = params.get("paymentFailed") === "true";

    if (bookingIdParam) {
      const match = bookings.find((b) => b._id === bookingIdParam);
      if (match) {
        const timer = setTimeout(() => {
          openBookingDetails(match);
          if (paymentFailedParam) {
            setPaymentError(
              "Booking confirmed! However, recording the initial payment failed. Please review and record the payment below."
            );
          }
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [bookings, openBookingDetails]);

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

  const monthMetrics = useMemo(() => {
    let totalCount = 0;
    let totalRevenue = 0;
    let totalCredited = 0;
    let totalDue = 0;

    for (const b of bookings) {
      if (!b.isCancelled) {
        totalCount += 1;
        totalRevenue += b.totalAmount || 0;
        totalCredited += b.paidAmount || 0;
        if (b.balanceAmount > 0) {
          totalDue += b.balanceAmount;
        }
      }
    }

    return { totalCount, totalRevenue, totalCredited, totalDue };
  }, [bookings]);

  const handleRecordPartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || submittingPayment) return;

    const numAmount = Number(partAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPaymentError("Please enter a valid positive payment amount.");
      return;
    }

    if (numAmount > selectedBooking.balanceAmount && !overpayConfirmData) {
      const newTotal = selectedBooking.paidAmount + numAmount;
      const excess = numAmount - selectedBooking.balanceAmount;
      setOverpayConfirmData({ numAmount, newTotal, excess });
      return;
    }

    await executePayment(numAmount);
  };

  const executePayment = async (numAmount: number) => {
    if (!selectedBooking || submittingPayment) return;

    setSubmittingPayment(true);
    setPaymentError("");
    setPaymentSuccessMsg("");
    setOverpayConfirmData(null);

    try {
      const data = await api.post<{ booking: Booking; payment?: BookingPayment }>(
        `/api/bookings/${selectedBooking._id}/payments`,
        {
          amount: numAmount,
          paymentMethod: partMethod,
          note: partNote.trim() || `Part-payment via ${partMethod}`,
        }
      );

      const updatedBooking = data.booking;
      setSelectedBooking(updatedBooking);

      if (data.payment) {
        setBookingPayments((prev) => [data.payment!, ...prev]);
      }

      setPartAmount(updatedBooking.balanceAmount > 0 ? String(updatedBooking.balanceAmount) : "");
      setPartNote("");
      setPaymentSuccessMsg("Payment recorded successfully & credited to vehicle wallet!");

      await mutateBookings();
      if (id) await invalidateVehicleData(id);
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : "Error recording payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openCancelModal = (booking: Booking) => {
    setCancellingBooking(booking);
    setRefundAmount(booking.paidAmount > 0 ? String(booking.paidAmount) : "0");
    setRefundMethod("cash");
    setCancellationNote("");
    setCancelError("");
  };

  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBooking || submittingCancel) return;

    const parsedRefund = Number(refundAmount) || 0;
    if (parsedRefund < 0 || parsedRefund > cancellingBooking.paidAmount) {
      setCancelError(`Refund cannot exceed the paid amount (${formatCurrency(cancellingBooking.paidAmount)}).`);
      return;
    }

    setSubmittingCancel(true);
    setCancelError("");

    try {
      const data = await api.post<{ booking: Booking }>(`/api/bookings/${cancellingBooking._id}/cancel`, {
        refundAmount: parsedRefund,
        refundMethod,
        cancellationNote: cancellationNote.trim(),
      });

      const cancelled = data.booking;

      if (selectedBooking && selectedBooking._id === cancelled._id) {
        setSelectedBooking(cancelled);
      }

      await mutateBookings();
      if (id) await invalidateVehicleData(id);
      setCancellingBooking(null);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Error processing cancellation");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const openEditModal = (booking: Booking) => {
    setEditingBooking(booking);
    setEditCustomerName(booking.customerName || "");
    setEditStartDateTime(toLocalISOString(booking.startDateTime));
    setEditEndDateTime(toLocalISOString(booking.endDateTime));
    setEditTotalAmount(String(booking.totalAmount));
    setEditError("");
  };

  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || submittingEdit) return;

    if (!editCustomerName.trim()) {
      setEditError("Customer name is required.");
      return;
    }

    const start = new Date(editStartDateTime);
    const end = new Date(editEndDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setEditError("Please select valid start and end dates.");
      return;
    }

    if (end.getTime() <= start.getTime()) {
      setEditError("End date & time must be strictly after the start date & time.");
      return;
    }

    const parsedTotal = Number(editTotalAmount);
    if (isNaN(parsedTotal) || parsedTotal < 0) {
      setEditError("Total rental amount must be a valid non-negative number.");
      return;
    }

    if (parsedTotal < editingBooking.paidAmount) {
      setEditError(
        `Total rental amount (${formatCurrency(parsedTotal)}) cannot be less than already paid amount (${formatCurrency(editingBooking.paidAmount)}).`
      );
      return;
    }

    setSubmittingEdit(true);
    setEditError("");

    try {
      const data = await api.patch<{ booking: Booking }>(`/api/bookings/${editingBooking._id}`, {
        customerName: editCustomerName.trim(),
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        totalAmount: parsedTotal,
      });

      const updatedBooking = data.booking;

      if (selectedBooking && selectedBooking._id === updatedBooking._id) {
        setSelectedBooking(updatedBooking);
      }

      await mutateBookings();
      if (id) await invalidateVehicleData(id);
      setEditingBooking(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Error updating booking");
    } finally {
      setSubmittingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen px-4 sm:px-6 pt-7 pb-32 max-w-lg mx-auto w-full space-y-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#1a1a2e]" />
          <div className="w-32 h-6 bg-[#1a1a2e] rounded-lg" />
          <div className="w-10 h-10 rounded-full bg-[#1a1a2e]" />
        </div>
        <div className="h-12 bg-[#1a1a2e] rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="h-20 bg-[#1a1a2e] rounded-2xl" />
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
      <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage("")} />

      {/* 2. Monthly Filter & Metrics */}
      <BookingFilterBar
        selectedMonth={selectedMonth}
        isCurrentMonth={isCurrentMonth}
        activeFilter={activeFilter}
        totalBookingsCount={bookings.length}
        monthMetrics={monthMetrics}
        formatCurrency={formatCurrency}
        formatMonthDisplay={formatMonthDisplay}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onResetToCurrentMonth={handleResetToCurrentMonth}
        onFilterChange={setActiveFilter}
      />

      {/* 3. Bookings List Content */}
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
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking._id}
              booking={booking}
              formatCurrency={formatCurrency}
              formatDateTimeNice={formatDateTimeNice}
              getBookingDurationLabel={getBookingDurationLabel}
              getBookingStatus={getBookingStatus}
              onOpenDetails={openBookingDetails}
              onOpenEdit={openEditModal}
              onOpenCancel={openCancelModal}
            />
          ))}
        </div>
      )}

      {/* 4. Modals */}
      <BookingDetailModal
        selectedBooking={selectedBooking}
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
        onClose={() => setSelectedBooking(null)}
        onOpenEdit={openEditModal}
        onPartAmountChange={setPartAmount}
        onPartMethodChange={setPartMethod}
        onPartNoteChange={setPartNote}
        onRecordPartPayment={handleRecordPartPayment}
      />

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
        onSubmit={handleConfirmEdit}
      />

      <CancelBookingModal
        cancellingBooking={cancellingBooking}
        refundAmount={refundAmount}
        refundMethod={refundMethod}
        cancellationNote={cancellationNote}
        submittingCancel={submittingCancel}
        cancelError={cancelError}
        formatCurrency={formatCurrency}
        formatDateTimeNice={formatDateTimeNice}
        onClose={() => setCancellingBooking(null)}
        onRefundAmountChange={setRefundAmount}
        onRefundMethodChange={setRefundMethod}
        onCancellationNoteChange={setCancellationNote}
        onSubmit={handleConfirmCancellation}
      />

      <OverpayWarningModal
        overpayConfirmData={overpayConfirmData}
        selectedBooking={selectedBooking}
        submittingPayment={submittingPayment}
        formatCurrency={formatCurrency}
        onClose={() => setOverpayConfirmData(null)}
        onConfirm={executePayment}
      />
    </div>
  );
}
