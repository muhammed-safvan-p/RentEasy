"use client";

import React, { useState } from "react";
import { WifiOff, RefreshCw, Car } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-6 text-center text-white">
      {/* Glow effect */}
      <div className="relative mb-6">
        <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-xl opacity-75 animate-pulse" />
        <div className="relative w-24 h-24 rounded-3xl bg-[#16162a] border border-white/10 flex items-center justify-center shadow-2xl">
          <WifiOff className="w-10 h-10 text-indigo-400" />
        </div>
      </div>

      {/* Status Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium mb-4">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        No Internet Connection
      </div>

      {/* Headings */}
      <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
        You're Currently Offline
      </h1>
      <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-8">
        RentEasy verifies real-time vehicle availability against live database records. Please check your internet connection to continue.
      </p>

      {/* Action Buttons */}
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.98] transition-all duration-200 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
          {isRetrying ? "Checking connection..." : "Try Again"}
        </button>

        <Link
          href="/dashboard"
          className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 transition-all duration-200 text-slate-300 font-medium text-sm flex items-center justify-center gap-2"
        >
          <Car className="w-4 h-4 text-slate-400" />
          Back to Garage
        </Link>
      </div>

      {/* Safety Notice */}
      <p className="text-[11px] text-slate-500 mt-10 max-w-[280px]">
        To prevent double-booking conflicts, booking creation and availability checks cannot be performed offline.
      </p>
    </div>
  );
}
