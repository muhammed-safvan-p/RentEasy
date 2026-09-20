"use client";

import React from "react";
import { X, Pencil, AlertCircle, Calendar, Clock } from "lucide-react";
import { Booking } from "@/types/booking";
import { DealerComboboxInput } from "@/components/dealers/DealerComboboxInput";

interface EditBookingModalProps {
  editingBooking: Booking | null;
  editCustomerName: string;
  editStartDateTime: string;
  editEndDateTime: string;
  editTotalAmount: string;
  submittingEdit: boolean;
  editError: string;
  vehicleId?: string;
  formatCurrency: (amount: number) => string;
  getBookingDurationLabel: (startStr: string, endStr: string) => string;
  onClose: () => void;
  onCustomerNameChange: (value: string) => void;
  onStartDateTimeChange: (value: string) => void;
  onEndDateTimeChange: (value: string) => void;
  onTotalAmountChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  editingBooking,
  editCustomerName,
  editStartDateTime,
  editEndDateTime,
  editTotalAmount,
  submittingEdit,
  editError,
  vehicleId,
  formatCurrency,
  getBookingDurationLabel,
  onClose,
  onCustomerNameChange,
  onStartDateTimeChange,
  onEndDateTimeChange,
  onTotalAmountChange,
  onSubmit,
}) => {
  if (!editingBooking) return null;

  const effectiveVehicleId =
    vehicleId ||
    (typeof editingBooking?.vehicleId === "string"
      ? editingBooking.vehicleId
      : editingBooking?.vehicleId?._id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-booking-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-[#161628] border border-indigo-500/30 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 id="edit-booking-title" className="text-sm font-bold text-white">
                Edit Booking
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                #{editingBooking._id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Message */}
        {editError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <p className="flex-1">{editError}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3.5">
          {/* Customer Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-slate-400">
                Customer Name
              </label>
              <span className="text-[10px] text-slate-500">
                Type name or select dealer
              </span>
            </div>
            <DealerComboboxInput
              value={editCustomerName}
              onChange={onCustomerNameChange}
              vehicleId={effectiveVehicleId}
              placeholder="Enter customer name or pick dealer"
              required
              inputClassName="w-full bg-[#101020] border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/80 transition-all shadow-inner"
            />
          </div>

          {/* Start Date & Time */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Start Date & Time
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="datetime-local"
                required
                value={editStartDateTime}
                onChange={(e) => onStartDateTimeChange(e.target.value)}
                className="w-full bg-[#101020] border border-white/10 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/80 transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              End Date & Time
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="datetime-local"
                required
                value={editEndDateTime}
                onChange={(e) => onEndDateTimeChange(e.target.value)}
                className="w-full bg-[#101020] border border-white/10 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/80 transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Duration Preview Chip */}
          {editStartDateTime && editEndDateTime && (
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Updated Duration:
              </span>
              <span className="font-semibold text-indigo-300">
                {getBookingDurationLabel(editStartDateTime, editEndDateTime) || "Invalid duration"}
              </span>
            </div>
          )}

          {/* Total Rental Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-400">
                Total Rental Amount (₹)
              </label>
              {editingBooking.paidAmount > 0 && (
                <span className="text-[10px] font-bold text-emerald-400">
                  Paid so far: {formatCurrency(editingBooking.paidAmount)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                min={editingBooking.paidAmount}
                required
                value={editTotalAmount}
                onChange={(e) => onTotalAmountChange(e.target.value)}
                placeholder="0"
                className="w-full bg-[#101020] border border-white/10 rounded-2xl pl-8 pr-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500/80 transition-all shadow-inner"
              />
            </div>
            {Number(editTotalAmount) >= editingBooking.paidAmount && (
              <div className="mt-1.5 flex justify-between text-[11px] text-slate-400 px-1">
                <span>Resulting Balance:</span>
                <span
                  className={`font-bold ${
                    Number(editTotalAmount) - editingBooking.paidAmount === 0
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {Number(editTotalAmount) - editingBooking.paidAmount === 0
                    ? "Fully Settled ✓"
                    : formatCurrency(Number(editTotalAmount) - editingBooking.paidAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingEdit}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {submittingEdit ? "Saving..." : "Update Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
