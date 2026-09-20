"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Car,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Check,
  Copy,
  Users,
  AlertCircle,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Fuel,
  Gauge,
  Sparkles,
  ExternalLink,
  Power,
  ShieldCheck,
  Calendar,
  Layers,
  Filter,
} from "lucide-react";
import { API_BASE_URL as baseUrl } from "@/lib/api";
import { formatDateNice } from "@/lib/formatters";

interface Owner {
  _id: string;
  username: string;
}

interface VehicleData {
  _id: string;
  name: string;
  plateNumber: string;
  isActive: boolean;
  ownerIds: Owner[];
  notes?: string;
  imageUrl?: string | null;
  fuelType?: "Petrol" | "Diesel" | "Electric" | "Hybrid" | "CNG" | string;
  transmission?: "Manual" | "Automatic" | string;
  seatingCapacity?: number;
  createdAt: string;
  updatedAt?: string;
}

interface UserListItem {
  _id: string;
  username: string;
}

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copiedPlate, setCopiedPlate] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");
  const [fuelFilter, setFuelFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Toggling Status
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Edit Modal State
  const [editingVehicle, setEditingVehicle] = useState<VehicleData | null>(null);
  const [editName, setEditName] = useState("");
  const [editPlateNumber, setEditPlateNumber] = useState("");
  const [editFuelType, setEditFuelType] = useState("Diesel");
  const [editTransmission, setEditTransmission] = useState("Manual");
  const [editSeatingCapacity, setEditSeatingCapacity] = useState(5);
  const [editNotes, setEditNotes] = useState("");
  const [editSelectedOwnerIds, setEditSelectedOwnerIds] = useState<string[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Modal State
  const [deletingVehicle, setDeletingVehicle] = useState<VehicleData | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Fetch Vehicles
  const fetchVehicles = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await fetch(`${baseUrl}/api/admin/vehicles`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to fetch vehicles");
      }
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading vehicles");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch Users List for assignment
  const fetchUsersList = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/admin/users/list`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load users list", err);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchUsersList();
  }, [fetchVehicles, fetchUsersList]);

  // Copy helper
  const handleCopyPlate = (plate: string) => {
    navigator.clipboard.writeText(plate);
    setCopiedPlate(plate);
    setTimeout(() => setCopiedPlate(null), 2000);
  };

  // Toggle Active Status
  const handleToggleActive = async (vehicle: VehicleData) => {
    setTogglingId(vehicle._id);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/admin/vehicles/${vehicle._id}/toggle`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to toggle status");
      }
      const data = await res.json();
      setVehicles((prev) =>
        prev.map((v) => (v._id === vehicle._id ? { ...v, isActive: data.isActive } : v))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (vehicle: VehicleData) => {
    setEditingVehicle(vehicle);
    setEditName(vehicle.name || "");
    setEditPlateNumber(vehicle.plateNumber || "");
    setEditFuelType(vehicle.fuelType || "Diesel");
    setEditTransmission(vehicle.transmission || "Manual");
    setEditSeatingCapacity(vehicle.seatingCapacity || 5);
    setEditNotes(vehicle.notes || "");
    setEditSelectedOwnerIds(vehicle.ownerIds?.map((o) => o._id) || []);
    setEditError("");
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    if (!editName.trim() || !editPlateNumber.trim()) {
      setEditError("Vehicle name and plate number are required");
      return;
    }

    setSubmittingEdit(true);
    setEditError("");

    try {
      const payload = {
        name: editName.trim(),
        plateNumber: editPlateNumber.trim().toUpperCase(),
        fuelType: editFuelType,
        transmission: editTransmission,
        seatingCapacity: Number(editSeatingCapacity),
        notes: editNotes.trim(),
        ownerIds: editSelectedOwnerIds,
      };

      const res = await fetch(`${baseUrl}/api/admin/vehicles/${editingVehicle._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update vehicle");
      }

      setEditingVehicle(null);
      await fetchVehicles(true);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!deletingVehicle) return;
    setSubmittingDelete(true);
    setDeleteError("");

    try {
      const res = await fetch(`${baseUrl}/api/admin/vehicles/${deletingVehicle._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete vehicle");
      }

      setDeletingVehicle(null);
      setVehicles((prev) => prev.filter((v) => v._id !== deletingVehicle._id));
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Toggle owner selection in edit modal
  const toggleOwnerSelection = (userId: string) => {
    setEditSelectedOwnerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Filter and Search Logic
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // Search matching name, plate, or owner username
      const searchLower = search.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        v.name?.toLowerCase().includes(searchLower) ||
        v.plateNumber?.toLowerCase().includes(searchLower) ||
        v.ownerIds?.some((o) => o.username?.toLowerCase().includes(searchLower));

      // Status filter
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? v.isActive === true
          : v.isActive === false;

      // Ownership filter
      const isAssigned = v.ownerIds && v.ownerIds.length > 0;
      const matchesOwnership =
        ownershipFilter === "all"
          ? true
          : ownershipFilter === "assigned"
          ? isAssigned
          : !isAssigned;

      // Fuel filter
      const matchesFuel =
        fuelFilter === "all" ? true : v.fuelType?.toLowerCase() === fuelFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesOwnership && matchesFuel;
    });
  }, [vehicles, search, statusFilter, ownershipFilter, fuelFilter]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredVehicles.length / pageSize) || 1;
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, currentPage, pageSize]);

  // Reset to page 1 if filter results change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, ownershipFilter, fuelFilter, pageSize]);

  // Computed Metrics
  const stats = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter((v) => v.isActive).length;
    const inactive = total - active;
    const assigned = vehicles.filter((v) => v.ownerIds && v.ownerIds.length > 0).length;
    const unassigned = total - assigned;

    return { total, active, inactive, assigned, unassigned };
  }, [vehicles]);

  const hasActiveFilters =
    search !== "" || statusFilter !== "all" || ownershipFilter !== "all" || fuelFilter !== "all";

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setOwnershipFilter("all");
    setFuelFilter("all");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vehicle Fleet</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Admin Portal
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time availability, manage co-owners, and configure fleet operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchVehicles(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Refresh fleet data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <Link
            href="/admin/vehicles/add"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Vehicle</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fleet */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-400 font-medium">vehicles</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
            All registered vehicles
          </div>
        </div>

        {/* Active Fleet */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Power className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{stats.active}</span>
            <span className="text-xs text-slate-400 font-medium">
              ({stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Available for operations
          </div>
        </div>

        {/* Inactive / Maintenance */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Inactive Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{stats.inactive}</span>
            <span className="text-xs text-slate-400 font-medium">vehicles</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400" />
            Deactivated or maintenance
          </div>
        </div>

        {/* Assigned Vehicles */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-violet-700">{stats.assigned}</span>
            <span className="text-xs text-slate-400 font-medium">assigned</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
            {stats.unassigned} unassigned
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold">Failed to load vehicles</p>
              <p className="text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchVehicles()}
            className="px-3 py-1 text-xs font-semibold bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vehicle name, plate number, or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "inactive"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Inactive ({stats.inactive})
            </button>
          </div>
        </div>

        {/* Sub-Filters Row: Ownership & Fuel */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Ownership:</span>
            </div>

            <div className="flex items-center gap-1">
              {[
                { id: "all", label: "All" },
                { id: "assigned", label: `Assigned (${stats.assigned})` },
                { id: "unassigned", label: `Unassigned (${stats.unassigned})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setOwnershipFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                    ownershipFilter === tab.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="h-4 w-px bg-slate-200 mx-1 hidden sm:inline-block" />

            <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <Fuel className="w-3.5 h-3.5 text-slate-400" />
              <span>Fuel:</span>
            </div>

            <select
              value={fuelFilter}
              onChange={(e) => setFuelFilter(e.target.value)}
              className="text-xs py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border-none rounded-lg text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="all">All Fuels</option>
              <option value="Diesel">Diesel</option>
              <option value="Petrol">Petrol</option>
              <option value="Electric">Electric</option>
              <option value="Hybrid">Hybrid</option>
              <option value="CNG">CNG</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Vehicles Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Vehicle</th>
                <th className="py-3.5 px-4">Plate Number</th>
                <th className="py-3.5 px-4">Co-Owner(s)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-32 bg-slate-100 rounded" />
                          <div className="h-3 w-20 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 w-24 bg-slate-100 rounded-md" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-5 w-20 bg-slate-100 rounded-full" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-6 w-16 bg-slate-100 rounded-full mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-24 bg-slate-100 rounded" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="h-8 w-24 bg-slate-100 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
                        <Car className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">No vehicles found</h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        {hasActiveFilters
                          ? "No vehicles match your current search query or active filter criteria."
                          : "You have not registered any vehicles yet."}
                      </p>
                      {hasActiveFilters ? (
                        <button
                          onClick={clearAllFilters}
                          className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <Link
                          href="/admin/vehicles/add"
                          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
                        >
                          + Add Your First Vehicle
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedVehicles.map((vehicle) => {
                  const isToggling = togglingId === vehicle._id;
                  const isCopied = copiedPlate === vehicle.plateNumber;
                  const owners = vehicle.ownerIds || [];

                  return (
                    <tr
                      key={vehicle._id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Vehicle Column */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50/80 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Car className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {vehicle.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {vehicle.fuelType && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  <Fuel className="w-3 h-3 text-slate-400" />
                                  {vehicle.fuelType}
                                </span>
                              )}
                              {vehicle.transmission && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  <Gauge className="w-3 h-3 text-slate-400" />
                                  {vehicle.transmission}
                                </span>
                              )}
                              {vehicle.seatingCapacity && (
                                <span className="text-[11px] font-medium text-slate-400">
                                  {vehicle.seatingCapacity} seats
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plate Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs tracking-wider text-slate-800 bg-slate-100/90 border border-slate-200 px-2.5 py-1 rounded-lg">
                            {vehicle.plateNumber}
                          </span>
                          <button
                            onClick={() => handleCopyPlate(vehicle.plateNumber)}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                            title="Copy plate number"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Co-Owner(s) */}
                      <td className="py-3.5 px-4">
                        {owners.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                            {owners.map((owner) => (
                              <span
                                key={owner._id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                                title={`Owner ID: ${owner._id}`}
                              >
                                <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                                  {owner.username.charAt(0).toUpperCase()}
                                </span>
                                {owner.username}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(vehicle)}
                            disabled={isToggling}
                            className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 cursor-pointer ${
                              vehicle.isActive ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                            title={vehicle.isActive ? "Deactivate vehicle" : "Activate vehicle"}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                                vehicle.isActive ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-xs font-semibold ${
                              vehicle.isActive ? "text-emerald-700" : "text-slate-400"
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            ) : vehicle.isActive ? (
                              "Active"
                            ) : (
                              "Inactive"
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {formatDateNice(vehicle.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <Link
                            href={`/admin/vehicles/${vehicle._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                            title="View Vehicle Dashboard & Metrics"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>

                          {/* Quick Edit */}
                          <button
                            onClick={() => openEditModal(vehicle)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Quick Edit Vehicle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete Vehicle */}
                          <button
                            onClick={() => setDeletingVehicle(vehicle)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && filteredVehicles.length > 0 && (
          <div className="py-3 px-5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="hidden sm:inline-block text-slate-300">|</span>
              <span>
                Showing <strong className="text-slate-700">{(currentPage - 1) * pageSize + 1}</strong>{" "}
                to{" "}
                <strong className="text-slate-700">
                  {Math.min(currentPage * pageSize, filteredVehicles.length)}
                </strong>{" "}
                of <strong className="text-slate-700">{filteredVehicles.length}</strong> vehicles
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="px-2.5 py-1 font-semibold text-xs text-slate-700 bg-white border border-slate-200 rounded-lg">
                Page {currentPage} of {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK EDIT VEHICLE MODAL */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Vehicle</h3>
                  <p className="text-xs text-slate-500">
                    Updating details for {editingVehicle.name} ({editingVehicle.plateNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingVehicle(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Vehicle Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Maruti Suzuki Swift"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Plate Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Plate Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editPlateNumber}
                    onChange={(e) => setEditPlateNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. KL-10-AZ-1234"
                    className="w-full px-3.5 py-2 text-sm font-mono uppercase border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Fuel, Transmission, Seats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Fuel Type
                  </label>
                  <select
                    value={editFuelType}
                    onChange={(e) => setEditFuelType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Transmission
                  </label>
                  <select
                    value={editTransmission}
                    onChange={(e) => setEditTransmission(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Seats
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editSeatingCapacity}
                    onChange={(e) => setEditSeatingCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional operational or maintenance notes..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Assigned Co-Owners */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Assigned Co-Owners ({editSelectedOwnerIds.length} selected)
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
                  {usersList.length === 0 ? (
                    <p className="text-xs text-slate-400">No users found to assign.</p>
                  ) : (
                    usersList.map((user) => {
                      const isSelected = editSelectedOwnerIds.includes(user._id);
                      return (
                        <label
                          key={user._id}
                          onClick={() => toggleOwnerSelection(user._id)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-900 border border-indigo-200"
                              : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                            <span>{user.username}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE VEHICLE CONFIRMATION MODAL */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Delete Vehicle</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-800">{deletingVehicle.name}</strong> (
              <span className="font-mono text-slate-800">{deletingVehicle.plateNumber}</span>)?
            </p>

            {deleteError ? (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <strong>Warning:</strong> Deleting this vehicle is permanent. Active bookings must be
                completed or cancelled before deletion.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submittingDelete}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition-all shadow-sm shadow-rose-200"
              >
                {submittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Vehicle</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
