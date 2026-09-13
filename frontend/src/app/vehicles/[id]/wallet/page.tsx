"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Building2,
  ShieldAlert,
  AlertCircle,
  X,
  Loader2,
  Calendar,
} from "lucide-react";

interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
}

interface WalletData {
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
}

interface WalletTransaction {
  _id: string;
  walletId: string;
  vehicleId: string;
  type: "income" | "expense";
  paymentMethod: "cash" | "bank";
  amount: number;
  note?: string;
  transactionDate: string;
  createdAt: string;
  source: "booking" | "manual";
  createdBy?: {
    _id: string;
    username: string;
  };
}

export default function VehicleWalletPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [monthIncome, setMonthIncome] = useState<number>(0);
  const [monthExpense, setMonthExpense] = useState<number>(0);

  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [formPaymentMethod, setFormPaymentMethod] = useState<"cash" | "bank">("cash");
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const formatMonthParam = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const formatMonthDisplay = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
  };

  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateNice = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return (
      selectedMonth.getFullYear() === now.getFullYear() &&
      selectedMonth.getMonth() === now.getMonth()
    );
  }, [selectedMonth]);

  // Fetch initial data (vehicle, wallet balance, transactions for selected month)
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchInitialData = async () => {
      setLoading(true);
      setErrorStatus(null);

      const monthParam = formatMonthParam(selectedMonth);

      try {
        const [vehicleRes, walletRes, txRes] = await Promise.all([
          fetch(`${baseUrl}/api/vehicles/${id}`, { credentials: "include" }),
          fetch(`${baseUrl}/api/vehicles/${id}/wallet`, { credentials: "include" }),
          fetch(`${baseUrl}/api/vehicles/${id}/wallet/transactions?month=${monthParam}`, {
            credentials: "include",
          }),
        ]);

        if (
          vehicleRes.status === 401 ||
          walletRes.status === 401 ||
          txRes.status === 401
        ) {
          router.push("/login");
          return;
        }

        if (
          vehicleRes.status === 403 ||
          walletRes.status === 403 ||
          txRes.status === 403
        ) {
          if (isMounted) {
            setErrorStatus(403);
            setErrorMessage("You do not have permission to view this vehicle's wallet.");
            setLoading(false);
          }
          return;
        }

        if (vehicleRes.status === 404 || walletRes.status === 404) {
          if (isMounted) {
            setErrorStatus(404);
            setErrorMessage("Vehicle or wallet not found.");
            setLoading(false);
          }
          return;
        }

        if (!vehicleRes.ok) throw new Error("Failed to load vehicle details");
        if (!walletRes.ok) throw new Error("Failed to load vehicle wallet");
        if (!txRes.ok) throw new Error("Failed to load transactions");

        const vehicleData = await vehicleRes.json();
        const walletData = await walletRes.json();
        const txData = await txRes.json();

        if (isMounted) {
          setVehicle(vehicleData);
          setWallet(walletData.wallet || walletData);
          setTransactions(txData.transactions || []);
          setMonthIncome(txData.monthIncome || 0);
          setMonthExpense(txData.monthExpense || 0);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorStatus(500);
          setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, [id, baseUrl, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch transactions when month changes (after initial mount)
  const fetchTransactionsForMonth = useCallback(
    async (monthDate: Date) => {
      if (!id) return;
      setTxLoading(true);
      const monthParam = formatMonthParam(monthDate);

      try {
        const res = await fetch(
          `${baseUrl}/api/vehicles/${id}/wallet/transactions?month=${monthParam}`,
          { credentials: "include" }
        );

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions || []);
          setMonthIncome(data.monthIncome || 0);
          setMonthExpense(data.monthExpense || 0);
        }
      } catch (err: unknown) {
        console.error("Error fetching transactions for month:", err);
      } finally {
        setTxLoading(false);
      }
    },
    [id, baseUrl, router]
  );

  const handlePrevMonth = () => {
    const prev = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    setSelectedMonth(prev);
    fetchTransactionsForMonth(prev);
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    setSelectedMonth(next);
    fetchTransactionsForMonth(next);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

  // Open modal handler
  const handleOpenModal = () => {
    setFormType("income");
    setFormPaymentMethod("cash");
    setFormAmount("");
    setFormNote("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormError("");
    setIsModalOpen(true);
  };

  // Submit transaction handler
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0.01) {
      setFormError("Please enter a valid amount (minimum ₹0.01).");
      return;
    }

    if (!formDate) {
      setFormError("Please select a transaction date.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${baseUrl}/api/vehicles/${id}/wallet/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          type: formType,
          paymentMethod: formPaymentMethod,
          amount: parsedAmount,
          note: formNote.trim(),
          transactionDate: new Date(formDate).toISOString(),
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add transaction");
      }

      // Close modal
      setIsModalOpen(false);

      // Re-fetch overall balance & current view transactions
      const [walletRes, txRes] = await Promise.all([
        fetch(`${baseUrl}/api/vehicles/${id}/wallet`, { credentials: "include" }),
        fetch(
          `${baseUrl}/api/vehicles/${id}/wallet/transactions?month=${formatMonthParam(selectedMonth)}`,
          { credentials: "include" }
        ),
      ]);

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWallet(walletData.wallet || walletData);
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
        setMonthIncome(txData.monthIncome || 0);
        setMonthExpense(txData.monthExpense || 0);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error saving transaction");
    } finally {
      setSubmitting(false);
    }
  };

  // 403 Forbidden State
  if (errorStatus === 403) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          {errorMessage || "You do not have permission to view this vehicle's wallet."}
        </p>
        <Link
          href="/dashboard"
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Garage
        </Link>
      </div>
    );
  }

  // 404 Not Found State
  if (errorStatus === 404) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Wallet Not Found</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          The requested vehicle or wallet does not exist.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Garage
        </Link>
      </div>
    );
  }

  // Generic Error State
  if (errorStatus && errorStatus !== 403 && errorStatus !== 404) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Something Went Wrong</h2>
        <p className="text-sm text-slate-400 max-w-xs mb-6">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading Skeleton
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen px-4 sm:px-6 pt-6 pb-28 space-y-6 max-w-lg mx-auto w-full">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#1a1a2e] animate-pulse" />
          <div className="w-32 h-6 rounded-lg bg-[#1a1a2e] animate-pulse" />
          <div className="w-10 h-10" />
        </div>

        {/* Balance Card Skeleton */}
        <div className="h-44 rounded-3xl bg-[#1a1a2e] animate-pulse" />

        {/* Month Navigator Skeleton */}
        <div className="h-12 rounded-2xl bg-[#1a1a2e] animate-pulse" />

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
          <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
        </div>

        {/* Filter Tabs Skeleton */}
        <div className="h-10 rounded-xl bg-[#1a1a2e] animate-pulse" />

        {/* Transactions Skeleton */}
        <div className="space-y-3">
          <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
          <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
          <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-4 sm:px-6 pt-6 pb-32 max-w-lg mx-auto w-full relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4">
        <Link
          href={`/vehicles/${id}`}
          className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#2a2a46] transition-colors"
          aria-label="Back to Vehicle Overview"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <h1 className="text-sm font-semibold text-white tracking-wide">Vehicle Wallet</h1>
          {vehicle && (
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
              {vehicle.name} • {vehicle.plateNumber}
            </p>
          )}
        </div>
        <div className="w-10" />
      </div>

      {/* 1. Overall Balance Card */}
      <div className="rounded-3xl p-6 mb-6 card-gradient-purple relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
          <Wallet className="w-4 h-4 text-indigo-400" />
          <span>Total Balance</span>
        </div>

        <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-5">
          {formatCurrency(wallet?.totalBalance || 0)}
        </div>

        {/* Sub-balances: Cash & Bank */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
          <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cash</span>
            </div>
            <span
              className={`text-base font-bold truncate ${
                (wallet?.cashBalance || 0) < 0 ? "text-rose-400" : "text-white"
              }`}
            >
              {formatCurrency(wallet?.cashBalance || 0)}
            </span>
          </div>

          <div className="bg-black/20 rounded-2xl p-3 border border-white/5 flex flex-col">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Bank</span>
            </div>
            <span
              className={`text-base font-bold truncate ${
                (wallet?.bankBalance || 0) < 0 ? "text-rose-400" : "text-white"
              }`}
            >
              {formatCurrency(wallet?.bankBalance || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Month Navigator */}
      <div className="flex items-center justify-between bg-[#1a1a2e] border border-white/10 rounded-2xl px-3 py-2.5 mb-4 shadow-lg">
        <button
          onClick={handlePrevMonth}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors active:scale-95"
          aria-label="Previous Month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-white font-bold text-sm tracking-wide">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>{formatMonthDisplay(selectedMonth)}</span>
        </div>

        <button
          onClick={handleNextMonth}
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

      {/* 3. Month Summary Pills */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-emerald-300/80 uppercase tracking-wider">Income</p>
            <p className="text-base font-black text-emerald-400 truncate">
              +{formatCurrency(monthIncome)}
            </p>
          </div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-rose-300/80 uppercase tracking-wider">Expense</p>
            <p className="text-base font-black text-rose-400 truncate">
              -{formatCurrency(monthExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Filter Tabs */}
      <div className="flex items-center p-1 bg-[#1a1a2e] border border-white/10 rounded-xl mb-4 text-xs font-semibold">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-2 rounded-lg transition-all text-center ${
            filter === "all"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          All ({transactions.length})
        </button>
        <button
          onClick={() => setFilter("income")}
          className={`flex-1 py-2 rounded-lg transition-all text-center ${
            filter === "income"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Income ({transactions.filter((t) => t.type === "income").length})
        </button>
        <button
          onClick={() => setFilter("expense")}
          className={`flex-1 py-2 rounded-lg transition-all text-center ${
            filter === "expense"
              ? "bg-rose-600 text-white shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Expense ({transactions.filter((t) => t.type === "expense").length})
        </button>
      </div>

      {/* 5. Transaction List */}
      <div className="flex-1 space-y-3">
        {txLoading ? (
          <div className="space-y-3 py-2">
            <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
            <div className="h-20 rounded-2xl bg-[#1a1a2e] animate-pulse" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="bg-[#1a1a2e]/50 border border-white/5 rounded-3xl p-8 text-center my-6 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 mb-3">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300 mb-1">
              {filter === "all"
                ? `No transactions in ${formatMonthDisplay(selectedMonth)}`
                : `No ${filter} transactions in ${formatMonthDisplay(selectedMonth)}`}
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              Transactions logged manually or automatically from bookings will appear here.
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isIncome = tx.type === "income";
            return (
              <div
                key={tx._id}
                className={`bg-[#1a1a2e] rounded-2xl p-4 border border-white/10 shadow-sm relative overflow-hidden transition-all hover:border-white/20 ${
                  isIncome ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-500"
                }`}
              >
                {/* Top Row: Date, Source Tag, Amount */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      {formatDateNice(tx.transactionDate || tx.createdAt)}
                    </span>
                    {tx.source === "booking" && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                        Booking
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-base font-black tracking-tight ${
                      isIncome ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>

                {/* Middle Row: Note */}
                <p className="text-sm text-slate-200 mb-2.5 break-words font-medium">
                  {tx.note || <span className="text-slate-500 italic text-xs">No note</span>}
                </p>

                {/* Bottom Row: Payment method pill + createdBy */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    {tx.paymentMethod === "cash" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        <Banknote className="w-3 h-3" />
                        Cash
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                        <Building2 className="w-3 h-3" />
                        Bank
                      </span>
                    )}
                  </div>

                  <span className="text-slate-500 font-medium">
                    Added by {tx.createdBy?.username || "Owner"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Floating Action Button (FAB) */}
      <button
        onClick={handleOpenModal}
        className="fixed bottom-24 right-6 z-40 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 active:scale-95 transition-all flex items-center gap-2 font-semibold text-sm border border-indigo-400/30 backdrop-blur"
        aria-label="Add Transaction"
      >
        <Plus className="w-5 h-5" />
        <span className="hidden sm:inline">Add Entry</span>
      </button>

      {/* 7. Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-[#16162a] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h2 id="modal-title" className="text-lg font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                Add Transaction
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Type Selector: Income / Expense */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType("income")}
                    className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                      formType === "income"
                        ? "bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/25"
                        : "bg-[#1f1f38] text-slate-400 border-white/5 hover:text-white"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("expense")}
                    className={`py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                      formType === "expense"
                        ? "bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25"
                        : "bg-[#1f1f38] text-slate-400 border-white/5 hover:text-white"
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    Expense
                  </button>
                </div>
              </div>

              {/* Payment Method Selector: Cash / Bank */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod("cash")}
                    className={`py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all border ${
                      formPaymentMethod === "cash"
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                        : "bg-[#1f1f38] text-slate-400 border-white/5 hover:text-white"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod("bank")}
                    className={`py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all border ${
                      formPaymentMethod === "bank"
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                        : "bg-[#1f1f38] text-slate-400 border-white/5 hover:text-white"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Bank
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#121224] border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white font-semibold placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Transaction Date (Supports backdating) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  required
                  max={todayStr}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-[#121224] border border-white/10 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Note / Description
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Fuel, Maintenance, Advance"
                  maxLength={120}
                  className="w-full bg-[#121224] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl btn-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Entry"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
