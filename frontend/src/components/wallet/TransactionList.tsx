"use client";

import React from "react";
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  Calendar,
  Receipt,
  User,
  UserCheck,
} from "lucide-react";
import { DateGroupedTransactions, WalletTransaction } from "@/types/wallet";

interface TransactionListProps {
  filter: "all" | "income" | "expense";
  transactions: WalletTransaction[];
  groupedTransactions: DateGroupedTransactions[];
  txLoading: boolean;
  selectedMonth: Date;
  formatCurrency: (amount: number) => string;
  formatDateNice: (dateStr: string) => string;
  formatMonthDisplay: (date: Date) => string;
  onFilterChange: (filter: "all" | "income" | "expense") => void;
  onSelectTx: (tx: WalletTransaction) => void;
  onOpenAddModal: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  filter,
  transactions,
  groupedTransactions,
  txLoading,
  selectedMonth,
  formatCurrency,
  formatDateNice,
  formatMonthDisplay,
  onFilterChange,
  onSelectTx,
  onOpenAddModal,
}) => {
  return (
    <>
      {/* Filter Tabs & Add Entry Button */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center p-1 bg-[#1a1a2e] border border-white/10 rounded-2xl text-xs font-semibold shadow-md">
          <button
            onClick={() => onFilterChange("all")}
            className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
              filter === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filter === "all" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
              }`}
            >
              {transactions.length}
            </span>
          </button>
          <button
            onClick={() => onFilterChange("income")}
            className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
              filter === "income"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Income</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filter === "income" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
              }`}
            >
              {transactions.filter((t) => t.type === "income").length}
            </span>
          </button>
          <button
            onClick={() => onFilterChange("expense")}
            className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
              filter === "expense"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Expense</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filter === "expense" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
              }`}
            >
              {transactions.filter((t) => t.type === "expense").length}
            </span>
          </button>
        </div>

        <button
          onClick={onOpenAddModal}
          className="p-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 active:scale-95 transition-transform shrink-0"
          aria-label="Add Transaction"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Entry</span>
        </button>
      </div>

      {/* Grouped Transaction List */}
      <div className="flex-1 space-y-5">
        {txLoading ? (
          <div className="space-y-3 py-2">
            <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
            <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
            <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
          </div>
        ) : groupedTransactions.length === 0 ? (
          <div className="bg-[#1a1a2e]/60 border border-white/5 rounded-3xl p-8 text-center my-6 flex flex-col items-center justify-center shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white mb-1">
              {filter === "all"
                ? `No transactions in ${formatMonthDisplay(selectedMonth)}`
                : `No ${filter} transactions in ${formatMonthDisplay(selectedMonth)}`}
            </p>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              {filter === "all"
                ? "No financial activity recorded yet for this month."
                : `There are no ${filter} records found for this period.`}
            </p>
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Transaction
            </button>
          </div>
        ) : (
          groupedTransactions.map((group) => (
            <div key={group.dateKey} className="space-y-2.5">
              {/* Date Section Header */}
              <div className="flex items-center px-1 text-xs">
                <span className="font-semibold text-slate-400 tracking-wide flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/70"></span>
                  {group.dateLabel}
                </span>
              </div>

              {/* Transactions in this date group */}
              <div className="space-y-2">
                {group.transactions.map((tx) => {
                  const isIncome = tx.type === "income";
                  const bookingObj = typeof tx.bookingId === "object" ? tx.bookingId : null;
                  let displayNote = tx.note;
                  if (!displayNote) {
                    displayNote = isIncome ? "Unspecified Income" : "Unspecified Expense";
                  } else if (bookingObj?.customerName) {
                    if (displayNote.startsWith("Payment for booking")) {
                      displayNote = `Booking payment • ${bookingObj.customerName}`;
                    } else if (displayNote.startsWith("Refund for cancelled booking")) {
                      displayNote = `Refund • ${bookingObj.customerName}`;
                    }
                  }

                  return (
                    <div
                      key={tx._id}
                      onClick={() => onSelectTx(tx)}
                      className="bg-[#1a1a2e] hover:bg-[#202038] cursor-pointer rounded-2xl p-3.5 border border-white/5 hover:border-white/15 transition-all active:scale-[0.99] flex items-center justify-between gap-3 shadow-md group"
                    >
                      {/* Left: Direction Icon */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                            isIncome
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>

                        {/* Title, Subtitle, Tags */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate group-hover:text-indigo-200 transition-colors">
                            {displayNote}
                          </p>

                          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-1">
                            {/* Payment Method Badge */}
                            <span className="inline-flex items-center gap-1 font-medium text-slate-300">
                              {tx.paymentMethod === "cash" ? (
                                <>
                                  <Banknote className="w-3 h-3 text-emerald-400" />
                                  Cash
                                </>
                              ) : (
                                <>
                                  <Building2 className="w-3 h-3 text-indigo-400" />
                                  Bank
                                </>
                              )}
                            </span>

                            {/* Origin Source Badge */}
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-md bg-white/5 text-slate-400 border border-white/5">
                              {tx.source === "booking" ? (
                                <>
                                  <Receipt className="w-2.5 h-2.5 text-indigo-400" />
                                  Booking
                                </>
                              ) : (
                                <>
                                  <User className="w-2.5 h-2.5 text-slate-400" />
                                  Manual
                                </>
                              )}
                            </span>

                            {/* Recorded By Badge */}
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-md bg-white/5 text-slate-400 border border-white/5">
                              <UserCheck className="w-2.5 h-2.5 text-indigo-400" />
                              <span>
                                Recorded by {tx.createdBy?.username || "Owner"}
                              </span>
                            </span>

                            {/* Formatted Date */}
                            <span className="text-[10px] text-slate-500">
                              {formatDateNice(tx.transactionDate || tx.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount */}
                      <div className="text-right shrink-0">
                        <span
                          className={`text-base font-extrabold tracking-tight ${
                            isIncome ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};
