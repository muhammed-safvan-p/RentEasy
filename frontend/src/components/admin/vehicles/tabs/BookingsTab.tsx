"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CalendarX2,
} from "lucide-react";
import { Booking } from "@/types";
import {
  formatCurrency,
  formatDateTimeNice,
  formatMonthDisplay,
  getBookingDurationLabel,
  getBookingStatus,
} from "@/lib/formatters";

interface BookingsTabProps {
  bookings: Booking[];
  selectedMonth: Date | null;
  onAllTime: () => void;
}

export default function BookingsTab({
  bookings,
  selectedMonth,
  onAllTime,
}: BookingsTabProps) {
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingFromDate, setBookingFromDate] = useState("");
  const [bookingToDate, setBookingToDate] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPageSize, setBookingPageSize] = useState(20);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Month filter (if selected)
      if (selectedMonth) {
        const bStart = new Date(b.startDateTime);
        const bEnd = new Date(b.endDateTime || b.startDateTime);
        const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1, 0, 0, 0, 0);
        const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
        const overlaps = bStart <= monthEnd && bEnd >= monthStart;
        if (!overlaps) return false;
      }

      // 2. Specific Date Range (From - To)
      if (bookingFromDate) {
        const fromTime = new Date(bookingFromDate).setHours(0, 0, 0, 0);
        const bEndTime = new Date(b.endDateTime || b.startDateTime).getTime();
        if (bEndTime < fromTime) return false;
      }
      if (bookingToDate) {
        const toTime = new Date(bookingToDate).setHours(23, 59, 59, 999);
        const bStartTime = new Date(b.startDateTime).getTime();
        if (bStartTime > toTime) return false;
      }

      // 3. Search query
      if (bookingSearch.trim()) {
        const q = bookingSearch.toLowerCase();
        const matches =
          b.customerName.toLowerCase().includes(q) ||
          b._id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 4. Status Filter
      const status = getBookingStatus(b);
      if (bookingFilter === "all") return true;
      if (bookingFilter === "active") return status === "active";
      if (bookingFilter === "upcoming") return status === "upcoming";
      if (bookingFilter === "completed") return status === "completed";
      if (bookingFilter === "cancelled") return b.isCancelled;
      if (bookingFilter === "balance") return !b.isCancelled && b.balanceAmount > 0;
      return true;
    });
  }, [bookings, selectedMonth, bookingFromDate, bookingToDate, bookingSearch, bookingFilter]);

  // Bookings Metrics (Month-wise & Filter-wise)
  const bookingMetrics = useMemo(() => {
    const totalCount = filteredBookings.length;
    const activeCount = filteredBookings.filter((b) => getBookingStatus(b) === "active").length;
    const upcomingCount = filteredBookings.filter((b) => getBookingStatus(b) === "upcoming").length;
    const completedCount = filteredBookings.filter((b) => getBookingStatus(b) === "completed").length;
    const cancelledCount = filteredBookings.filter((b) => b.isCancelled).length;
    const totalValue = filteredBookings
      .filter((b) => !b.isCancelled)
      .reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const totalCollected = filteredBookings
      .filter((b) => !b.isCancelled)
      .reduce((acc, b) => acc + (b.paidAmount || 0), 0);
    const totalPending = filteredBookings
      .filter((b) => !b.isCancelled)
      .reduce((acc, b) => acc + (b.balanceAmount || 0), 0);

    return {
      totalCount,
      activeCount,
      upcomingCount,
      completedCount,
      cancelledCount,
      totalValue,
      totalCollected,
      totalPending,
    };
  }, [filteredBookings]);

  // Bookings Pagination
  const bookingTotalPages = Math.ceil(filteredBookings.length / bookingPageSize) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (bookingPage - 1) * bookingPageSize;
    return filteredBookings.slice(start, start + bookingPageSize);
  }, [filteredBookings, bookingPage, bookingPageSize]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header & Controls */}
      <div className="space-y-4 border-b border-slate-100 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Vehicle Booking History</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {selectedMonth ? formatMonthDisplay(selectedMonth) : "Full History"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete lifetime reservation logs with date range and status filters
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer name or ID..."
              value={bookingSearch}
              onChange={(e) => {
                setBookingSearch(e.target.value);
                setBookingPage(1);
              }}
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            />
          </div>
        </div>

        {/* Quick Month Bar + Date Range + Status Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Date Range Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range:</span>
            <input
              type="date"
              value={bookingFromDate}
              onChange={(e) => {
                setBookingFromDate(e.target.value);
                setBookingPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
              title="From Date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={bookingToDate}
              onChange={(e) => {
                setBookingToDate(e.target.value);
                setBookingPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
              title="To Date"
            />
            {(bookingFromDate || bookingToDate) && (
              <button
                onClick={() => {
                  setBookingFromDate("");
                  setBookingToDate("");
                  setBookingPage(1);
                }}
                className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl">
            {["all", "active", "upcoming", "completed", "cancelled", "balance"].map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setBookingFilter(filter);
                  setBookingPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  bookingFilter === filter
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {filter === "balance" ? "Pending Due" : filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Month / Filter-wise Financial Strip for Bookings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase">Filtered Count</p>
          <p className="text-lg font-black text-slate-900">{bookingMetrics.totalCount} Trips</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Trip Value</p>
          <p className="text-lg font-black text-indigo-600">{formatCurrency(bookingMetrics.totalValue)}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Collected</p>
          <p className="text-lg font-black text-emerald-600">{formatCurrency(bookingMetrics.totalCollected)}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase">Remaining Due</p>
          <p className="text-lg font-black text-rose-600">{formatCurrency(bookingMetrics.totalPending)}</p>
        </div>
      </div>

      {/* Bookings Table */}
      {paginatedBookings.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Trip Schedule</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedBookings.map((b) => {
                  const status = getBookingStatus(b);
                  return (
                    <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{b.customerName}</p>
                        <p className="font-mono text-[10px] text-slate-400">ID: {b._id.slice(0, 8)}...</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <p className="font-medium">{formatDateTimeNice(b.startDateTime)}</p>
                        <p className="text-slate-400 text-[11px]">to {formatDateTimeNice(b.endDateTime)}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {getBookingDurationLabel(b.startDateTime, b.endDateTime)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(b.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        {formatCurrency(b.paidAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        {b.balanceAmount > 0 ? (
                          <span className="text-rose-600">{formatCurrency(b.balanceAmount)}</span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {b.isCancelled ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">
                            Cancelled
                          </span>
                        ) : status === "active" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 animate-pulse">
                            On Trip
                          </span>
                        ) : status === "upcoming" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                            Upcoming
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bookings Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Show</span>
              <select
                value={bookingPageSize}
                onChange={(e) => {
                  setBookingPageSize(Number(e.target.value));
                  setBookingPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
              <span>
                Showing {Math.min((bookingPage - 1) * bookingPageSize + 1, filteredBookings.length)} to{" "}
                {Math.min(bookingPage * bookingPageSize, filteredBookings.length)} of {filteredBookings.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setBookingPage(1)}
                disabled={bookingPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                disabled={bookingPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-xs font-bold text-slate-700">
                Page {bookingPage} of {bookingTotalPages}
              </span>

              <button
                onClick={() => setBookingPage((p) => Math.min(bookingTotalPages, p + 1))}
                disabled={bookingPage >= bookingTotalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setBookingPage(bookingTotalPages)}
                disabled={bookingPage >= bookingTotalPages}
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
          <CalendarX2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No bookings match the selected filters.</p>
          <p className="text-xs text-slate-400 mt-1">
            {selectedMonth
              ? `There are no bookings in ${formatMonthDisplay(selectedMonth)}. Click "All Months (Full History)" above to view all bookings.`
              : "Try clearing search or adjusting the date range."}
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
  );
}
