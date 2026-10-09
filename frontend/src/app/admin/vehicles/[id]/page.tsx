"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SafeImage } from "@/components/common/SafeImage";
import {
  Car,
  ArrowLeft,
  Edit,
  Check,
  Copy,
  Calendar,
  CalendarDays,
  TrendingUp,
  Fuel,
  Gauge,
  Users,
  ShieldCheck,
  Wallet,
  Lock,
  RefreshCw,
  ExternalLink,
  DollarSign,
  FileText,
  Building2,
  AlertCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Tag,
  ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import {
  formatCurrency,
  formatDateTimeNice,
  formatMonthDisplay,
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
import OverviewTab from "@/components/admin/vehicles/tabs/OverviewTab";
import BookingsTab from "@/components/admin/vehicles/tabs/BookingsTab";
import FinancialsTab from "@/components/admin/vehicles/tabs/FinancialsTab";
import LocksTab from "@/components/admin/vehicles/tabs/LocksTab";
import NotesTab from "@/components/admin/vehicles/tabs/NotesTab";
import DealersTab from "@/components/admin/vehicles/tabs/DealersTab";

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(() => searchParams?.get("edit") === "true");

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
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => {
      const base = prev || new Date();
      return new Date(base.getFullYear(), base.getMonth() + 1, 1);
    });
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  const handleAllTime = () => {
    setSelectedMonth(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => router.push("/admin/vehicles")}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Fleet</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                <SafeImage
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
          <div className="lg:col-span-8 p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4">
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

            {/* Quick Specs Strip: 2 cols on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-4 mt-4 border-t border-slate-100">
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Metrics & History Scope
            </p>
            <h4 className="text-xs sm:text-sm font-black text-slate-900">
              {selectedMonth ? formatMonthDisplay(selectedMonth) : "Full Lifetime History (All Months)"}
            </h4>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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

      {/* 3. Executive Performance KPI Strip: 2 cols on mobile, 5 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 flex items-center gap-1.5 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
            {bookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("financials")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("locks")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
        <OverviewTab
          vehicle={vehicle}
          onEditSpecs={() => setIsEditModalOpen(true)}
          onCopy={handleCopy}
          copiedField={copiedField}
        />
      )}

      {/* TAB 2: BOOKINGS HISTORY */}
      {activeTab === "bookings" && (
        <BookingsTab
          bookings={bookings}
          selectedMonth={selectedMonth}
          onAllTime={handleAllTime}
        />
      )}

      {/* TAB 3: FINANCIAL LEDGER & WALLET */}
      {activeTab === "financials" && (
        <FinancialsTab
          wallet={wallet}
          transactions={transactions}
          selectedMonth={selectedMonth}
          onAllTime={handleAllTime}
        />
      )}

      {/* TAB 4: MAINTENANCE & LOCKS */}
      {activeTab === "locks" && (
        <LocksTab
          locks={locks}
          onAddLock={() => {
            setShowAddLockModal(true);
            setLockError("");
          }}
          onDeleteLock={handleDeleteLock}
          deletingLockId={deletingLockId}
        />
      )}

      {/* TAB 5: OPERATIONAL NOTES */}
      {activeTab === "notes" && (
        <NotesTab
          operationalNotes={vehicle.operationalNotes}
          onAddNote={() => {
            setShowAddNoteModal(true);
            setNoteError("");
          }}
          onDeleteNote={handleDeleteNote}
          deletingNoteId={deletingNoteId}
        />
      )}

      {/* TAB 6: ASSOCIATED DEALERS */}
      {activeTab === "dealers" && (
        <DealersTab
          dealers={dealers}
          onAddDealer={() => {
            setShowAddDealerModal(true);
            setDealerError("");
          }}
          onDeleteDealer={handleDeleteDealer}
          deletingDealerId={deletingDealerId}
        />
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

