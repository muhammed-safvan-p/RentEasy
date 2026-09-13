"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User as UserIcon, Shield, Calendar, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

interface UserProfile {
  _id: string;
  username: string;
  role: string;
  isBlock: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  
  // Profile State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);



  useEffect(() => {
    const fetchUser = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
        const res = await fetch(`${baseUrl}/api/user/me`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error("Failed to load profile");
        }
        const data = await res.json();
        setUser(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Validation
    if (newPassword.length < 6 || newPassword.length > 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be between 6 and 8 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setPasswordUpdating(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
      const res = await fetch(`${baseUrl}/api/user/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword, confirmPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update password");

      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message });
    } finally {
      setPasswordUpdating(false);
    }
  };

  const isPasswordValid = newPassword.length >= 6 && newPassword.length <= 8 && newPassword === confirmPassword;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <Link href="/dashboard" className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-10">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 sticky top-0 z-20 bg-[#0b0b18]/90 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">Profile Settings</h1>
        </div>
      </header>

      <div className="flex-1 px-6 flex flex-col gap-6">
        
        {/* Profile Card */}
        <div className="bg-[#1a1a2e] rounded-3xl p-6 border border-white/5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 blur-[50px] rounded-full -mr-10 -mt-10 pointer-events-none" />
          
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[3px] mb-4 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full rounded-full bg-[#12121f] flex items-center justify-center text-3xl font-bold text-white uppercase">
                {user?.username.charAt(0)}
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-1">{user?.username}</h2>
            
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                {user?.role}
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${
                user?.isBlock 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {user?.isBlock ? 'Blocked' : 'Active'}
              </div>
            </div>

            <div className="w-full h-px bg-white/5 my-6" />

            <div className="w-full flex justify-between items-center bg-[#0f0f20] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3 text-slate-400">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-medium">Member Since</span>
              </div>
              <span className="text-sm font-semibold text-white">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Update Password Card */}
        <div className="bg-[#1a1a2e] rounded-3xl p-6 border border-white/5 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6">Update Password</h3>
          
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                New Password
              </label>
              <div className="relative">
                <input 
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#0f0f20] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  placeholder="6-8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <p className={`text-xs ml-1 flex items-center gap-1 mt-1 ${
                  newPassword.length >= 6 && newPassword.length <= 8 
                    ? 'text-emerald-400' 
                    : 'text-amber-400'
                }`}>
                  {newPassword.length >= 6 && newPassword.length <= 8 ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {newPassword.length < 6 ? 'Password is too short (min 6)' : newPassword.length > 8 ? 'Password is too long (max 8)' : 'Valid length (6-8 chars)'}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0f0f20] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  placeholder="Repeat new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs ml-1 flex items-center gap-1 mt-1 ${
                  newPassword === confirmPassword
                    ? 'text-emerald-400' 
                    : 'text-rose-400'
                }`}>
                  {newPassword === confirmPassword ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            {/* Messages */}
            {passwordMessage && (
              <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-sm ${
                passwordMessage.type === 'error' 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {passwordMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span className="font-medium leading-tight">{passwordMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordUpdating || !isPasswordValid || !newPassword}
              className="w-full btn-primary rounded-xl py-3.5 text-sm font-semibold flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
