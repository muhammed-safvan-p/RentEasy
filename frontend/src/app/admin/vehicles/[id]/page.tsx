"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Car,
  ArrowLeft,
  User,
  Edit,
  Check,
  Copy,
  Calendar,
  CalendarDays,
  Clock,
  TrendingUp,
  Fuel,
  Gauge,
  Users,
  ShieldCheck,
  Wallet,
  Lock,
  Unlock,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  DollarSign,
  FileText,
  Building2,
  AlertCircle,
  Sparkles,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Tag,
  ArrowUpRight,
  CalendarX2,
} from "lucide-react";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  formatCurrency,
  formatDateNice,
  formatDateTimeNice,
  formatFullDateTime,
  formatMonthDisplay,
  getBookingDurationLabel,
  getBookingStatus,
} from "@/lib/formatters";
import {
  Vehicle,
  VehicleStatus,
  WalletData,
  WalletTransaction,
  Booking,
  VehicleLock,
  Dealer,
  OperationalNote,
} from "@/types";
import { EditVehicleModal } from "@/components/admin/vehicles/EditVehicleModal";

type TabKey = "overview" | "bookings" | "financials" | "locks" | "notes" | "dealers";

export default function AdminVehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core Data States
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [liveStatus, setLiveStatus] = useState<VehicleStatus | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locks, setLocks] = useState<VehicleLock[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);

  // UI States
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Auto-open Edit Modal if navigated via ?edit=true deep link
  useEffect(() => {
    if (searchParams?.get("edit") === "true") {
      setIsEditModalOpen(true);
    }
  }, [searchParams]);

  // Clean URL query when closing edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    if (typeof window !== "undefined" && window.location.search.includes("edit=")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  };

  // Month & Period Selection (null = All Time / Full History)
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  // Bookings Filter & Pagination States
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingFromDate, setBookingFromDate] = useState("");
  const [bookingToDate, setBookingToDate] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPageSize, setBookingPageSize] = useState(20);

  // Wallet Filter & Pagination States
  const [txFilter, setTxFilter] = useState<string>("all");
  const [txSearch, setTxSearch] = useState("");
  const [txFromDate, setTxFromDate] = useState("");
  const [txToDate, setTxToDate] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(20);

  // Modal States
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [noteError, setNoteError] = useState("");

  const [showAddLockModal, setShowAddLockModal] = useState(false);
  const [lockStartDate, setLockStartDate] = useState("");
  const [lockEndDate, setLockEndDate] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [submittingLock, setSubmittingLock] = useState(false);
  const [lockError, setLockError] = useState("");
  const [deletingLockId, setDeletingLockId] = useState<string | null>(null);

  const [showAddDealerModal, setShowAddDealerModal] = useState(false);
  const [newDealerName, setNewDealerName] = useState("");
  const [submittingDealer, setSubmittingDealer] = useState(false);
  const [dealerError, setDealerError] = useState("");
  const [deletingDealerId, setDeletingDealerId] = useState<string | null>(null);

  // Fetch all vehicle data concurrently
  const loadAllData = useCallback(async () => {
    if (!id) return;

    try {
      const [
        vehicleRes,
        statusRes,
        walletRes,
        txRes,
        bookingsRes,
        locksRes,
        dealersRes,
      ] = await Promise.allSettled([
        api.get<Vehicle>(`/api/admin/vehicles/${id}`),
        api.get<VehicleStatus>(`/api/vehicles/${id}/status`),
        api.get<WalletData | { wallet: WalletData }>(`/api/vehicles/${id}/wallet`),
        api.get<{ transactions: WalletTransaction[] }>(`/api/vehicles/${id}/wallet/transactions?limit=500`),
        api.get<{ bookings: Booking[] } | Booking[]>(`/api/bookings?vehicleId=${id}&limit=500`),
        api.get<{ locks: VehicleLock[] } | VehicleLock[]>(`/api/vehicles/${id}/locks`),
        api.get<{ dealers: Dealer[] } | Dealer[]>(`/api/vehicles/${id}/dealers`),
      ]);

      if (vehicleRes.status === "fulfilled") {
        setVehicle(vehicleRes.value);
      } else {
        throw new Error("Failed to load vehicle details or vehicle does not exist.");
      }

      if (statusRes.status === "fulfilled") {
        setLiveStatus(statusRes.value);
      }
      if (walletRes.status === "fulfilled") {
        const val = walletRes.value as { wallet?: WalletData } | WalletData;
        setWallet("wallet" in val && val.wallet ? val.wallet : (val as WalletData));
      }
      if (txRes.status === "fulfilled") {
        setTransactions(txRes.value.transactions || []);
      } else {
        logger.error("Failed to load wallet transactions:", txRes.reason);
      }
      if (bookingsRes.status === "fulfilled") {
        const val = bookingsRes.value;
        setBookings(Array.isArray(val) ? val : val.bookings || []);
      } else {
        logger.error("Failed to load bookings:", bookingsRes.reason);
      }
      if (locksRes.status === "fulfilled") {
        const val = locksRes.value;
        setLocks("locks" in val && Array.isArray(val.locks) ? val.locks : (Array.isArray(val) ? val : []));
      } else {
        logger.error("Failed to load vehicle locks:", locksRes.reason);
      }
      if (dealersRes.status === "fulfilled") {
        const val = dealersRes.value;
        setDealers(Array.isArray(val) ? val : ("dealers" in val && Array.isArray(val.dealers) ? val.dealers : []));
      } else {
        logger.error("Failed to load dealers:", dealersRes.reason);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading vehicle data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAllData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAllData]);

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setSelectedMonth((prev) => {
      const base = prev || new Date();
      return new Date(base.getFullYear(), base.getMonth() - 1, 1);
    });
    setBookingPage(1);
    setTxPage(1);
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => {
      const base = prev || new Date();
      return new Date(base.getFullYear(), base.getMonth() + 1, 1);
    });
    setBookingPage(1);
    setTxPage(1);
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
    setBookingPage(1);
    setTxPage(1);
  };

  const handleAllTime = () => {
    setSelectedMonth(null);
    setBookingPage(1);
    setTxPage(1);
  };

  // Toggle Active/Inactive
  const handleToggleActive = async () => {
    if (!vehicle) return;
    setTogglingActive(true);
    try {
      const data = await api.patch<{ isActive: boolean }>(`/api/admin/vehicles/${vehicle._id}/toggle`);
      setVehicle((prev) => (prev ? { ...prev, isActive: data.isActive } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    } finally {
      setTogglingActive(false);
    }
  };

  // Add Operational Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) {
      setNoteError("Please enter note content");
      return;
    }
    setSubmittingNote(true);
    setNoteError("");
    try {
      const data = await api.post<{ note: OperationalNote }>(`/api/vehicles/${id}/notes`, {
        text: newNoteText.trim(),
      });
      if (data.note) {
        setVehicle((prev) =>
          prev
            ? { ...prev, operationalNotes: [...(prev.operationalNotes || []), data.note] }
            : null
        );
      }
      setNewNoteText("");
      setShowAddNoteModal(false);
    } catch (err: unknown) {
      setNoteError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSubmittingNote(false);
    }
  };

  // Delete Operational Note
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this operational note?")) return;
    setDeletingNoteId(noteId);
    try {
      await api.delete(`/api/vehicles/${id}/notes/${noteId}`);
      setVehicle((prev) =>
        prev
          ? {
              ...prev,
              operationalNotes: prev.operationalNotes?.filter((n) => n._id !== noteId),
            }
          : null
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting note");
    } finally {
      setDeletingNoteId(null);
    }
  };

  // Add Lock
  const handleAddLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockStartDate || !lockEndDate || !lockReason.trim()) {
      setLockError("Please fill in start date, end date, and reason.");
      return;
    }
    setSubmittingLock(true);
    setLockError("");
    try {
      const data = await api.post<{ lock: VehicleLock }>(`/api/vehicles/${id}/locks`, {
        startDate: lockStartDate,
        endDate: lockEndDate,
        reason: lockReason.trim(),
      });
      if (data.lock) {
        setLocks((prev) => [data.lock, ...prev]);
      }
      setLockStartDate("");
      setLockEndDate("");
      setLockReason("");
      setShowAddLockModal(false);
      try {
        const statusData = await api.get<VehicleStatus>(`/api/vehicles/${id}/status`);
        setLiveStatus(statusData);
      } catch {
        // Non-blocking status refresh
      }
    } catch (err: unknown) {
      setLockError(err instanceof Error ? err.message : "Failed to create lock");
    } finally {
      setSubmittingLock(false);
    }
  };

  // Delete Lock
  const handleDeleteLock = async (lockId: string) => {
    if (!confirm("Are you sure you want to release this lock?")) return;
    setDeletingLockId(lockId);
    try {
      await api.delete(`/api/vehicles/${id}/locks/${lockId}`);
      setLocks((prev) => prev.filter((l) => l._id !== lockId));
      try {
        const statusData = await api.get<VehicleStatus>(`/api/vehicles/${id}/status`);
        setLiveStatus(statusData);
      } catch {
        // Non-blocking status refresh
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error removing lock");
    } finally {
      setDeletingLockId(null);
    }
  };

  // Add Dealer
  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealerName.trim()) {
      setDealerError("Dealer name is required");
      return;
    }
    setSubmittingDealer(true);
    setDealerError("");
    try {
      const data = await api.post<{ dealer: Dealer }>(`/api/vehicles/${id}/dealers`, {
        name: newDealerName.trim(),
      });
      if (data.dealer) {
        setDealers((prev) => [...prev, data.dealer]);
      }
      setNewDealerName("");
      setShowAddDealerModal(false);
    } catch (err: unknown) {
      setDealerError(err instanceof Error ? err.message : "Failed to add dealer");
    } finally {
      setSubmittingDealer(false);
    }
  };

  // Delete Dealer
  const handleDeleteDealer = async (dealerId: string) => {
    if (!confirm("Are you sure you want to delete this dealer preset?")) return;
    setDeletingDealerId(dealerId);
    try {
      await api.delete(`/api/vehicles/${id}/dealers/${dealerId}`);
      setDealers((prev) => prev.filter((d) => d._id !== dealerId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting dealer");
    } finally {
      setDeletingDealerId(null);
    }
  };

  // -------------------------------------------------------------
  // Filtered & Paginated Bookings
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // Filtered & Paginated Wallet Transactions
  // -------------------------------------------------------------
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

      // 3. Search
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const matches =
          (tx.note && tx.note.toLowerCase().includes(q)) ||
          (tx.source && tx.source.toLowerCase().includes(q)) ||
          tx._id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 4. Type filter
      if (txFilter === "all") return true;
      if (txFilter === "income") return tx.type === "income";
      if (txFilter === "expense") return tx.type === "expense";
      if (txFilter === "cash") return tx.paymentMethod === "cash";
      if (txFilter === "bank") return tx.paymentMethod === "bank";
      return true;
    }).sort((a, b) => {
      const dayA = (a.transactionDate || a.createdAt || "").split("T")[0];
      const dayB = (b.transactionDate || b.createdAt || "").split("T")[0];
      if (dayA && dayB && dayA !== dayB) return dayB.localeCompare(dayA);
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (createdA && createdB && createdA !== createdB) return createdB - createdA;
      const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
      const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return (b._id || "").localeCompare(a._id || "");
    });
  }, [transactions, selectedMonth, txFromDate, txToDate, txSearch, txFilter]);

  // Wallet Metrics (Month-wise & Filter-wise)
  const walletMetrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let cashIncome = 0;
    let cashExpense = 0;
    let bankIncome = 0;
    let bankExpense = 0;

    filteredTransactions.forEach((tx) => {
      const amt = tx.amount || 0;
      if (tx.type === "income") {
        totalIncome += amt;
        if (tx.paymentMethod === "cash") cashIncome += amt;
        else bankIncome += amt;
      } else {
        totalExpense += amt;
        if (tx.paymentMethod === "cash") cashExpense += amt;
        else bankExpense += amt;
      }
    });

    const netCashflow = totalIncome - totalExpense;
    return {
      totalIncome,
      totalExpense,
      netCashflow,
      cashIncome,
      cashExpense,
      bankIncome,
      bankExpense,
      txCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Comprehensive Overview KPI Metrics (Filtered by selectedMonth or Lifetime)
  const overviewMetrics = useMemo(() => {
    // 1. Filter transactions based on selectedMonth (if selected) or lifetime
    const periodTx = selectedMonth
      ? transactions.filter((tx) => {
          const txDate = new Date(tx.transactionDate || tx.createdAt);
          return (
            txDate.getFullYear() === selectedMonth.getFullYear() &&
            txDate.getMonth() === selectedMonth.getMonth()
          );
        })
      : transactions;

    let totalIncome = 0;
    let cashIncome = 0;
    let bankIncome = 0;
    let totalExpense = 0;
    let cashExpense = 0;
    let bankExpense = 0;

    periodTx.forEach((tx) => {
      const amt = tx.amount || 0;
      if (tx.type === "income") {
        totalIncome += amt;
        if (tx.paymentMethod === "cash") cashIncome += amt;
        else bankIncome += amt;
      } else if (tx.type === "expense") {
        totalExpense += amt;
        if (tx.paymentMethod === "cash") cashExpense += amt;
        else bankExpense += amt;
      }
    });

    const monthNetCashflow = totalIncome - totalExpense;

    // 2. Lock days calculation
    let lockDays = 0;
    let lockPeriodsCount = 0;

    if (selectedMonth) {
      const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);

      locks.forEach((lock) => {
        const lStart = new Date(lock.startDate);
        const lEnd = new Date(lock.endDate);
        const overlapStart = Math.max(lStart.getTime(), monthStart.getTime());
        const overlapEnd = Math.min(lEnd.getTime(), monthEnd.getTime());
        if (overlapEnd > overlapStart) {
          const days = Math.max(1, Math.round((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)));
          lockDays += days;
          lockPeriodsCount++;
        }
      });
    } else {
      locks.forEach((lock) => {
        const lStart = new Date(lock.startDate).getTime();
        const lEnd = new Date(lock.endDate).getTime();
        if (lEnd > lStart) {
          const days = Math.max(1, Math.round((lEnd - lStart) / (1000 * 60 * 60 * 24)));
          lockDays += days;
          lockPeriodsCount++;
        }
      });
    }

    // 3. Bookings in the period (for Card 1)
    const periodBookings = selectedMonth
      ? bookings.filter((b) => {
          const bStart = new Date(b.startDateTime);
          const bEnd = new Date(b.endDateTime || b.startDateTime);
          const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1, 0, 0, 0, 0);
          const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
          return bStart <= monthEnd && bEnd >= monthStart;
        })
      : bookings;

    const activeBookingsCount = periodBookings.filter((b) => getBookingStatus(b) === "active").length;
    const cancelledBookingsCount = periodBookings.filter((b) => b.isCancelled).length;

    return {
      totalBookings: periodBookings.length,
      activeBookingsCount,
      cancelledBookingsCount,
      totalIncome,
      cashIncome,
      bankIncome,
      totalExpense,
      cashExpense,
      bankExpense,
      monthNetCashflow,
      lockDays,
      lockPeriodsCount,
    };
  }, [selectedMonth, transactions, locks, bookings]);

  // Wallet Pagination
  const txTotalPages = Math.ceil(filteredTransactions.length / txPageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return filteredTransactions.slice(start, start + txPageSize);
  }, [filteredTransactions, txPage, txPageSize]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-slate-200 rounded-lg" />
          <div className="h-9 w-28 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-64 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
        </div>
        <div className="h-96 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm mt-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Vehicle Not Found</h3>
        <p className="text-slate-500 text-sm mb-6">{error || "Could not retrieve the requested vehicle details."}</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => router.push("/admin/vehicles")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vehicles Fleet
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              setError("");
              loadAllData();
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>

          <Link
            href={`/vehicles/${vehicle._id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Public Garage View
          </Link>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Vehicle
          </button>
        </div>
      </div>

      {/* 1. Hero Showcase & Vehicle Summary Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Vehicle Media Gallery Column */}
          <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 flex flex-col justify-between relative overflow-hidden min-h-[260px]">
            {vehicle.imageUrl ? (
              <div className="relative w-full h-full min-h-[220px] rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                <Image
                  src={vehicle.imageUrl}
                  alt={vehicle.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6">
                <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center text-indigo-300 mb-3 shadow-lg backdrop-blur-md">
                  <Car className="w-10 h-10" />
                </div>
                <p className="text-white font-semibold text-sm">RentEasy Fleet</p>
                <p className="text-slate-400 text-xs mt-0.5">No vehicle photo uploaded</p>
              </div>
            )}

            {/* Overlay Status Pill */}
            <div className="absolute top-4 left-4 z-10">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border shadow-md ${
                  vehicle.isActive
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    vehicle.isActive ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                  }`}
                />
                {vehicle.isActive ? "Active Fleet" : "Inactive Fleet"}
              </span>
            </div>
          </div>

          {/* Vehicle Title & Key Metadata Column */}
          <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {vehicle.name}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Realistic Indian HSRP Plate */}
                    <div className="inline-flex items-center bg-slate-100 rounded-lg border-2 border-slate-300 shadow-sm overflow-hidden select-all">
                      <div className="bg-[#002244] px-2 py-1 flex flex-col items-center justify-center text-white border-r border-blue-900">
                        <div className="w-2 h-2 rounded-full border border-yellow-400 mb-0.5 flex items-center justify-center">
                          <div className="w-0.5 h-0.5 bg-yellow-400 rounded-full" />
                        </div>
                        <span className="text-[8px] font-black tracking-tighter leading-none text-blue-100">
                          IND
                        </span>
                      </div>
                      <div className="px-3 py-1 font-mono font-black text-slate-900 text-sm tracking-widest uppercase">
                        {vehicle.plateNumber}
                      </div>
                      <button
                        onClick={() => handleCopy(vehicle.plateNumber, "plate")}
                        className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition-colors border-l border-slate-300 flex items-center justify-center"
                        title="Copy Plate Number"
                      >
                        {copiedField === "plate" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </button>
                    </div>

                    {/* System Vehicle ID */}
                    <button
                      onClick={() => handleCopy(vehicle._id, "id")}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-mono font-medium transition-colors"
                      title="Copy MongoDB ID"
                    >
                      <Tag className="w-3 h-3 text-slate-400" />
                      ID: {vehicle._id.slice(0, 8)}...
                      {copiedField === "id" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Toggle Status */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleActive}
                    disabled={togglingActive}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border ${
                      vehicle.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                        : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                    }`}
                  >
                    {togglingActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : vehicle.isActive ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {vehicle.isActive ? "Fleet Status: Active" : "Fleet Status: Inactive"}
                  </button>
                </div>
              </div>

              {/* Real-time Status Banner */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      liveStatus?.status === "booked"
                        ? "bg-indigo-500 animate-pulse"
                        : "bg-emerald-500"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Real-time Availability
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {liveStatus?.status === "booked" ? (
                        <span>
                          Currently on a trip until{" "}
                          <strong className="text-indigo-700 font-semibold">
                            {formatDateTimeNice(liveStatus.until)}
                          </strong>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">
                          Available for booking in garage
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {liveStatus?.nextBookingDate && (
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Next Scheduled Trip</p>
                    <p className="text-xs font-bold text-slate-700">
                      {formatDateTimeNice(liveStatus.nextBookingDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Specs Strip */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Fuel className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Fuel Type</p>
                  <p className="text-xs font-bold text-slate-800">{vehicle.fuelType || "Diesel"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Transmission</p>
                  <p className="text-xs font-bold text-slate-800">{vehicle.transmission || "Manual"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Capacity</p>
                  <p className="text-xs font-bold text-slate-800">{vehicle.seatingCapacity || 5} Seats</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Co-Owners</p>
                  <p className="text-xs font-bold text-slate-800">{vehicle.ownerIds?.length || 0} Assigned</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Global Month & Reporting Period Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Metrics & History Scope
            </p>
            <h4 className="text-sm font-black text-slate-900">
              {selectedMonth ? formatMonthDisplay(selectedMonth) : "Full Lifetime History (All Months)"}
            </h4>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAllTime}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedMonth === null
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Months (Full History)
          </button>

          <button
            onClick={handleCurrentMonth}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedMonth &&
              selectedMonth.getFullYear() === new Date().getFullYear() &&
              selectedMonth.getMonth() === new Date().getMonth()
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            This Month
          </button>

          {selectedMonth && (
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800">
                {formatMonthDisplay(selectedMonth)}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Executive Performance KPI Strip (5 Dedicated Cards: Bookings, Income, Expense, Balance, Lock Days) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Bookings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {selectedMonth ? `${formatMonthDisplay(selectedMonth)} Bookings` : "Lifetime Bookings"}
            </p>
            <h4 className="text-2xl font-black text-slate-900 mt-1">{overviewMetrics.totalBookings}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {overviewMetrics.activeBookingsCount} active • {overviewMetrics.cancelledBookingsCount} cancelled
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Income (All Incoming Funds) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {selectedMonth ? "Month Total Income" : "Lifetime Total Income"}
            </p>
            <h4 className="text-2xl font-black text-emerald-600 mt-1">
              +{formatCurrency(overviewMetrics.totalIncome)}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cash: {formatCurrency(overviewMetrics.cashIncome)} • Bank: {formatCurrency(overviewMetrics.bankIncome)}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Expense (All Outgoing Funds) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {selectedMonth ? "Month Total Expense" : "Lifetime Total Expense"}
            </p>
            <h4 className="text-2xl font-black text-rose-600 mt-1">
              -{formatCurrency(overviewMetrics.totalExpense)}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cash: {formatCurrency(overviewMetrics.cashExpense)} • Bank: {formatCurrency(overviewMetrics.bankExpense)}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Net Balance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {selectedMonth ? "Month Net Balance" : "Total Net Balance"}
            </p>
            <h4
              className={`text-2xl font-black mt-1 ${
                (selectedMonth ? overviewMetrics.monthNetCashflow : wallet?.totalBalance ?? 0) >= 0
                  ? "text-slate-900"
                  : "text-rose-600"
              }`}
            >
              {formatCurrency(selectedMonth ? overviewMetrics.monthNetCashflow : wallet?.totalBalance ?? 0)}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedMonth ? (
                <span>
                  +{formatCurrency(overviewMetrics.totalIncome)} • -{formatCurrency(overviewMetrics.totalExpense)}
                </span>
              ) : (
                <span>
                  Cash: {formatCurrency(wallet?.cashBalance ?? 0)} • Bank: {formatCurrency(wallet?.bankBalance ?? 0)}
                </span>
              )}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: Total Lock Days */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {selectedMonth ? "Month Lock Days" : "Total Lock Days"}
            </p>
            <h4 className="text-2xl font-black text-amber-600 mt-1">
              {overviewMetrics.lockDays} Days Locked
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedMonth
                ? `Across ${overviewMetrics.lockPeriodsCount} lock period${overviewMetrics.lockPeriodsCount !== 1 ? "s" : ""} in ${formatMonthDisplay(selectedMonth)}`
                : `Across ${overviewMetrics.lockPeriodsCount} total lock period${overviewMetrics.lockPeriodsCount !== 1 ? "s" : ""} recorded`}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Tabbed Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Info className="w-4 h-4" />
          Overview & Specs
        </button>

        <button
          onClick={() => setActiveTab("bookings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "bookings"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Bookings History
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "bookings" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {filteredBookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("financials")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "financials"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Wallet & Financials
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "financials" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {filteredTransactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("locks")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "locks"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Lock className="w-4 h-4" />
          Maintenance & Locks
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "locks" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {locks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "notes"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          Operational Notes
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "notes" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {vehicle.operationalNotes?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("dealers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "dealers"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Associated Dealers
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === "dealers" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {dealers.length}
          </span>
        </button>
      </div>

      {/* 5. Tab Contents */}

      {/* TAB 1: OVERVIEW & SPECIFICATIONS */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detailed Technical Specs Card */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Vehicle Specifications & Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Specs
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <SpecItem label="Vehicle Name" value={vehicle.name} />
              <SpecItem label="Plate Number" value={vehicle.plateNumber} mono />
              <SpecItem label="Fuel Type" value={vehicle.fuelType || "Diesel"} />
              <SpecItem label="Transmission" value={vehicle.transmission || "Manual"} />
              <SpecItem label="Seating Capacity" value={`${vehicle.seatingCapacity || 5} Persons`} />
              <SpecItem
                label="System Status"
                value={vehicle.isActive ? "Active (Operational)" : "Inactive (Deactivated)"}
                valueClass={vehicle.isActive ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}
              />
              <SpecItem label="Registered On" value={formatFullDateTime(vehicle.createdAt)} />
              <SpecItem label="Last Modified" value={formatFullDateTime(vehicle.updatedAt)} />
              <SpecItem label="Concurrency Booking Version" value={`v${(vehicle as unknown as { bookingVersion?: number }).bookingVersion ?? 0}`} />
              <SpecItem label="Database ID" value={vehicle._id} mono copyable onCopy={() => handleCopy(vehicle._id, "spec-id")} />
            </div>

            {/* Static Remarks / Notes */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Internal Administrative Remarks
              </h4>
              {vehicle.notes ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
                  {vehicle.notes}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No administrative remarks noted.</p>
              )}
            </div>
          </div>

          {/* Authorized Co-Owners & Stakeholders */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Assigned Co-Owners</h3>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  {vehicle.ownerIds?.length || 0} Users
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                These users have full manager permissions to view bookings, financial transactions, and availability for this vehicle.
              </p>

              <div className="space-y-3">
                {vehicle.ownerIds && vehicle.ownerIds.length > 0 ? (
                  vehicle.ownerIds.map((owner) => {
                    const ownerId = typeof owner === "object" && owner?._id ? owner._id : String(owner);
                    const username = typeof owner === "object" && owner?.username ? owner.username : "Owner";
                    return (
                      <div
                        key={ownerId}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{username}</p>
                            <p className="text-[11px] font-mono text-slate-400">ID: {ownerId}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopy(ownerId, `owner-${ownerId}`)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Copy User ID"
                        >
                          {copiedField === `owner-${ownerId}` ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                    <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 italic">No assigned owners yet.</p>
                  </div>
                )}
              </div>
            </div>

            <Link
              href={`/admin/vehicles/${vehicle._id}/edit`}
              className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold text-center block transition-colors"
            >
              Manage Assigned Owners
            </Link>
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS HISTORY & DATE-WISE / MONTH-WISE METRICS */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
          {/* Header & Controls */}
          <div className="space-y-4 border-b border-slate-100 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">Vehicle Booking History</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {selectedMonth ? formatMonthDisplay(selectedMonth) : "Full History (All Months)"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete lifetime reservation logs with date range and status filters
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search customer name or ID..."
                  value={bookingSearch}
                  onChange={(e) => {
                    setBookingSearch(e.target.value);
                    setBookingPage(1);
                  }}
                  className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
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
                    className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold"
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
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
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
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                    disabled={bookingPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
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
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setBookingPage(bookingTotalPages)}
                    disabled={bookingPage >= bookingTotalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
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
                  onClick={handleAllTime}
                  className="mt-3 px-4 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors inline-block"
                >
                  Show All Months (Full History)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FINANCIAL LEDGER & WALLET */}
      {activeTab === "financials" && (
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Header & Controls */}
            <div className="space-y-4 border-b border-slate-100 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Wallet Financial Ledger</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Month-wise and date-wise audit log of all income and expense transactions
                  </p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search notes or source..."
                    value={txSearch}
                    onChange={(e) => {
                      setTxSearch(e.target.value);
                      setTxPage(1);
                    }}
                    className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-60"
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
                      className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold"
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
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
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
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                      disabled={txPage <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
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
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTxPage(txTotalPages)}
                      disabled={txPage >= txTotalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
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
                    onClick={handleAllTime}
                    className="mt-3 px-4 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors inline-block"
                  >
                    Show All Months (Full History)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MAINTENANCE & LOCKS */}
      {activeTab === "locks" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Vehicle Maintenance & Locks</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Block off vehicle availability for repairs, personal use, or dealer holds
              </p>
            </div>

            <button
              onClick={() => {
                setShowAddLockModal(true);
                setLockError("");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
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
                      onClick={() => handleDeleteLock(lock._id)}
                      disabled={deletingLockId === lock._id}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
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
      )}

      {/* TAB 5: OPERATIONAL NOTES */}
      {activeTab === "notes" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Operational Notes & Handover Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Keep track of maintenance rules, spare keys, FASTag info, and handover procedures
              </p>
            </div>

            <button
              onClick={() => {
                setShowAddNoteModal(true);
                setNoteError("");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Note
            </button>
          </div>

          {vehicle.operationalNotes && vehicle.operationalNotes.length > 0 ? (
            <div className="space-y-3">
              {vehicle.operationalNotes.map((note) => (
                <div
                  key={note._id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4"
                >
                  <div className="space-y-2">
                    <p className="text-sm text-slate-800 leading-relaxed font-medium">{note.text}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Posted on {formatFullDateTime(note.createdAt)}</span>
                      {note.createdBy?.username && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-slate-600">By {note.createdBy.username}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteNote(note._id)}
                    disabled={deletingNoteId === note._id}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                    title="Delete Note"
                  >
                    {deletingNoteId === note._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No operational notes posted yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Add notes to keep staff and co-owners aligned on operational rules.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: ASSOCIATED DEALERS */}
      {activeTab === "dealers" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Associated Dealer Presets</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dealers and rental partners configured for fast booking allocation & lock presets
              </p>
            </div>

            <button
              onClick={() => {
                setShowAddDealerModal(true);
                setDealerError("");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Dealer Preset
            </button>
          </div>

          {dealers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {dealers.map((dealer) => (
                <div
                  key={dealer._id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{dealer.name}</h4>
                      <p className="text-[10px] font-mono text-slate-400">ID: {dealer._id.slice(0, 8)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDealer(dealer._id)}
                    disabled={deletingDealerId === dealer._id}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                    title="Delete Dealer"
                  >
                    {deletingDealerId === dealer._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No dealers configured.</p>
              <p className="text-xs text-slate-400 mt-1">Add dealer presets for quick lock assignment.</p>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Add Operational Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">New Operational Note</h3>
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {noteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {noteError}
              </div>
            )}

            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Note Content
                </label>
                <textarea
                  rows={4}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="e.g. Spare key is in top right glove box. Fastag recharged ₹2,000 on 20th."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingNote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Maintenance Lock Modal */}
      {showAddLockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Maintenance Lock</h3>
              <button
                onClick={() => setShowAddLockModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {lockError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {lockError}
              </div>
            )}

            <form onSubmit={handleAddLock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={lockStartDate}
                  onChange={(e) => setLockStartDate(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={lockEndDate}
                  onChange={(e) => setLockEndDate(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lock Reason / Details
                </label>
                <input
                  type="text"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="e.g. Periodic service, Brake pad replacement, Dealer hold"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLockModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLock}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingLock && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Lock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Dealer Modal */}
      {showAddDealerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Dealer Preset</h3>
              <button
                onClick={() => setShowAddDealerModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {dealerError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {dealerError}
              </div>
            )}

            <form onSubmit={handleAddDealer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Dealer / Partner Name
                </label>
                <input
                  type="text"
                  value={newDealerName}
                  onChange={(e) => setNewDealerName(e.target.value)}
                  placeholder="e.g. Royal Travels, Kerala Car Hub"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDealerModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDealer}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingDealer && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Dealer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern In-place Vehicle Edit Modal */}
      <EditVehicleModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        vehicle={vehicle}
        onSuccess={(updatedVehicle) => {
          setVehicle(updatedVehicle);
          handleCloseEditModal();
          loadAllData();
        }}
      />
    </div>
  );
}

// Helper SpecItem Component
function SpecItem({
  label,
  value,
  mono = false,
  valueClass = "text-slate-900",
  copyable = false,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
  copyable?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${valueClass} ${mono ? "font-mono text-xs" : ""}`}>
          {value}
        </span>
        {copyable && onCopy && (
          <button
            onClick={onCopy}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
            title={`Copy ${label}`}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
