"use client";

import React from "react";
import { X, AlertCircle, TrendingUp, TrendingDown, Banknote, Building2, Loader2 } from "lucide-react";
import { useModalA11y } from "@/hooks/useModalA11y";

interface AddTransactionModalProps {
  isOpen: boolean;
  formType: "income" | "expense";
  formPaymentMethod: "cash" | "bank";
  formAmount: string;
  formNote: string;
  formDate: string;
  formError: string;
  submitting: boolean;
  todayStr: string;
  onClose: () => void;
  onFormTypeChange: (type: "income" | "expense") => void;
  onPaymentMethodChange: (method: "cash" | "bank") => void;
  onAmountChange: (amount: string) => void;
  onNoteChange: (note: string) => void;
  onDateChange: (date: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  formType,
  formPaymentMethod,
  formAmount,
  formNote,
  formDate,
  formError,
  submitting,
  todayStr,
  onClose,
  onFormTypeChange,
  onPaymentMethodChange,
  onAmountChange,
  onNoteChange,
  onDateChange,
  onSubmit,
}) => {
  const modalRef = useModalA11y({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tx-modal-title"
        className="bg-[#16162a] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <h3 id="add-tx-modal-title" className="text-base font-bold text-white">Record Transaction</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Type Selector: Income / Expense */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onFormTypeChange("income")}
                className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                  formType === "income"
                    ? "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/25"
                    : "bg-[#1f1f38] text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Income
              </button>
              <button
                type="button"
                onClick={() => onFormTypeChange("expense")}
                className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                  formType === "expense"
                    ? "bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25"
                    : "bg-[#1f1f38] text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Expense
              </button>
            </div>
          </div>

          {/* Payment Method Selector: Cash / Bank */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onPaymentMethodChange("cash")}
                className={`py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all border ${
                  formPaymentMethod === "cash"
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                    : "bg-[#1f1f38] text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                Cash
              </button>
              <button
                type="button"
                onClick={() => onPaymentMethodChange("bank")}
                className={`py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all border ${
                  formPaymentMethod === "bank"
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                    : "bg-[#1f1f38] text-slate-400 border-white/5 hover:text-white"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Bank
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={formAmount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#121224] border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white font-semibold placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Transaction Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              max={todayStr}
              value={formDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full bg-[#121224] border border-white/10 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors text-sm [color-scheme:dark]"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Note / Description
            </label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="e.g. Fuel, Maintenance, Advance"
              maxLength={120}
              className="w-full bg-[#121224] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl btn-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Entry"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
