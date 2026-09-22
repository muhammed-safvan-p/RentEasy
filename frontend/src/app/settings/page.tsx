"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Copy, LogOut, Loader2 } from "lucide-react";
import { api, clearAuthToken } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function SettingsPage() {
  const router = useRouter();
  
  // Copy State
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Logout Modal State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Auth Check State
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/api/user/me");
      } catch (err: unknown) {
        logger.error("Auth check failed", err);
        router.replace("/login");
        return;
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleCopy = async (text: string, type: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
    } catch (err: unknown) {
      logger.error("Failed to copy", err);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.post("/api/auth/logout");
      // Clear client session token (localStorage + cookie)
      clearAuthToken();
      router.replace("/login");
      router.refresh();
    } catch (error: unknown) {
      logger.error("Logout failed", error);
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 sticky top-0 z-20 bg-[#0b0b18]/90 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
        </div>
      </header>

      <div className="flex-1 px-6 flex flex-col gap-6">
        
        {/* Contact Developer Card */}
        <div className="bg-[#1a1a2e] rounded-3xl p-6 border border-white/5 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-2">Contact Developer</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            For any trouble, help or any suggestions, feel free to reach out to the developer.
          </p>
          <div className="bg-[#0f0f20] rounded-xl p-4 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Name</span>
              <span className="text-sm font-medium text-white">Muhammed safvan p</span>
            </div>
            <div className="w-full h-px bg-white/5 my-2" />
            <div 
              className="flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" 
              onClick={() => handleCopy('muhammedsafvanp96@gmail.com', 'email')}
            >
              <span className="text-sm text-slate-500">Email</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate max-w-[150px] sm:max-w-none">muhammedsafvanp96@gmail.com</span>
                {copiedEmail ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold animate-in zoom-in duration-200">
                    Copied! <CheckCircle2 className="w-4 h-4 shrink-0" />
                  </span>
                ) : (
                  <Copy className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
              </div>
            </div>
            <div className="w-full h-px bg-white/5 my-2" />
            <div 
              className="flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform" 
              onClick={() => handleCopy('9496432072', 'phone')}
            >
              <span className="text-sm text-slate-500">Phone</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">9496432072</span>
                {copiedPhone ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold animate-in zoom-in duration-200">
                    Copied! <CheckCircle2 className="w-4 h-4 shrink-0" />
                  </span>
                ) : (
                  <Copy className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings / Danger Zone */}
        <div className="bg-[#1a1a2e] rounded-3xl p-6 border border-white/5 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6">Account</h3>
          
          {!showLogoutConfirm ? (
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl py-3.5 text-sm font-semibold flex justify-center items-center gap-2 transition-colors active:bg-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          ) : (
            <div className="bg-[#0f0f20] border border-rose-500/20 rounded-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="text-sm text-slate-300 font-medium text-center mb-5">
                Are you sure you want to log out?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={isLoggingOut}
                  className="flex-1 btn-ghost rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 bg-rose-500 text-white rounded-xl py-2.5 text-sm font-semibold active:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? "Logging out..." : "Yes, Logout"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
