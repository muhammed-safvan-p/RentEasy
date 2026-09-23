"use client";

import React from "react";
import { Receipt, X, Loader2, Trash2 } from "lucide-react";
import { WalletTransaction } from "@/types/wallet";
import { useModalA11y } from "@/hooks/useModalA11y";

interface TransactionDetailModalProps {
  selectedTx: WalletTransaction | null;
  deletingTx: boolean;
  formatCurrency: (amount: number) => string;
  formatFullDateTime: (dateStr: string) => string;
  onClose: () => void;
  onDelete: (txId: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  selectedTx,
  deletingTx,
  formatCurrency,
  formatFullDateTime,
  onClose,
  onDelete,
}) => {
  const modalRef = useModalA11y({
    isOpen: !!selectedTx,
    onClose,
  });

  if (!selectedTx) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-[#16162a] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <span
            id="tx-modal-title"
            className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"
          >
            <Receipt className="w-4 h-4 text-indigo-400" />
            Transaction Details
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Hero */}
        <div className="text-center py-4 bg-black/25 rounded-2xl border border-white/5 mb-4">
          <span
            className={`text-3xl font-black tracking-tight ${
              selectedTx.type === "income" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {selectedTx.type === "income" ? "+" : "-"}
            {formatCurrency(selectedTx.amount)}
          </span>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold">
            <span
              className={`px-2.5 py-0.5 rounded-full font-medium ${
                selectedTx.type === "income"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                  : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
              }`}
            >
              {selectedTx.type === "income" ? "Income" : "Expense"}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 uppercase text-[10px] font-medium">
              {selectedTx.paymentMethod}
            </span>
          </div>
        </div>

        {/* Metadata Rows */}
        <div className="space-y-2.5 text-xs mb-6">
          <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
            <span className="text-slate-400">Description / Note</span>
            <span className="font-semibold text-white max-w-[220px] text-right truncate">
              {(() => {
                const bookingObj = typeof selectedTx.bookingId === "object" ? selectedTx.bookingId : null;
                let note = selectedTx.note;
                if (!note) {
                  return selectedTx.type === "income" ? "Unspecified Income" : "Unspecified Expense";
                }
                if (bookingObj?.customerName) {
                  if (note.startsWith("Payment for booking")) {
                    return `Booking payment • ${bookingObj.customerName}`;
                  }
                  if (note.startsWith("Refund for cancelled booking")) {
                    return `Refund • ${bookingObj.customerName}`;
                  }
                }
                return note;
              })()}
            </span>
          </div>

          {typeof selectedTx.bookingId === "object" && selectedTx.bookingId?.customerName && (
            <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
              <span className="text-slate-400">Customer</span>
              <span className="font-semibold text-white">
                {selectedTx.bookingId.customerName}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
            <span className="text-slate-400">Date & Time</span>
            <span className="font-semibold text-slate-200">
              {formatFullDateTime(selectedTx.transactionDate || selectedTx.createdAt)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
            <span className="text-slate-400">Recorded By</span>
            <span className="font-semibold text-slate-200">
              {selectedTx.createdBy?.username || "Owner"}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
            <span className="text-slate-400">Origin / Source</span>
            <span className="font-semibold text-slate-200">
              {selectedTx.source === "booking" ? "Automatic Booking" : "Manual Entry"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold text-xs transition-colors"
          >
            Close
          </button>

          {/* Allow delete for manual entries */}
          {selectedTx.source === "manual" && (
            <button
              type="button"
              onClick={() => onDelete(selectedTx._id)}
              disabled={deletingTx}
              className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {deletingTx ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Delete Entry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
