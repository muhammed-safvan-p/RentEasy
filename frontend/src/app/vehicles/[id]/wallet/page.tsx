"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, AlertCircle } from "lucide-react";
import useSWR from "swr";
import { useVehicleDetail, useVehicleWallet, invalidateVehicleData } from "@/hooks/useVehicleData";
import { fetcher, api, ApiError } from "@/lib/api";
import {
  formatCurrency,
  formatDateNice,
  formatFullDateTime,
  formatMonthDisplay,
  formatMonthParam,
  getLocalTodayDateString,
  toSafeDateISOString,
} from "@/lib/formatters";
import { WalletTransaction } from "@/types/wallet";
import { WalletSummaryCards } from "@/components/wallet/WalletSummaryCards";
import { WalletMonthHeader } from "@/components/wallet/WalletMonthHeader";
import { TransactionList } from "@/components/wallet/TransactionList";
import { AddTransactionModal } from "@/components/wallet/AddTransactionModal";
import { TransactionDetailModal } from "@/components/wallet/TransactionDetailModal";

export default function VehicleWalletPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

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

  // Centralized SWR hooks
  const { vehicle, isLoading: vehicleLoading, error: vehicleError } = useVehicleDetail(id);
  const { wallet, isLoading: walletLoading, error: walletError } = useVehicleWallet(id);

  const monthParam = formatMonthParam(selectedMonth);
  const txKey = id ? `/api/vehicles/${id}/wallet/transactions?month=${monthParam}` : null;
  const {
    data: txData,
    error: txError,
    isLoading: txLoading,
  } = useSWR<{
    transactions?: WalletTransaction[];
    monthIncome?: number;
    monthExpense?: number;
  }>(txKey, fetcher);

  const transactions = useMemo(() => txData?.transactions || [], [txData]);
  const monthIncome = txData?.monthIncome || 0;
  const monthExpense = txData?.monthExpense || 0;

  const anyError = vehicleError || walletError || txError;
  const errorStatus = anyError ? ((anyError as ApiError).status || 500) : null;
  const errorMessage = anyError
    ? (anyError as ApiError).status === 403
      ? "You do not have permission to view this vehicle's wallet."
      : (anyError as ApiError).status === 404
      ? "Vehicle or wallet not found."
      : anyError.message || "An unexpected error occurred"
    : "";

  // Auth redirect if 401
  useEffect(() => {
    if (anyError && (anyError as ApiError).status === 401) {
      router.push("/login");
    }
  }, [anyError, router]);

  const loading = vehicleLoading || walletLoading || (txLoading && !txData);

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Helper to sort transactions descending (newest on top)
  const sortTransactionsDesc = (a: WalletTransaction, b: WalletTransaction) => {
    // 1. Compare calendar day (YYYY-MM-DD) descending
    const dayA = (a.transactionDate || a.createdAt || "").split("T")[0];
    const dayB = (b.transactionDate || b.createdAt || "").split("T")[0];
    if (dayA && dayB && dayA !== dayB) {
      return dayB.localeCompare(dayA);
    }

    // 2. On the same day, compare createdAt timestamp if present (most recently recorded first)
    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (createdA && createdB && createdA !== createdB) {
      return createdB - createdA;
    }

    // 3. Compare transactionDate timestamp
    const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
    const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
    if (dateA !== dateB) {
      return dateB - dateA;
    }

    // 4. Fallback to MongoDB _id timestamp
    return (b._id || "").localeCompare(a._id || "");
  };

  const filteredTransactions = useMemo(() => {
    const list = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);
    return [...list].sort(sortTransactionsDesc);
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

      // Sort transactions within this day group with newest on top
      const sortedDayTxs = [...groups[key]].sort(sortTransactionsDesc);

      return {
        dateKey: key,
        dateLabel,
        transactions: sortedDayTxs,
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
      await api.delete(`/api/vehicles/${id}/wallet/transactions/${txId}`);
      setSelectedTx(null);
      await invalidateVehicleData(id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting transaction");
    } finally {
      setDeletingTx(false);
    }
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedTx(null);
  }, []);

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

    // If user selected today's date, use current timestamp so new entries sort accurately at the top of today
    const isToday = formDate === todayStr;
    const computedTxDate = isToday ? new Date().toISOString() : toSafeDateISOString(formDate);

    try {
      await api.post(`/api/vehicles/${id}/wallet/transactions`, {
        type: formType,
        paymentMethod: formPaymentMethod,
        amount: parsedAmount,
        note: formNote.trim(),
        transactionDate: computedTxDate,
      });

      setIsModalOpen(false);
      await invalidateVehicleData(id);
    } catch (err: unknown) {
      if ((err as ApiError).status === 401) {
        router.push("/login");
        return;
      }
      setFormError(err instanceof Error ? err.message : "Failed to add transaction");
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
        onClose={handleCloseModal}
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
        onClose={handleCloseDetailModal}
        onDelete={handleDeleteTransaction}
      />
    </div>
  );
}
