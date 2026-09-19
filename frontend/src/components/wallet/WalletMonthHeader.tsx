"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, Scale, Plus } from "lucide-react";

interface WalletMonthHeaderProps {
  selectedMonth: Date;
  isCurrentMonth: boolean;
  monthIncome: number;
  monthExpense: number;
  formatCurrency: (amount: number) => string;
  formatMonthDisplay: (date: Date) => string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenAddModal: () => void;
}

export const WalletMonthHeader: React.FC<WalletMonthHeaderProps> = ({
  selectedMonth,
  isCurrentMonth,
  monthIncome,
  monthExpense,
  formatCurrency,
  formatMonthDisplay,
  onPrevMonth,
  onNextMonth,
  onOpenAddModal,
}) => {
  const netFlow = monthIncome - monthExpense;

  return (
    <>
      {/* 1. Month Navigator & Add Button */}
      <div className="flex items-center justify-between bg-[#1a1a2e] border border-white/10 rounded-2xl px-3 py-2.5 mb-4 shadow-lg">
        <button
          onClick={onPrevMonth}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors active:scale-95"
          aria-label="Previous Month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-white font-bold text-sm tracking-wide">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>{formatMonthDisplay(selectedMonth)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onNextMonth}
            disabled={isCurrentMonth}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              isCurrentMonth
                ? "opacity-30 cursor-not-allowed text-slate-600 bg-white/5"
                : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white active:scale-95"
            }`}
            aria-label="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Month Summary: Income, Expense, Net Flow */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">Income</span>
          </div>
          <p className="text-sm sm:text-base font-black text-emerald-400 truncate">
            +{formatCurrency(monthIncome)}
          </p>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-1.5 text-rose-400 text-xs mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">Expense</span>
          </div>
          <p className="text-sm sm:text-base font-black text-rose-400 truncate">
            -{formatCurrency(monthExpense)}
          </p>
        </div>

        <div
          className={`rounded-2xl p-3 border flex flex-col justify-between shadow-sm ${
            netFlow >= 0
              ? "bg-indigo-500/10 border-indigo-500/20"
              : "bg-amber-500/10 border-amber-500/20"
          }`}
        >
          <div
            className={`flex items-center gap-1.5 text-xs mb-1 ${
              netFlow >= 0 ? "text-indigo-400" : "text-amber-400"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">Balance</span>
          </div>
          <p
            className={`text-sm sm:text-base font-black truncate ${
              netFlow >= 0 ? "text-indigo-300" : "text-amber-400"
            }`}
          >
            {netFlow >= 0 ? "+" : ""}
            {formatCurrency(netFlow)}
          </p>
        </div>
      </div>
    </>
  );
};
