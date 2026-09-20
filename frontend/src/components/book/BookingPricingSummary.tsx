"use client";

import React from "react";
import { Banknote, RotateCcw, Zap, Building2 } from "lucide-react";
import { BookingVehicle } from "@/types/booking";

interface BookingPricingSummaryProps {
  vehicle: BookingVehicle | null;
  suggestedRent: number;
  totalAmount: number;
  isAmountOverridden: boolean;
  recordPaymentNow: boolean;
  paidAmount: number;
  paymentMethod: "cash" | "bank";
  paymentNote: string;
  remainingBalance: number;
  formatCurrency: (amount: number) => string;
  onResetToSuggested: () => void;
  onTotalAmountChange: (amount: number) => void;
  onRecordPaymentToggle: (checked: boolean) => void;
  onPaidAmountChange: (amount: number) => void;
  onPaymentFraction: (fraction: number) => void;
  onPaymentMethodChange: (method: "cash" | "bank") => void;
  onPaymentNoteChange: (note: string) => void;
}

export const BookingPricingSummary: React.FC<BookingPricingSummaryProps> = ({
  vehicle,
  suggestedRent,
  totalAmount,
  isAmountOverridden,
  recordPaymentNow,
  paidAmount,
  paymentMethod,
  paymentNote,
  remainingBalance,
  formatCurrency,
  onResetToSuggested,
  onTotalAmountChange,
  onRecordPaymentToggle,
  onPaidAmountChange,
  onPaymentFraction,
  onPaymentMethodChange,
  onPaymentNoteChange,
}) => {
  return (
    <>
      {/* 1. Rental Charges & Override Section */}
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
              onClick={onResetToSuggested}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
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
              onChange={(e) => onTotalAmountChange(Number(e.target.value))}
              className="w-full bg-[#101020] border border-white/10 rounded-2xl pl-9 pr-4 py-3 text-base font-bold text-white focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
            />
          </div>

          {suggestedRent > 0 && (
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
              <span>
                Suggested:{" "}
                <strong className="text-slate-300">{formatCurrency(suggestedRent)}</strong>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 2. Initial Payment / Advance Section */}
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
              onChange={(e) => onRecordPaymentToggle(e.target.checked)}
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
                    onClick={() => onPaymentFraction(1)}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 border border-white/5"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => onPaymentFraction(0.5)}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => onPaymentFraction(0.25)}
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
                  value={paidAmount || ""}
                  onChange={(e) => onPaidAmountChange(Number(e.target.value))}
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
                  onClick={() => onPaymentMethodChange("cash")}
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
                  onClick={() => onPaymentMethodChange("bank")}
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
                    <p className="text-[10px] text-slate-400">Direct Deposit</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label htmlFor="paymentNote" className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Payment Note / Reference (Optional)
              </label>
              <input
                id="paymentNote"
                type="text"
                value={paymentNote}
                onChange={(e) => onPaymentNoteChange(e.target.value)}
                placeholder="e.g. Google Pay UTR # or Advance Token"
                className="w-full bg-[#101020] border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
              />
            </div>

            {/* Summary Split */}
            <div className="bg-[#101020] rounded-2xl p-3 border border-white/5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Rental Cost:</span>
                <span className="font-bold text-white">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">Recorded Advance:</span>
                <span className="font-bold text-emerald-400">
                  -{formatCurrency(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-white/5 font-bold">
                <span className={remainingBalance < 0 ? "text-emerald-400" : "text-amber-400"}>
                  {remainingBalance < 0 ? "Customer Credit:" : "Balance Remaining:"}
                </span>
                <span className={remainingBalance < 0 ? "text-emerald-400" : "text-amber-400"}>
                  {remainingBalance < 0 ? `+${formatCurrency(Math.abs(remainingBalance))}` : formatCurrency(remainingBalance)}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
};
