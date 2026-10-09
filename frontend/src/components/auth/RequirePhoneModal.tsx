"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Phone, ShieldCheck, AlertCircle, Loader2, Zap, LogOut } from "lucide-react";
import { useCurrentUser } from "@/hooks/useVehicleData";
import { api, apiRequest, clearAuthToken } from "@/lib/api";
import { validatePhoneNumber, normalizePhoneNumber } from "@/lib/phoneValidation";
import { useActionColdStart } from "@/lib/serverStatus";

export default function RequirePhoneModal() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, revalidate } = useCurrentUser();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { isSlow, seconds } = useActionColdStart(submitting);

  // Do not show on auth pages or when user is loading/unauthenticated
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (isAuthPage || isLoading || !user) {
    return null;
  }

  // If user already has a phone, do not show
  if (user.phone && user.phone.trim() !== "") {
    return null;
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validatePhoneNumber(phone);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const normalized = normalizePhoneNumber(phone);
      const res = await apiRequest<{ message: string; user?: { phone: string } }>("/api/users/me/phone", {
        method: "PATCH",
        body: JSON.stringify({ phone: normalized }),
      });

      // Optimistically update SWR cache with updated phone so modal unmounts instantly
      if (res?.user) {
        await revalidate({ ...user, ...res.user }, false);
      }
      await revalidate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save phone number";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // ignore
    } finally {
      clearAuthToken();
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-modal-title"
    >
      <div className="w-full max-w-md bg-[#131326] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/15 blur-[45px] rounded-full -mr-10 -mt-10 pointer-events-none" />

        {/* Icon & Heading */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
            <Phone className="w-7 h-7" />
          </div>
          <div>
            <h2 id="phone-modal-title" className="text-xl font-bold text-white tracking-tight">
              Add Your Phone Number
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xs mx-auto">
              RentEasy requires a verified mobile number to secure vehicle bookings, send status alerts, and coordinate fleet access.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Mobile Number <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-xs font-semibold">
                +91
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoFocus
                required
                value={phone}
                onChange={handlePhoneChange}
                placeholder="10-digit mobile number"
                className={`w-full text-sm pl-12 pr-4 py-3 rounded-xl border bg-[#0b0b18] text-white placeholder-slate-500 focus:outline-none transition-all ${
                  error
                    ? "border-rose-500/70 focus:border-rose-500 ring-1 ring-rose-500/30"
                    : "border-white/10 focus:border-indigo-500 ring-1 ring-transparent focus:ring-indigo-500/20"
                }`}
                id="legacy-user-phone-input"
              />
            </div>
            {error && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Your number is only used for operational vehicle notifications.</span>
          </div>

          <button
            type="submit"
            disabled={submitting || !phone}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isSlow
                ? "bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 shadow-amber-500/25"
                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25"
            }`}
            id="legacy-user-phone-submit-btn"
          >
            {submitting ? (
              isSlow ? (
                <>
                  <Zap className="w-4 h-4 animate-bounce text-amber-300" />
                  <span>Waking Up Server... ({seconds}s)</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Number...</span>
                </>
              )
            ) : (
              <span>Save &amp; Continue to Dashboard</span>
            )}
          </button>

          {submitting && isSlow && (
            <p className="mt-1 text-center text-[10px] text-amber-300/80 leading-relaxed">
              Render free tier container is starting up. Please do not close this window.
            </p>
          )}

          <div className="pt-2 border-t border-white/5 flex items-center justify-center">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-1.5 px-3 flex items-center gap-1.5 cursor-pointer rounded-lg hover:bg-white/5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out / Switch account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
