"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Lock,
  Unlock,
  X,
  CalendarDays,
  Clock,
  CalendarX2,
  UserCheck,
  Loader2,
  ChevronRight,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { VehicleLock } from "@/types";

interface VehicleLockSectionProps {
  vehicleId: string;
  selectedLock: VehicleLock | null;
  selectedDate: Date | null;
  hasSelectedBookings: boolean;
  showLockForm: boolean;
  lockStartDateTime: string;
  lockEndDateTime: string;
  lockReason: string;
  lockSubmitting: boolean;
  deletingLock: boolean;
  lockError: string;
  onClearSelections: () => void;
  onShowLockForm: () => void;
  onHideLockForm: () => void;
  onLockStartChange: (val: string) => void;
  onLockEndChange: (val: string) => void;
  onLockReasonChange: (val: string) => void;
  onLockSubmit: (e: React.FormEvent) => void;
  onDeleteLock: () => void;
  formatDateNice: (d: Date) => string;
  formatDateTimeShortYear: (s: string | Date) => string;
  getBookingDurationLabel: (s: string | Date, e: string | Date) => string;
  getLocalTodayDateString: (d?: Date) => string;
}

export const VehicleLockSection: React.FC<VehicleLockSectionProps> = ({
  vehicleId,
  selectedLock,
  selectedDate,
  hasSelectedBookings,
  showLockForm,
  lockStartDateTime,
  lockEndDateTime,
  lockReason,
  lockSubmitting,
  deletingLock,
  lockError,
  onClearSelections,
  onShowLockForm,
  onHideLockForm,
  onLockStartChange,
  onLockEndChange,
  onLockReasonChange,
  onLockSubmit,
  onDeleteLock,
  formatDateNice,
  formatDateTimeShortYear,
  getBookingDurationLabel,
  getLocalTodayDateString,
}) => {
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [prevLockId, setPrevLockId] = useState(selectedLock?._id);

  if (selectedLock?._id !== prevLockId) {
    setPrevLockId(selectedLock?._id);
    setConfirmRelease(false);
  }

  // 1. Locked Date Details Card
  if (selectedLock) {
    return (
      <div className="mx-5 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="bg-gradient-to-br from-amber-500/8 to-amber-600/5 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-xs font-bold text-white">Vehicle Locked</span>
            </div>
            <button
              onClick={() => {
                setConfirmRelease(false);
                onClearSelections();
              }}
              className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close lock details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-start">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />Starting
              </span>
              <span className="text-amber-200 font-semibold text-right">
                {formatDateTimeShortYear(selectedLock.startDate)}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />Ending
              </span>
              <span className="text-amber-200 font-semibold text-right">
                {formatDateTimeShortYear(selectedLock.endDate)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />Duration
              </span>
              <span className="text-slate-200 font-medium">
                {getBookingDurationLabel(selectedLock.startDate, selectedLock.endDate)}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CalendarX2 className="w-3.5 h-3.5 text-slate-500" />Reason
              </span>
              <span className="text-slate-200 font-medium text-right max-w-[60%]">{selectedLock.reason}</span>
            </div>
            {selectedLock.lockedBy && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />Locked By
                </span>
                <span className="font-medium text-slate-300">{selectedLock.lockedBy.username}</span>
              </div>
            )}

            {lockError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5 animate-in fade-in duration-150">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{lockError}</span>
              </div>
            )}

            {/* Release Lock action with confirmation */}
            <div className="pt-2 mt-1 border-t border-white/5">
              {!confirmRelease ? (
                <button
                  onClick={() => setConfirmRelease(true)}
                  disabled={deletingLock}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 hover:text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Release Lock</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Release this lock and free the vehicle dates?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmRelease(false)}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onDeleteLock}
                      disabled={deletingLock}
                      className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {deletingLock ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                      <span>{deletingLock ? "Releasing…" : "Confirm Release"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Free Date Action Card
  if (selectedDate && !hasSelectedBookings && !selectedLock) {
    return (
      <div className="mx-5 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="bg-gradient-to-br from-indigo-500/8 to-indigo-600/5 border border-indigo-500/25 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-white">Available Date</span>
                <p className="text-[10px] text-slate-400">{formatDateNice(selectedDate)}</p>
              </div>
            </div>
            <button
              onClick={onClearSelections}
              className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close action card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {!showLockForm ? (
            /* ── Two Action Buttons ── */
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={onShowLockForm}
                className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 hover:text-white text-xs font-bold transition-all active:scale-95 group cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lock Vehicle</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-amber-400" />
              </button>

              <Link
                href={`/vehicles/${vehicleId}/book?date=${getLocalTodayDateString(selectedDate)}`}
                className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-bold transition-all active:scale-95 group cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Record Booking from this Day</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-indigo-400" />
              </Link>
            </div>
          ) : (
            /* ── Lock Form ── */
            <div className="bg-[#12121f]/80 border border-amber-500/20 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Lock Vehicle Schedule
                </div>
                <button
                  type="button"
                  onClick={onHideLockForm}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={onLockSubmit} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      Starting Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={lockStartDateTime}
                      onChange={(e) => onLockStartChange(e.target.value)}
                      className="w-full bg-[#101020] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60 transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      Ending Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={lockEndDateTime}
                      min={lockStartDateTime}
                      onChange={(e) => onLockEndChange(e.target.value)}
                      className="w-full bg-[#101020] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60 transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Reason</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maintenance, Personal use, Servicing…"
                    value={lockReason}
                    onChange={(e) => onLockReasonChange(e.target.value)}
                    className="w-full bg-[#101020] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all"
                  />
                </div>

                {lockError && (
                  <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1.5">
                    {lockError}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onHideLockForm}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={lockSubmitting}
                    className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {lockSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Locking…</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Confirm Lock</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
