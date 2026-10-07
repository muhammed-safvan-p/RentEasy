"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { RefreshCw, LayoutDashboard, Car, Users, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {error && (
        <ErrorBanner
          message={error}
          onRetry={fetchDashboard}
          onDismiss={() => setError("")}
        />
      )}

      {/* Main Welcome Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 lg:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                Admin Overview
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">RentEasy Administration & Fleet Management</p>
            </div>
          </div>

          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 py-2 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-2/3"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-700 text-sm font-medium flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Quick Navigation Cards on Mobile & Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Vehicles Card */}
          <Link
            href="/admin/vehicles"
            className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-white border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all group flex items-start justify-between"
          >
            <div className="space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/20">
                <Car className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                Fleet & Vehicles
              </h3>
              <p className="text-xs text-slate-500">
                Manage registered cars, live status, co-owners, and ledger balances
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all mt-1" />
          </Link>

          {/* Users Card */}
          <Link
            href="/admin/users"
            className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 to-white border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group flex items-start justify-between"
          >
            <div className="space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-600/20">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition-colors">
                User Management
              </h3>
              <p className="text-xs text-slate-500">
                Review system accounts, set permissions, toggle access, and reset passwords
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all mt-1" />
          </Link>
        </div>

        {/* Guidance Notice */}
        <div className="p-4 sm:p-5 bg-indigo-50/70 rounded-2xl border border-indigo-100/80 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-indigo-950 font-bold text-xs sm:text-sm">Administrative Authority</h4>
            <p className="text-indigo-900/80 text-xs leading-relaxed mt-0.5">
              You are signed in with administrative access. Changes made across fleet assets and user privileges take effect immediately across all client applications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
