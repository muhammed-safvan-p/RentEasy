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
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Receipt,
  Scale,
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

  // Details Modal State
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState(false);

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

  const formatTimeNice = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatFullDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
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

  // Grouped transactions by date (descending)
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: WalletTransaction[] } = {};

    for (const tx of filteredTransactions) {
      const raw = (tx.transactionDate || tx.createdAt || "").split("T")[0] || "Unknown";
      if (!groups[raw]) {
        groups[raw] = [];
      }
      groups[raw].push(tx);
    }

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    
    const yDate = new Date(now);
    yDate.setDate(now.getDate() - 1);
    const yesterdayStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, "0")}-${String(yDate.getDate()).padStart(2, "0")}`;

    return sortedKeys.map((key) => {
      let dateLabel = key;
      if (key === todayStr) {
        dateLabel = "Today";
      } else if (key === yesterdayStr) {
        dateLabel = "Yesterday";
      } else if (key !== "Unknown") {
        const d = new Date(key + "T00:00:00");
        dateLabel = d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }

      return {
        dateKey: key,
        dateLabel,
        transactions: groups[key],
      };
    });
  }, [filteredTransactions]);

  // Delete transaction handler (for manual entries)
  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm("Are you sure you want to delete this transaction? This will automatically update the wallet balances.")) {
      return;
    }

    setDeletingTx(true);
    try {
      const res = await fetch(`${baseUrl}/api/vehicles/${id}/wallet/transactions/${txId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete transaction");
      }

      setSelectedTx(null);

      // Re-fetch overall balance & current view transactions
      const monthParam = formatMonthParam(selectedMonth);
      const [walletRes, txRes] = await Promise.all([
        fetch(`${baseUrl}/api/vehicles/${id}/wallet`, { credentials: "include" }),
        fetch(
          `${baseUrl}/api/vehicles/${id}/wallet/transactions?month=${monthParam}`,
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
      alert(err instanceof Error ? err.message : "Error deleting transaction");
    } finally {
      setDeletingTx(false);
    }
  };

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

      {/* 3. Month Summary: Income, Expense, Net Flow */}
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

        <div className={`rounded-2xl p-3 border flex flex-col justify-between shadow-sm ${
          (monthIncome - monthExpense) >= 0 
            ? "bg-indigo-500/10 border-indigo-500/20"
            : "bg-amber-500/10 border-amber-500/20"
        }`}>
          <div className={`flex items-center gap-1.5 text-xs mb-1 ${
            (monthIncome - monthExpense) >= 0 ? "text-indigo-400" : "text-amber-400"
          }`}>
            <Scale className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">Balance</span>
          </div>
          <p className={`text-sm sm:text-base font-black truncate ${
            (monthIncome - monthExpense) >= 0 ? "text-indigo-300" : "text-amber-400"
          }`}>
            {(monthIncome - monthExpense) >= 0 ? "+" : ""}
            {formatCurrency(monthIncome - monthExpense)}
          </p>
        </div>
      </div>

      {/* 4. Filter Tabs */}
      <div className="flex items-center p-1 bg-[#1a1a2e] border border-white/10 rounded-2xl mb-4 text-xs font-semibold shadow-md">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            filter === "all"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>All</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            filter === "all" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
          }`}>
            {transactions.length}
          </span>
        </button>
        <button
          onClick={() => setFilter("income")}
          className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            filter === "income"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Income</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            filter === "income" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
          }`}>
            {transactions.filter((t) => t.type === "income").length}
          </span>
        </button>
        <button
          onClick={() => setFilter("expense")}
          className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            filter === "expense"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span>Expense</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            filter === "expense" ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
          }`}>
            {transactions.filter((t) => t.type === "expense").length}
          </span>
        </button>
      </div>

      {/* 5. Transaction List (Grouped by Date) */}
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
              onClick={handleOpenModal}
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
                  const displayNote = tx.note || (isIncome ? "Income Received" : "Expense Recorded");

                  return (
                    <div
                      key={tx._id}
                      onClick={() => setSelectedTx(tx)}
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

                            <span>•</span>
                            <span className="text-slate-500">
                              {formatTimeNice(tx.transactionDate || tx.createdAt)}
                            </span>

                            <span>•</span>
                            <span className="text-slate-400 truncate">
                              Recorded by - <span className="text-slate-200 font-semibold">{tx.createdBy?.username || "Owner"}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Indicator */}
                      <div className="flex items-center gap-2 text-right shrink-0">
                        <span
                          className={`text-base font-black tracking-tight ${
                            isIncome ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
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

      {/* 8. Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-[#16162a] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tx-modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <span id="tx-modal-title" className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-indigo-400" />
                Transaction Details
              </span>
              <button
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Amount Hero */}
            <div className="text-center py-4 bg-black/25 rounded-2xl border border-white/5 mb-4">
              <span
                className={`text-3xl font-black tracking-tight ${
                  selectedTx.type === "income" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {selectedTx.type === "income" ? "+" : "-"}
                {formatCurrency(selectedTx.amount)}
              </span>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold">
                <span
                  className={`px-2.5 py-0.5 rounded-full font-medium ${
                    selectedTx.type === "income"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                      : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                  }`}
                >
                  {selectedTx.type === "income" ? "Income" : "Expense"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 uppercase text-[10px] font-medium">
                  {selectedTx.paymentMethod}
                </span>
              </div>
            </div>

            {/* Metadata Rows */}
            <div className="space-y-2.5 text-xs mb-6">
              <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
                <span className="text-slate-400">Description / Note</span>
                <span className="font-semibold text-white max-w-[200px] text-right truncate">
                  {selectedTx.note || "No note recorded"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
                <span className="text-slate-400">Date & Time</span>
                <span className="font-semibold text-slate-200">
                  {formatFullDateTime(selectedTx.transactionDate || selectedTx.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
                <span className="text-slate-400">Recorded By</span>
                <span className="font-semibold text-slate-200">
                  {selectedTx.createdBy?.username || "Vehicle Owner"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5">
                <span className="text-slate-400">Origin / Source</span>
                <span className="font-semibold text-slate-200">
                  {selectedTx.source === "booking" ? "Automatic Booking" : "Manual Entry"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold text-xs transition-colors"
              >
                Close
              </button>

              {/* Allow delete for manual entries */}
              {selectedTx.source === "manual" && (
                <button
                  type="button"
                  onClick={() => handleDeleteTransaction(selectedTx._id)}
                  disabled={deletingTx}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {deletingTx ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete Entry</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
