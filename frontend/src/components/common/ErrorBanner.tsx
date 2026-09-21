"use client";

import React from "react";
import { AlertCircle, X, RefreshCw } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  onRetry,
  retryLabel = "Try Again",
  className = "mb-4",
}) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-xs ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
        <p className="font-medium text-slate-800 dark:text-rose-200 break-words">{message}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-200 text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{retryLabel}</span>
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="w-6 h-6 rounded-lg hover:bg-rose-200/60 dark:hover:bg-rose-500/20 text-slate-500 dark:text-rose-400 hover:text-slate-800 dark:hover:text-rose-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
