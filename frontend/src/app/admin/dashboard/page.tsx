"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { RefreshCw, LayoutDashboard } from "lucide-react";

export default function AdminDashboardPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<{ message: string }>("/api/admin/dashboard");
      setMessage(data.message || "Welcome to the Admin Portal");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data. Are you an admin?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDashboard]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {error && (
        <ErrorBanner
          message={error}
          onRetry={fetchDashboard}
          onDismiss={() => setError("")}
        />
      )}

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Admin Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">RentEasy Administration & Fleet Management</p>
            </div>
          </div>

          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            <div className="h-4 bg-slate-100 rounded w-1/3"></div>
          </div>
        ) : (
          <p className="text-base text-slate-600 font-medium">
            {message}
          </p>
        )}
        
        <div className="mt-8 p-6 bg-indigo-50/70 rounded-2xl border border-indigo-100/80">
          <h3 className="text-indigo-900 font-bold text-sm mb-1.5">Getting Started</h3>
          <p className="text-indigo-700/90 text-xs leading-relaxed">
            Use the sidebar navigation to manage user accounts, assign co-owners, monitor vehicle availability, track revenue and record payment transactions across all registered fleet assets.
          </p>
        </div>
      </div>
    </div>
  );
}
