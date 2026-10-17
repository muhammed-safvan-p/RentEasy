"use client";

import React from "react";
import { Plus, Lock, Unlock, Trash2, Loader2 } from "lucide-react";
import { VehicleLock } from "@/types";
import { formatDateNice, formatDateTimeNice } from "@/lib/formatters";

interface LocksTabProps {
  locks: VehicleLock[];
  onAddLock: () => void;
  onDeleteLock: (lockId: string) => void;
  deletingLockId: string | null;
}

export default function LocksTab({
  locks,
  onAddLock,
  onDeleteLock,
  deletingLockId,
}: LocksTabProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Vehicle Maintenance & Locks</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Block off vehicle availability for repairs, personal use, or dealer holds
          </p>
        </div>

        <button
          type="button"
          onClick={onAddLock}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Maintenance Lock
        </button>
      </div>

      {locks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locks.map((lock) => (
            <div
              key={lock._id}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{lock.reason}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDateTimeNice(lock.startDate)} → {formatDateTimeNice(lock.endDate)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteLock(lock._id)}
                  disabled={deletingLockId === lock._id}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  title="Release Lock"
                >
                  {deletingLockId === lock._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Created: {formatDateNice(lock.createdAt)}</span>
                <span>Lock ID: {lock._id.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
          <Unlock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No active maintenance locks.</p>
          <p className="text-xs text-slate-400 mt-1">
            Vehicle is not blocked for maintenance or personal holds.
          </p>
        </div>
      )}
    </div>
  );
}
