"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, AlertCircle } from "lucide-react";
import { invalidateVehicleData } from "@/hooks/useVehicleData";
import { API_BASE_URL as baseUrl } from "@/lib/api";
import {
  formatCurrency,
  formatDateNice,
  formatFullDateTime,
  formatMonthDisplay,
  formatMonthParam,
  getLocalTodayDateString,
  toSafeDateISOString,
} from "@/lib/formatters";
import { WalletData, WalletTransaction } from "@/types/wallet";
import { WalletSummaryCards } from "@/components/wallet/WalletSummaryCards";
import { WalletMonthHeader } from "@/components/wallet/WalletMonthHeader";
import { TransactionList } from "@/components/wallet/TransactionList";
import { AddTransactionModal } from "@/components/wallet/AddTransactionModal";
import { TransactionDetailModal } from "@/components/wallet/TransactionDetailModal";

interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
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

  // Add Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [formPaymentMethod, setFormPaymentMethod] = useState<"cash" | "bank">("cash");
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDate, setFormDate] = useState(() => getLocalTodayDateString());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const todayStr = useMemo(() => getLocalTodayDateString(), []);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return (
      selectedMonth.getFullYear() === now.getFullYear() &&
      selectedMonth.getMonth() === now.getMonth()
    );
  }, [selectedMonth]);

  // Fetch initial data
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
  }, [id, router]);

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
    [id, router]
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

  const filteredTransactions = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((t) => t.type === filter);
  }, [transactions, filter]);

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

    return sortedKeys.map((key) => {
      const parts = key.split("-");
      let dateLabel = key;
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        dateLabel = d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
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

  const handleDeleteTransaction = async (txId: string) => {
    if (!txId || deletingTx) return;
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
      await invalidateVehicleData(id);

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

  const handleOpenModal = () => {
    setFormType("income");
    setFormPaymentMethod("cash");
    setFormAmount("");
    setFormNote("");
    setFormDate(getLocalTodayDateString());
    setFormError("");
    setIsModalOpen(true);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
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
          transactionDate: toSafeDateISOString(formDate),
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

      setIsModalOpen(false);
      await invalidateVehicleData(id);

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

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen px-4 sm:px-6 pt-6 pb-28 space-y-6 max-w-lg mx-auto w-full animate-pulse">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-[#1a1a2e]" />
          <div className="w-32 h-6 rounded-lg bg-[#1a1a2e]" />
          <div className="w-10 h-10" />
        </div>
        <div className="h-44 rounded-3xl bg-[#1a1a2e]" />
        <div className="h-12 rounded-2xl bg-[#1a1a2e]" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-2xl bg-[#1a1a2e]" />
          <div className="h-20 rounded-2xl bg-[#1a1a2e]" />
        </div>
        <div className="h-10 rounded-xl bg-[#1a1a2e]" />
        <div className="space-y-3">
          <div className="h-20 rounded-2xl bg-[#1a1a2e]" />
          <div className="h-20 rounded-2xl bg-[#1a1a2e]" />
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
      <WalletSummaryCards wallet={wallet} formatCurrency={formatCurrency} />

      {/* 2. Month Navigator & Summary Metrics */}
      <WalletMonthHeader
        selectedMonth={selectedMonth}
        isCurrentMonth={isCurrentMonth}
        monthIncome={monthIncome}
        monthExpense={monthExpense}
        formatCurrency={formatCurrency}
        formatMonthDisplay={formatMonthDisplay}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onOpenAddModal={handleOpenModal}
      />

      {/* 3. Transaction List */}
      <TransactionList
        filter={filter}
        transactions={transactions}
        groupedTransactions={groupedTransactions}
        txLoading={txLoading}
        selectedMonth={selectedMonth}
        formatCurrency={formatCurrency}
        formatDateNice={formatDateNice}
        formatMonthDisplay={formatMonthDisplay}
        onFilterChange={setFilter}
        onSelectTx={setSelectedTx}
        onOpenAddModal={handleOpenModal}
      />

      {/* 4. Modals */}
      <AddTransactionModal
        isOpen={isModalOpen}
        formType={formType}
        formPaymentMethod={formPaymentMethod}
        formAmount={formAmount}
        formNote={formNote}
        formDate={formDate}
        formError={formError}
        submitting={submitting}
        todayStr={todayStr}
        onClose={() => setIsModalOpen(false)}
        onFormTypeChange={setFormType}
        onPaymentMethodChange={setFormPaymentMethod}
        onAmountChange={setFormAmount}
        onNoteChange={setFormNote}
        onDateChange={setFormDate}
        onSubmit={handleAddTransaction}
      />

      <TransactionDetailModal
        selectedTx={selectedTx}
        deletingTx={deletingTx}
        formatCurrency={formatCurrency}
        formatFullDateTime={formatFullDateTime}
        onClose={() => setSelectedTx(null)}
        onDelete={handleDeleteTransaction}
      />
    </div>
  );
}
