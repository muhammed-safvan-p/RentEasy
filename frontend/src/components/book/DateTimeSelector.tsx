"use client";

import React from "react";
import { Calendar as CalendarIcon, Clock, ShieldCheck } from "lucide-react";

interface DurationInfo {
  isValid: boolean;
  diffMs: number;
  totalHours: number;
  days: number;
  remainingHours: number;
  label: string;
}

interface DateTimeSelectorProps {
  startDateTime: string;
  endDateTime: string;
  durationInfo: DurationInfo | null;
  hasConflict: boolean;
  onStartDateTimeChange: (val: string) => void;
  onEndDateTimeChange: (val: string) => void;
  onApplyPreset: (daysToAdd: number) => void;
  onApplyWeekendPreset: () => void;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  startDateTime,
  endDateTime,
  durationInfo,
  hasConflict,
  onStartDateTimeChange,
  onEndDateTimeChange,
  onApplyPreset,
  onApplyWeekendPreset,
}) => {
  return (
    <section className="bg-[#17172a] border border-white/10 rounded-3xl p-4 shadow-lg space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <CalendarIcon className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Rental Schedule
          </span>
        </div>

        {/* Quick Duration Preset Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => onApplyPreset(1)}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5 transition-all"
          >
            +1d
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset(2)}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5 transition-all"
          >
            +2d
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset(3)}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5 transition-all"
          >
            +3d
          </button>
          <button
            type="button"
            onClick={onApplyWeekendPreset}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400 border border-white/5 transition-all"
          >
            Weekend
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Start Date & Time */}
        <div>
          <label
            htmlFor="startDateTime"
            className="block text-[11px] font-medium text-slate-400 mb-1.5"
          >
            Start Date & Time
          </label>
          <input
            id="startDateTime"
            type="datetime-local"
            required
            value={startDateTime}
            onChange={(e) => onStartDateTimeChange(e.target.value)}
            className="w-full bg-[#101020] border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner [color-scheme:dark]"
          />
        </div>

        {/* End Date & Time */}
        <div>
          <label
            htmlFor="endDateTime"
            className="block text-[11px] font-medium text-slate-400 mb-1.5"
          >
            End Date & Time
          </label>
          <input
            id="endDateTime"
            type="datetime-local"
            required
            value={endDateTime}
            onChange={(e) => onEndDateTimeChange(e.target.value)}
            className="w-full bg-[#101020] border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Duration Indicator */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Calculated Duration:</span>
          <span className="font-bold text-indigo-300">
            {durationInfo?.isValid ? durationInfo.label : "Invalid"}
          </span>
        </div>

        {!hasConflict && durationInfo?.isValid && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3" />
            <span>Available</span>
          </div>
        )}
      </div>
    </section>
  );
};
