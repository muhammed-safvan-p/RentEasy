"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { CalendarBooking } from "@/types/booking";

interface ConflictAlertProps {
  conflictingBooking: CalendarBooking | null | undefined;
  formatDateNice: (dateStr: string) => string;
}

export const ConflictAlert: React.FC<ConflictAlertProps> = ({
  conflictingBooking,
  formatDateNice,
}) => {
  if (!conflictingBooking) return null;

  return (
    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
      <div className="flex-1">
        <p className="font-bold text-rose-200">Schedule Conflict Detected!</p>
        <p className="text-[11px] text-rose-300/90 mt-0.5 leading-relaxed">
          Already booked for{" "}
          <span className="font-semibold text-white">
            {conflictingBooking.customerName}
          </span>{" "}
          from {formatDateNice(conflictingBooking.startDateTime)} to{" "}
          {formatDateNice(conflictingBooking.endDateTime)}.
        </p>
      </div>
    </div>
  );
};
