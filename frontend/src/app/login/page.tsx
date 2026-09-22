"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, PhoneCall, AlertCircle, Eye, EyeOff } from "lucide-react";
import { api, setAuthToken } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wasBlockedParam = searchParams.get("blocked") === "true";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isBlockedError, setIsBlockedError] = useState(wasBlockedParam);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsBlockedError(false);
    setLoading(true);

    try {
      const data = await api.post<{ role?: string; token?: string; message?: string }>("/api/auth/login", {
        username,
        password,
      });

      // Dual-layer session token persistence (localStorage + cookie) for cross-domain and mobile support
      if (data.token) {
        setAuthToken(data.token);
      }

      if (data.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        (err as { status?: number }).status === 403
      ) {
        setIsBlockedError(true);
      }
      const message = err instanceof Error ? err.message : "An error occurred during login";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0b0b18] to-[#0b0b18] -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-indigo-500/20">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-indigo-400"
          >
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-white mb-2">RentEasy</h2>
        <p className="text-center text-sm text-slate-400 mb-8">
          Your vehicle rental management platform
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-sm bg-[#12121f]/80 p-8 rounded-3xl shadow-xl border border-white/5 backdrop-blur-xl relative z-10 space-y-6">
        {/* Dedicated Blocked User Support Banner */}
        {isBlockedError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-200">Account Blocked</h3>
                <p className="text-xs text-rose-300/90 leading-relaxed">
                  Your account has been deactivated by an administrator. Please reach out to customer
                  support to reactivate your access.
                </p>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-rose-500/20">
              <a
                href="tel:+919496432072"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-white text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-98"
              >
                <PhoneCall className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
                <span>Contact Support: +91 9496432072</span>
              </a>
            </div>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-300">Username</label>
            <div className="mt-2">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-xl border-0 bg-[#0f0f20] py-3 px-4 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-all"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-slate-300">Password</label>
            <div className="mt-2 relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border-0 bg-[#0f0f20] py-3 px-4 pr-10 text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {error && !isBlockedError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-xl btn-primary px-3 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-400">
          Not a member?{" "}
          <Link
            href="/signup"
            className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0b0b18] text-slate-400">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
