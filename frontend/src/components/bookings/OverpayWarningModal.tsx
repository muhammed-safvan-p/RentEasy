"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Booking } from "@/types/booking";

interface OverpayWarningModalProps {
  overpayConfirmData: {
    numAmount: number;
    newTotal: number;
    excess: number;
  } | null;
  selectedBooking: Booking | null;
  submittingPayment: boolean;
  formatCurrency: (amount: number) => string;
  onClose: () => void;
  onConfirm: (numAmount: number) => void;
}

export const OverpayWarningModal: React.FC<OverpayWarningModalProps> = ({
  overpayConfirmData,
  selectedBooking,
  submittingPayment,
  formatCurrency,
  onClose,
  onConfirm,
}) => {
  if (!overpayConfirmData || !selectedBooking) return null;

  return (
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
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(overpayConfirmData.numAmount)}
            disabled={submittingPayment}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 active:scale-95 transition-all disabled:opacity-50"
          >
            {submittingPayment ? "Recording..." : "Confirm & Increase"}
          </button>
        </div>
      </div>
    </div>
  );
};
