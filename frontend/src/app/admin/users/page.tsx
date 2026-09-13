"use client";

import { useEffect, useState, useCallback } from "react";
import { User, Search, RefreshCw, ShieldAlert, Shield } from "lucide-react";

interface UserData {
  _id: string;
  username: string;
  role: string;
  isBlock: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleBlock = async (user: UserData) => {
    setToggling(user._id);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/admin/users/${user._id}/block`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to toggle block status");
      }
      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isBlock: data.isBlock } : u))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  };

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Users</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {users.length} user{users.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 text-rose-600 text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Joined On
                </th>
                <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100" />
                        <div className="h-4 w-32 bg-slate-100 rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-6 w-24 bg-slate-100 rounded-full mx-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-400">
                    <User className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="font-medium text-slate-500">No users found</p>
                    <p className="text-sm mt-1">
                      {search ? "Try a different search term." : "No users are registered yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Username */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-800">{user.username}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                          user.role === "admin"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {user.role === "admin" ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        {user.role}
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    {/* Toggle Block Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleToggleBlock(user)}
                          disabled={toggling === user._id || user.role === "admin"}
                          title={
                            user.role === "admin"
                              ? "Cannot block an admin"
                              : user.isBlock
                              ? "Click to unblock"
                              : "Click to block"
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            user.isBlock ? "bg-rose-500 focus:ring-rose-500" : "bg-emerald-500 focus:ring-emerald-500"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              user.isBlock ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span
                          className={`ml-2.5 text-xs font-medium w-16 ${
                            user.isBlock ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {user.isBlock ? "Blocked" : "Active"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>
    </div>
  );
}
