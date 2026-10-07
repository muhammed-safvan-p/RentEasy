"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  User,
  Search,
  RefreshCw,
  ShieldAlert,
  Plus,
  Edit,
  Trash2,
  Check,
  Copy,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Car,
  Calendar,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateNice } from "@/lib/formatters";
import { ErrorBanner } from "@/components/common/ErrorBanner";

interface UserData {
  _id: string;
  username: string;
  role: "user" | "admin" | string;
  isBlock: boolean;
  vehicleCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Toggle Block state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"user" | "admin">("user");
  const [addIsBlock, setAddIsBlock] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState("");

  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [editIsBlock, setEditIsBlock] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get<UserData[]>("/api/admin/users");
      setUsers(Array.isArray(data) ? data : []);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Copy helper
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle Block Status
  const handleToggleBlock = async (user: UserData) => {
    setTogglingId(user._id);
    setError("");
    try {
      const data = await api.patch<{ isBlock: boolean }>(`/api/admin/users/${user._id}/block`);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isBlock: data.isBlock } : u))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  // Add User Submission
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim() || !addPassword.trim()) {
      setAddError("Username and password are required");
      return;
    }
    setSubmittingAdd(true);
    setAddError("");

    try {
      const data = await api.post<{ user: UserData }>("/api/admin/users", {
        username: addUsername.trim(),
        password: addPassword.trim(),
        role: addRole,
        isBlock: addIsBlock,
      });
      if (data.user) {
        setUsers((prev) => [data.user, ...prev]);
      }
      setShowAddModal(false);
      setAddUsername("");
      setAddPassword("");
      setAddRole("user");
      setAddIsBlock(false);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: UserData) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword("");
    setEditRole((user.role as "user" | "admin") || "user");
    setEditIsBlock(user.isBlock);
    setEditError("");
  };

  // Edit User Submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUsername.trim()) {
      setEditError("Username cannot be empty");
      return;
    }
    setSubmittingEdit(true);
    setEditError("");

    try {
      const payload: {
        username: string;
        role: string;
        isBlock: boolean;
        password?: string;
      } = {
        username: editUsername.trim(),
        role: editRole,
        isBlock: editIsBlock,
      };

      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const updated = await api.put<UserData>(`/api/admin/users/${editingUser._id}`, payload);
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
      setEditingUser(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Delete User Submission
  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setSubmittingDelete(true);
    setDeleteError("");

    try {
      await api.delete(`/api/admin/users/${deletingUser._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== deletingUser._id));
      setDeletingUser(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setSubmittingDelete(false);
    }
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => !u.isBlock).length;
    const blocked = users.filter((u) => u.isBlock).length;
    const admins = users.filter((u) => u.role === "admin").length;
    const regular = users.filter((u) => u.role === "user").length;
    return { total, active, blocked, admins, regular };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          u.username.toLowerCase().includes(q) ||
          u._id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Role
      if (roleFilter !== "all" && u.role !== roleFilter) return false;

      // Status
      if (statusFilter === "active" && u.isBlock) return false;
      if (statusFilter === "blocked" && !u.isBlock) return false;

      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            User Management
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage system administrators, fleet owners, access permissions, and authentication credentials
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={() => {
              setRefreshing(true);
              setError("");
              fetchUsers();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            onClick={() => {
              setShowAddModal(true);
              setAddError("");
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip: 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Accounts</p>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{metrics.total}</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
              {metrics.regular} users • {metrics.admins} admins
            </p>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Active Accounts</p>
            <h4 className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">{metrics.active}</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Authorized for login</p>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Blocked Users */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Blocked</p>
            <h4 className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5 sm:mt-1">{metrics.blocked}</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Restricted from system</p>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <UserX className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Admin Roles */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Admins</p>
            <h4 className="text-xl sm:text-2xl font-black text-purple-700 mt-0.5 sm:mt-1">{metrics.admins}</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">Full root privilege</p>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar: Fluid on Mobile */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by username or user ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all font-medium text-slate-800"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {["all", "user", "admin"].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  roleFilter === role
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {role === "all" ? "All" : role === "user" ? "Users" : "Admins"}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {["all", "active", "blocked"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  statusFilter === status
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {status === "all" ? "All" : status === "active" ? "Active" : "Blocked"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Container Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {error && (
          <div className="p-4 bg-slate-50/50 border-b border-slate-200/80">
            <ErrorBanner
              message={error}
              onRetry={() => {
                setLoading(true);
                setError("");
                fetchUsers();
              }}
              onDismiss={() => setError("")}
              className="mb-0"
            />
          </div>
        )}

        {/* MOBILE CARD VIEW (< md screens) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-28 bg-slate-100 rounded" />
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No users found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filter tags.</p>
            </div>
          ) : (
            paginatedUsers.map((user) => (
              <div key={user._id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{user.username}</p>
                      <button
                        onClick={() => handleCopyId(user._id)}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-slate-700 mt-0.5"
                        title="Copy User ID"
                      >
                        <span>ID: {user._id.slice(0, 8)}...</span>
                        {copiedId === user._id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-300" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      user.role === "admin"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {user.role === "admin" ? (
                      <ShieldAlert className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <User className="w-3 h-3 text-slate-500" />
                    )}
                    {user.role === "admin" ? "Admin" : "User"}
                  </span>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100/80">
                  <span className="inline-flex items-center gap-1 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 text-slate-600">
                    <Car className="w-3 h-3 text-indigo-500" />
                    {user.vehicleCount ?? 0} Vehicle{(user.vehicleCount ?? 0) !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Joined {formatDateNice(user.createdAt)}
                  </span>
                </div>

                {/* Status Toggle & Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleBlock(user)}
                      disabled={togglingId === user._id || user.role === "admin"}
                      title={
                        user.role === "admin"
                          ? "Cannot block an administrator"
                          : user.isBlock
                          ? "Click to unblock user"
                          : "Click to block user"
                      }
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                        user.isBlock ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                          user.isBlock ? "translate-x-4.5" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span
                      className={`text-[11px] font-bold ${
                        user.isBlock ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {user.isBlock ? "Blocked" : "Active"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-indigo-600 transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setDeletingUser(user);
                        setDeleteError("");
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP / TABLET DATA TABLE (>= md screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">User / Account</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Assigned Vehicles</th>
                <th className="py-3.5 px-6">Joined On</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-28 bg-slate-100 rounded" />
                          <div className="h-3 w-16 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-20 bg-slate-100 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-24 bg-slate-100 rounded-md" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-slate-100 rounded" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-5 w-16 bg-slate-100 rounded-full mx-auto" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-6 w-14 bg-slate-100 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No users found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search || roleFilter !== "all" || statusFilter !== "all"
                        ? "Try clearing filters to see all users."
                        : "Click '+ Add User' to create the first account."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/70 transition-colors group">
                    {/* User info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                          {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{user.username}</p>
                          <button
                            onClick={() => handleCopyId(user._id)}
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-slate-700 mt-0.5"
                            title="Copy User ID"
                          >
                            <span>ID: {user._id.slice(0, 8)}...</span>
                            {copiedId === user._id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          user.role === "admin"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {user.role === "admin" ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        {user.role === "admin" ? "Administrator" : "Standard User"}
                      </span>
                    </td>

                    {/* Vehicle Count */}
                    <td className="px-6 py-4 text-slate-700">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Car className="w-3.5 h-3.5 text-indigo-500" />
                        {user.vehicleCount ?? 0} Vehicle{(user.vehicleCount ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {formatDateNice(user.createdAt)}
                    </td>

                    {/* Status Toggle Switch */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleBlock(user)}
                          disabled={togglingId === user._id || user.role === "admin"}
                          title={
                            user.role === "admin"
                              ? "Cannot block an administrator"
                              : user.isBlock
                              ? "Click to unblock user"
                              : "Click to block user"
                          }
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                            user.isBlock ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                              user.isBlock ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-bold w-14 text-left ${
                            user.isBlock ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {user.isBlock ? "Blocked" : "Active"}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit User & Credentials"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setDeletingUser(user);
                            setDeleteError("");
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer: Responsive */}
        {!loading && filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-slate-50/70 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500 order-2 sm:order-1">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <span className="hidden sm:inline">
                • {filteredUsers.length} total users
              </span>
            </div>

            <div className="flex items-center gap-1 order-1 sm:order-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-xs font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Create New User</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="e.g. rahul_sharma"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Role
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as "user" | "admin")}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800"
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Initial Status
                  </label>
                  <select
                    value={addIsBlock ? "blocked" : "active"}
                    onChange={(e) => setAddIsBlock(e.target.value === "blocked")}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800"
                  >
                    <option value="active">Active (Enabled)</option>
                    <option value="blocked">Blocked (Restricted)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submittingAdd && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Edit className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Edit User Profile</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Reset Password</span>
                  <span className="text-[10px] text-slate-400 font-normal normal-case">Optional</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="New password (minimum 6 characters)"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as "user" | "admin")}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800"
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={editIsBlock ? "blocked" : "active"}
                    onChange={(e) => setEditIsBlock(e.target.value === "blocked")}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800"
                  >
                    <option value="active">Active (Enabled)</option>
                    <option value="blocked">Blocked (Restricted)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete User Account</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to permanently delete the account for{" "}
                <strong className="text-slate-900">{deletingUser.username}</strong>?
                {deletingUser.vehicleCount ? (
                  <span className="block mt-1 text-amber-600 font-medium">
                    Note: This user is assigned to {deletingUser.vehicleCount} vehicle(s) and will be removed from co-ownership.
                  </span>
                ) : null}
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={submittingDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submittingDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {submittingDelete && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete User</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
