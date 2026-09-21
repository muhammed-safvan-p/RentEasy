"use client";

import React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Calendar as CalendarIcon } from "lucide-react";

interface VehicleCalendarViewProps {
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  bookedDays: Date[];
  lockedDays: Date[];
  selectedBookingDays: Date[];
  onDayClick: (day: Date) => void;
  calendarLoading: boolean;
}

export const VehicleCalendarView: React.FC<VehicleCalendarViewProps> = ({
  currentMonth,
  onMonthChange,
  bookedDays,
  lockedDays,
  selectedBookingDays,
  onDayClick,
  calendarLoading,
}) => {
  return (
    <div className="relative">
      {/* Section Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-0 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">Booking Calendar</h2>
            <p className="text-[11px] text-slate-500 mt-px">Tap a date to view details or take action</p>
          </div>
        </div>
        {calendarLoading && (
          <span className="text-[11px] text-indigo-400 animate-pulse font-medium">Updating&hellip;</span>
        )}
      </div>

      {/* Calendar */}
      <div className="px-3 pt-3 pb-1 relative z-10">
        <DayPicker
          className="renteasy-calendar"
          month={currentMonth}
          onMonthChange={onMonthChange}
          modifiers={{ booked: bookedDays, locked: lockedDays, selectedBooking: selectedBookingDays }}
          modifiersClassNames={{ booked: "rdp-booked", locked: "rdp-locked", selectedBooking: "rdp-selected-booking" }}
          onDayClick={onDayClick}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 pb-4 text-[11px] text-slate-500 relative z-10 flex-wrap px-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/25 border border-rose-400/50" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/25 border border-amber-400/50" />
          <span>Locked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border border-indigo-400 bg-indigo-500/10" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-700" />
          <span>Available</span>
        </div>
      </div>
    </div>
  );
};
