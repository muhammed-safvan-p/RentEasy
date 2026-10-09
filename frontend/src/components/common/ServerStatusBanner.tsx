"use client";

import React from "react";
import { Zap, CheckCircle2, X, RefreshCw } from "lucide-react";
import { useServerStatus } from "@/lib/serverStatus";

export default function ServerStatusBanner() {
  const { isWakingUp, elapsedSeconds, isReady, dismiss } = useServerStatus();

  if (!isWakingUp && !isReady) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed top-4 inset-x-0 mx-auto max-w-md w-[calc(100%-2rem)] z-[99999] pointer-events-auto transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4"
    >
      {isWakingUp ? (
        <div className="relative overflow-hidden rounded-2xl bg-[#141324]/95 border border-amber-500/30 shadow-[0_8px_32px_rgba(245,158,11,0.15)] backdrop-blur-xl p-4 text-white">
          {/* Subtle background glow */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Zap className="w-5 h-5 animate-pulse text-amber-300" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  Waking Up Cloud Server
                </span>
                <span className="text-xs font-mono font-medium text-amber-200/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {elapsedSeconds}s
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Render free tier hibernates after 15m. Booting the server container typically takes ~30–50s. Please wait a moment.
              </p>

              {/* Animated Progress Bar */}
              <div className="mt-2.5 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-indigo-500 to-amber-400 rounded-full transition-all duration-500 animate-pulse"
                  style={{
                    width: `${Math.min(95, Math.max(15, elapsedSeconds * 2.5))}%`,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : isReady ? (
        <div className="relative overflow-hidden rounded-2xl bg-[#0f1f17]/95 border border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.15)] backdrop-blur-xl p-3.5 text-white animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-emerald-300 tracking-wide">
                Server Connected
              </h4>
              <p className="text-[11px] text-emerald-200/80">
                Cloud backend is awake and responding normally.
              </p>
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="text-emerald-400/70 hover:text-emerald-300 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
