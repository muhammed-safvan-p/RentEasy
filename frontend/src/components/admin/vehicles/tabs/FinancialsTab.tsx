"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Wallet,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { WalletData, WalletTransaction } from "@/types";
import { formatCurrency, formatDateTimeNice, formatMonthDisplay } from "@/lib/formatters";

interface FinancialsTabProps {
  wallet: WalletData | null;
  transactions: WalletTransaction[];
  selectedMonth: Date | null;
  onAllTime: () => void;
}

export default function FinancialsTab({
  wallet,
  transactions,
  selectedMonth,
  onAllTime,
}: FinancialsTabProps) {
  const [txFilter, setTxFilter] = useState<string>("all");
  const [txSearch, setTxSearch] = useState("");
  const [txFromDate, setTxFromDate] = useState("");
  const [txToDate, setTxToDate] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(20);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.transactionDate || tx.createdAt);

      // 1. Month filter (if selected)
      if (selectedMonth) {
        const inMonth =
          txDate.getFullYear() === selectedMonth.getFullYear() &&
          txDate.getMonth() === selectedMonth.getMonth();
        if (!inMonth) return false;
      }

      // 2. Specific Date Range (From - To)
      if (txFromDate) {
        const fromTime = new Date(txFromDate).setHours(0, 0, 0, 0);
        if (txDate.getTime() < fromTime) return false;
      }
      if (txToDate) {
        const toTime = new Date(txToDate).setHours(23, 59, 59, 999);
        if (txDate.getTime() > toTime) return false;
      }

      // 3. Search query
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const matches =
          (tx.note && tx.note.toLowerCase().includes(q)) ||
          (tx.source && tx.source.toLowerCase().includes(q)) ||
          tx._id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 4. Method / Type Filter
      if (txFilter === "all") return true;
      if (txFilter === "income") return tx.type === "income";
      if (txFilter === "expense") return tx.type === "expense";
      if (txFilter === "cash") return tx.paymentMethod === "cash";
      if (txFilter === "bank") return tx.paymentMethod === "bank";
      return true;
    });
  }, [transactions, selectedMonth, txFromDate, txToDate, txSearch, txFilter]);

  // Wallet Metrics
  const walletMetrics = useMemo(() => {
    const txCount = filteredTransactions.length;
    const totalIncome = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalExpense = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const netCashflow = totalIncome - totalExpense;

    return {
      txCount,
      totalIncome,
      totalExpense,
      netCashflow,
    };
  }, [filteredTransactions]);

  // Transactions Pagination
  const txTotalPages = Math.ceil(filteredTransactions.length / txPageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return filteredTransactions.slice(start, start + txPageSize);
  }, [filteredTransactions, txPage, txPageSize]);

  return (
    <div className="space-y-6">
      {/* Wallet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-indigo-800">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">Total Net Balance</p>
          <h3 className="text-3xl font-black mt-2">{formatCurrency(wallet?.totalBalance ?? 0)}</h3>
          <p className="text-xs text-indigo-300 mt-2">Combined physical cash and bank funds</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cash In Hand</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              Cash
            </span>
          </div>
          <h3 className="text-3xl font-black text-emerald-600">{formatCurrency(wallet?.cashBalance ?? 0)}</h3>
          <p className="text-xs text-slate-400 mt-2">Liquid physical cash balance</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bank Account</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
              Bank Transfer
            </span>
          </div>
          <h3 className="text-3xl font-black text-blue-600">{formatCurrency(wallet?.bankBalance ?? 0)}</h3>
          <p className="text-xs text-slate-400 mt-2">Digital bank transfer balance</p>
        </div>
      </div>

      {/* Transactions Ledger Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header & Controls */}
        <div className="space-y-4 border-b border-slate-100 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Wallet Financial Ledger</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Month-wise and date-wise audit log of all income and expense transactions
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search notes or source..."
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(1);
                }}
                className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
              />
            </div>
          </div>

          {/* Date & Type Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {/* Date Range */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range:</span>
              <input
                type="date"
                value={txFromDate}
                onChange={(e) => {
                  setTxFromDate(e.target.value);
                  setTxPage(1);
                }}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                title="From Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={txToDate}
                onChange={(e) => {
                  setTxToDate(e.target.value);
                  setTxPage(1);
                }}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                title="To Date"
              />
              {(txFromDate || txToDate) && (
                <button
                  onClick={() => {
                    setTxFromDate("");
                    setTxToDate("");
                    setTxPage(1);
                  }}
                  className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold cursor-pointer"
                >
                  Clear Dates
                </button>
              )}
            </div>

            {/* Method / Type Filters */}
            <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl">
              {["all", "income", "expense", "cash", "bank"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setTxFilter(filter);
                    setTxPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    txFilter === filter
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filtered Financial Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Filtered Transactions</p>
            <p className="text-lg font-black text-slate-900">{walletMetrics.txCount} Records</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total Inflow</p>
            <p className="text-lg font-black text-emerald-600">+{formatCurrency(walletMetrics.totalIncome)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total Outflow</p>
            <p className="text-lg font-black text-rose-600">-{formatCurrency(walletMetrics.totalExpense)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Period Net Flow</p>
            <p
              className={`text-lg font-black ${
                walletMetrics.netCashflow >= 0 ? "text-slate-900" : "text-rose-600"
              }`}
            >
              {formatCurrency(walletMetrics.netCashflow)}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        {paginatedTransactions.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Description / Note</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {formatDateTimeNice(tx.transactionDate || tx.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{tx.note || "No note"}</p>
                        <p className="font-mono text-[10px] text-slate-400">ID: {tx._id.slice(0, 8)}...</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                          {tx.source || "manual"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase ${
                            tx.paymentMethod === "cash"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-black text-sm ${
                          tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Wallet Pagination Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Show</span>
                <select
                  value={txPageSize}
                  onChange={(e) => {
                    setTxPageSize(Number(e.target.value));
                    setTxPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
                <span>
                  Showing {Math.min((txPage - 1) * txPageSize + 1, filteredTransactions.length)} to{" "}
                  {Math.min(txPage * txPageSize, filteredTransactions.length)} of {filteredTransactions.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTxPage(1)}
                  disabled={txPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                  disabled={txPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 text-xs font-bold text-slate-700">
                  Page {txPage} of {txTotalPages}
                </span>

                <button
                  onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                  disabled={txPage >= txTotalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTxPage(txTotalPages)}
                  disabled={txPage >= txTotalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No transactions recorded for the selected filter.</p>
            <p className="text-xs text-slate-400 mt-1">
              {selectedMonth
                ? `No transactions recorded in ${formatMonthDisplay(selectedMonth)}. Click "All Months (Full History)" above to view all records.`
                : "Try adjusting the date range or search filters."}
            </p>
            {selectedMonth && (
              <button
                onClick={onAllTime}
                className="mt-3 px-4 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors inline-block cursor-pointer"
              >
                Show All Months (Full History)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
