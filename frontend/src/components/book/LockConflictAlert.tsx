"use client";

import React from "react";
import { Lock } from "lucide-react";
import { VehicleLock } from "@/types";

interface LockConflictAlertProps {
  conflictingLock: VehicleLock | null | undefined;
  formatDateNice: (dateStr: string) => string;
}

export const LockConflictAlert: React.FC<LockConflictAlertProps> = ({
  conflictingLock,
  formatDateNice,
}) => {
  if (!conflictingLock) return null;

  return (
    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
      <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
      <div className="flex-1">
        <p className="font-bold text-amber-200">Vehicle Locked for Selected Dates!</p>
        <p className="text-[11px] text-amber-300/90 mt-0.5 leading-relaxed">
          Locked for <span className="font-semibold text-white">&quot;{conflictingLock.reason}&quot;</span> from{" "}
          {formatDateNice(conflictingLock.startDate)} to {formatDateNice(conflictingLock.endDate)}.
        </p>
      </div>
    </div>
  );
};
