"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function validateUsername(value: string): string {
  if (!value) return "";
  if (!/^[a-zA-Z]+$/.test(value)) return "Username must contain letters only — no numbers or symbols";
  if (value.length < 4) return `Username too short — ${4 - value.length} more character${4 - value.length > 1 ? "s" : ""} needed`;
  return "";
}

function validatePassword(value: string): string {
  if (!value) return "";
  if (value.length < 6) return `Password too short — ${6 - value.length} more character${6 - value.length > 1 ? "s" : ""} needed`;
  if (value.length > 8) return "Password must be 8 characters or less";
  return "";
}

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    setUsernameError(validateUsername(val));
    setServerError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordError(validatePassword(val));
    setServerError("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const uErr = validateUsername(username);
    const pErr = validatePassword(password);
    setUsernameError(uErr);
    setPasswordError(pErr);
    if (uErr || pErr) return;

    setServerError("");
    setLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
      const res = await fetch(`${baseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to sign up");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = username && password && !usernameError && !passwordError;

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0b0b18] to-[#0b0b18] -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-indigo-500/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-white mb-2">
          RentEasy
        </h2>
        <p className="text-center text-sm text-slate-400 mb-8">
          Create your account to start renting vehicles
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-sm bg-[#12121f]/80 p-8 rounded-3xl shadow-xl border border-white/5 backdrop-blur-xl relative z-10">
        <form className="space-y-5" onSubmit={handleSignup}>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-300">
              Username
            </label>
            <div className="mt-2">
              <input
                id="signup-username"
                type="text"
                required
                value={username}
                onChange={handleUsernameChange}
                className={`block w-full rounded-xl border-0 bg-[#0f0f20] py-3 px-4 text-white shadow-sm ring-1 ring-inset placeholder:text-slate-500 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-all ${
                  usernameError
                    ? "ring-rose-500/70 focus:ring-rose-500"
                    : username && !usernameError
                    ? "ring-emerald-500/50 focus:ring-emerald-500"
                    : "ring-white/10 focus:ring-indigo-500"
                }`}
                placeholder="Letters only, e.g. John"
              />
            </div>
            {usernameError && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                <svg className="shrink-0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {usernameError}
              </p>
            )}
            {username && !usernameError && (
              <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
                <svg className="shrink-0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Looks good!
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium leading-6 text-slate-300">
              Password
            </label>
            <div className="mt-2 relative">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={handlePasswordChange}
                className={`block w-full rounded-xl border-0 bg-[#0f0f20] py-3 px-4 pr-10 text-white shadow-sm ring-1 ring-inset placeholder:text-slate-500 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 transition-all ${
                  passwordError
                    ? "ring-rose-500/70 focus:ring-rose-500"
                    : password && !passwordError
                    ? "ring-emerald-500/50 focus:ring-emerald-500"
                    : "ring-white/10 focus:ring-indigo-500"
                }`}
                placeholder="6–8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.579 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
                    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
                    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
                    <path d="m2 2 20 20"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Password strength bar */}
            {password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i < password.length
                          ? password.length < 6
                            ? "bg-rose-500"
                            : password.length <= 8
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-500">{password.length}/8 characters</p>
              </div>
            )}

            {passwordError && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                <svg className="shrink-0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {passwordError}
              </p>
            )}
            {password && !passwordError && (
              <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
                <svg className="shrink-0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Password strength is good
              </p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
              <svg className="shrink-0 text-rose-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-rose-400 text-sm">{serverError}</p>
            </div>
          )}

          <div className="pt-1">
            <button
              id="signup-submit"
              type="submit"
              disabled={loading || !isFormValid}
              className="flex w-full justify-center rounded-xl btn-primary px-3 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Creating account...
                </span>
              ) : "Create Account"}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
