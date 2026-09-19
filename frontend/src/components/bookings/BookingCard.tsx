"use client";

import React from "react";
import { User, CheckCircle2, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Booking } from "@/types/booking";

interface BookingCardProps {
  booking: Booking;
  formatCurrency: (amount: number) => string;
  formatDateTimeNice: (dateStr: string) => string;
  getBookingDurationLabel: (startStr: string, endStr: string) => string;
  getBookingStatus: (booking: Booking) => "active" | "upcoming" | "completed" | "cancelled";
  onOpenDetails: (booking: Booking) => void;
  onOpenEdit: (booking: Booking) => void;
  onOpenCancel: (booking: Booking) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  formatCurrency,
  formatDateTimeNice,
  getBookingDurationLabel,
  getBookingStatus,
  onOpenDetails,
  onOpenEdit,
  onOpenCancel,
}) => {
  const status = getBookingStatus(booking);
  const durationLabel = getBookingDurationLabel(booking.startDateTime, booking.endDateTime);
  const pctPaid =
    booking.totalAmount > 0
      ? Math.min(100, Math.round((booking.paidAmount / booking.totalAmount) * 100))
      : 100;

  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-3xl p-4 shadow-xl hover:border-white/20 transition-all space-y-3 relative overflow-hidden">
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
            {formatDateTimeNice(booking.startDateTime)} &rarr; {formatDateTimeNice(booking.endDateTime)}
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
          ) : booking.balanceAmount < 0 ? (
            <span className="text-[11px] font-bold text-emerald-400">
              Paid: {formatCurrency(booking.paidAmount)} &bull; Credit: {formatCurrency(Math.abs(booking.balanceAmount))}
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
              booking.balanceAmount <= 0
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
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenEdit(booking)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center gap-1"
              aria-label="Edit booking"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCancel(booking)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1"
              aria-label="Cancel booking"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 italic pl-1">
            {booking.cancellationNote || "Cancelled reservation"}
          </span>
        )}

        <button
          type="button"
          onClick={() => onOpenDetails(booking)}
          className="btn-primary rounded-xl px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition-transform ml-auto"
        >
          <span>Details & Payment</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
