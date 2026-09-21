"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Booking } from "@/types/booking";
import { useModalA11y } from "@/hooks/useModalA11y";

interface CancelBookingModalProps {
  cancellingBooking: Booking | null;
  refundAmount: string;
  refundMethod: "cash" | "bank";
  cancellationNote: string;
  submittingCancel: boolean;
  cancelError: string;
  formatCurrency: (amount: number) => string;
  formatDateTimeNice: (dateStr: string) => string;
  onClose: () => void;
  onRefundAmountChange: (value: string) => void;
  onRefundMethodChange: (method: "cash" | "bank") => void;
  onCancellationNoteChange: (note: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  cancellingBooking,
  refundAmount,
  refundMethod,
  cancellationNote,
  submittingCancel,
  cancelError,
  formatCurrency,
  formatDateTimeNice,
  onClose,
  onRefundAmountChange,
  onRefundMethodChange,
  onCancellationNoteChange,
  onSubmit,
}) => {
  const modalRef = useModalA11y({
    isOpen: !!cancellingBooking,
    onClose,
  });

  if (!cancellingBooking) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-modal-title"
        className="w-full max-w-sm bg-[#18182c] border border-rose-500/30 rounded-3xl p-5 shadow-2xl space-y-4"
      >
        {/* Warning Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 id="cancel-booking-modal-title" className="text-base font-bold text-white">Cancel Booking?</h3>
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
            Total: <strong className="text-white">{formatCurrency(cancellingBooking.totalAmount)}</strong> &bull; Paid:{" "}
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

        <form onSubmit={onSubmit} className="space-y-3">
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
                onChange={(e) => onRefundAmountChange(e.target.value)}
                className="w-full bg-[#101020] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-rose-500/80"
              />
              {Number(refundAmount) > 0 && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onRefundMethodChange("cash")}
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
                    onClick={() => onRefundMethodChange("bank")}
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
              onChange={(e) => onCancellationNoteChange(e.target.value)}
              placeholder="e.g. Customer cancelled trip"
              className="w-full bg-[#101020] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
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
  );
};
