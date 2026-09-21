"use client";

import React from "react";
import { useModalA11y } from "@/hooks/useModalA11y";
import {
  X,
  Pencil,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Building2,
  ChevronRight,
  History,
} from "lucide-react";
import { Booking, BookingPayment } from "@/types/booking";

interface BookingDetailModalProps {
  selectedBooking: Booking | null;
  bookingPayments: BookingPayment[];
  paymentsLoading: boolean;
  partAmount: string;
  partMethod: "cash" | "bank";
  partNote: string;
  submittingPayment: boolean;
  paymentError: string;
  paymentSuccessMsg: string;
  formatCurrency: (amount: number) => string;
  formatDateTimeNice: (dateStr: string | Date) => string;
  getBookingDurationLabel: (start: string | Date, end: string | Date) => string;
  onClose: () => void;
  onOpenEdit: (booking: Booking) => void;
  onPartAmountChange: (value: string) => void;
  onPartMethodChange: (value: "cash" | "bank") => void;
  onPartNoteChange: (value: string) => void;
  onRecordPartPayment: (e: React.FormEvent) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  selectedBooking,
  bookingPayments,
  paymentsLoading,
  partAmount,
  partMethod,
  partNote,
  submittingPayment,
  paymentError,
  paymentSuccessMsg,
  formatCurrency,
  formatDateTimeNice,
  getBookingDurationLabel,
  onClose,
  onOpenEdit,
  onPartAmountChange,
  onPartMethodChange,
  onPartNoteChange,
  onRecordPartPayment,
}) => {
  const modalRef = useModalA11y({
    isOpen: !!selectedBooking,
    onClose,
  });

  if (!selectedBooking) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-detail-modal-title"
        className="w-full sm:max-w-md bg-[#161628] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a2e]">
          <div>
            <div className="flex items-center gap-2">
              <h3 id="booking-detail-modal-title" className="text-base font-bold text-white">Booking Details</h3>
              <span className="font-mono text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                #{selectedBooking._id.slice(-6).toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-indigo-400 font-medium">
              {selectedBooking.customerName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!selectedBooking.isCancelled && (
              <button
                type="button"
                onClick={() => onOpenEdit(selectedBooking)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors"
                aria-label="Edit booking"
              >
                <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
              onSubmit={onRecordPartPayment}
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
                    onClick={() => onPartAmountChange(String(selectedBooking.balanceAmount))}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/5"
                  >
                    Full Due
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onPartAmountChange(String(Math.round(selectedBooking.balanceAmount / 2)))
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
                    required
                    value={partAmount}
                    onChange={(e) => onPartAmountChange(e.target.value)}
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
                    onClick={() => onPartMethodChange("cash")}
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
                    onClick={() => onPartMethodChange("bank")}
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
                  onChange={(e) => onPartNoteChange(e.target.value)}
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
  );
};
