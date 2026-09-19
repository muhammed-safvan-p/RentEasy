"use client";

import React from "react";
import { Wallet, Banknote, Building2 } from "lucide-react";
import { WalletData } from "@/types/wallet";

interface WalletSummaryCardsProps {
  wallet: WalletData | null;
  formatCurrency: (amount: number) => string;
}

export const WalletSummaryCards: React.FC<WalletSummaryCardsProps> = ({
  wallet,
  formatCurrency,
}) => {
  return (
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
  );
};
