"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  className = "mb-4",
}) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200 ${className}`}
    >
      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
      <p className="flex-1 font-medium">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="w-6 h-6 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 flex items-center justify-center transition-colors"
          aria-label="Dismiss error"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
