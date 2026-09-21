"use client";

import React, { useEffect, useState } from "react";
import { Share, PlusSquare, X } from "lucide-react";
import Image from "next/image";

export default function IOSInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only execute on browser
    if (typeof window === "undefined") return;

    const userAgent = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
    const isStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    // Only show if user is on iOS Safari and NOT already in standalone (PWA) mode
    if (!isIOS || !isSafari || isStandalone) {
      return;
    }

    // Check dismissal history
    const dismissedAt = localStorage.getItem("renteasy_ios_install_dismissed");
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    setShowBanner(true);
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("renteasy_ios_install_dismissed", Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-24 max-w-[420px] w-[calc(100%-2rem)] left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="p-4 rounded-2xl bg-[#16162a]/95 border border-indigo-500/30 shadow-[0_16px_48px_rgba(0,0,0,0.8),0_0_24px_rgba(99,102,241,0.2)] backdrop-blur-2xl text-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border border-white/10 shadow-sm shrink-0 overflow-hidden flex items-center justify-center">
              <Image
                src="/icons/apple-touch-icon.png"
                alt="RentEasy App"
                width={36}
                height={36}
                className="rounded-lg object-contain"
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Install on iPhone / iPad</h4>
              <p className="text-xs text-slate-400">Add to your Home Screen for app experience</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss iOS install banner"
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 flex items-center justify-center transition-all -mr-1 -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-indigo-500/30">
              1
            </span>
            <span className="flex items-center gap-1.5">
              Tap the <Share className="w-3.5 h-3.5 text-indigo-400 inline shrink-0" /> Share button in Safari's toolbar
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-indigo-500/30">
              2
            </span>
            <span className="flex items-center gap-1.5">
              Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-indigo-400 inline shrink-0" /> <span className="font-semibold text-white">Add to Home Screen</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
