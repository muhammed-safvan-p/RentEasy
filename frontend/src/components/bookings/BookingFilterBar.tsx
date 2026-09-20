"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar, Car, TrendingUp, CreditCard, AlertTriangle } from "lucide-react";
import { FilterKey } from "@/types/booking";

interface BookingFilterBarProps {
  selectedMonth: Date;
  isCurrentMonth: boolean;
  activeFilter: FilterKey;
  totalBookingsCount: number;
  monthMetrics: {
    totalCount: number;
    totalRevenue: number;
    totalCredited: number;
    totalDue: number;
  };
  formatCurrency: (amount: number) => string;
  formatMonthDisplay: (date: Date) => string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onResetToCurrentMonth: () => void;
  onFilterChange: (filter: FilterKey) => void;
}

export const BookingFilterBar: React.FC<BookingFilterBarProps> = ({
  selectedMonth,
  isCurrentMonth,
  activeFilter,
  totalBookingsCount,
  monthMetrics,
  formatCurrency,
  formatMonthDisplay,
  onPrevMonth,
  onNextMonth,
  onResetToCurrentMonth,
  onFilterChange,
}) => {
  return (
    <>
      {/* 1. Monthly Navigator */}
      <div className="bg-[#17172a] border border-white/10 rounded-2xl p-2 mb-3.5 flex items-center justify-between shadow-lg relative">
        <button
          onClick={onPrevMonth}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
          aria-label="Previous Month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-white tracking-wide">
            {formatMonthDisplay(selectedMonth)}
          </span>
          {!isCurrentMonth && (
            <button
              onClick={onResetToCurrentMonth}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
            >
              This Month
            </button>
          )}
        </div>

        <button
          onClick={onNextMonth}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
          aria-label="Next Month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Monthly Financial Metrics Strip (4 Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {/* Total Bookings */}
        <div className="bg-[#17172a] border border-white/10 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Car className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Bookings</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-white">
            {monthMetrics.totalCount}
          </p>
        </div>

        {/* Total Revenue (Gross Booking Total) */}
        <div className="bg-[#17172a] border border-white/10 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center gap-1.5 text-indigo-400 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Revenue</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-white truncate">
            {formatCurrency(monthMetrics.totalRevenue)}
          </p>
        </div>

        {/* Total Credited (Paid / Collected) */}
        <div className="bg-[#17172a] border border-white/10 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1">
            <CreditCard className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Credited</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold text-emerald-400 truncate">
            {formatCurrency(monthMetrics.totalCredited)}
          </p>
        </div>

        {/* Pending Due (Revenue - Credited) */}
        <div
          className={`rounded-2xl p-2.5 sm:p-3 border flex flex-col justify-between shadow-md ${
            monthMetrics.totalDue > 0
              ? "bg-amber-500/10 border-amber-500/25"
              : "bg-[#17172a] border-white/10"
          }`}
        >
          <div className="flex items-center gap-1.5 text-amber-400 text-xs mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Due</span>
          </div>
          <p
            className={`text-sm sm:text-base font-extrabold truncate ${
              monthMetrics.totalDue > 0 ? "text-amber-400" : "text-slate-400"
            }`}
          >
            {formatCurrency(monthMetrics.totalDue)}
          </p>
        </div>
      </div>

      {/* 3. Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2 text-xs font-semibold">
        {[
          { key: "all" as FilterKey, label: `All (${totalBookingsCount})` },
          { key: "active" as FilterKey, label: "Active" },
          { key: "due" as FilterKey, label: "Pending Due" },
          { key: "upcoming" as FilterKey, label: "Upcoming" },
          { key: "completed" as FilterKey, label: "Completed" },
          { key: "cancelled" as FilterKey, label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border ${
              activeFilter === tab.key
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                : "bg-[#17172a] text-slate-400 border-white/5 hover:text-white hover:border-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </>
  );
};
