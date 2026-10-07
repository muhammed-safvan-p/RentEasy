"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Power,
  Filter,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDateNice } from "@/lib/formatters";
import { Vehicle } from "@/types";
import { EditVehicleModal } from "@/components/admin/vehicles/EditVehicleModal";

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Delete Modal State
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Fetch Vehicles
  const fetchVehicles = useCallback(async () => {
    try {
      const data = await api.get<Vehicle[]>("/api/admin/vehicles");
      setVehicles(Array.isArray(data) ? data : []);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading vehicles");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVehicles();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchVehicles]);

  // Copy helper
  const handleCopyPlate = (plate: string) => {
    navigator.clipboard.writeText(plate);
    setCopiedPlate(plate);
    setTimeout(() => setCopiedPlate(null), 2000);
  };

  // Toggle Active Status
  const handleToggleActive = async (vehicle: Vehicle) => {
    setTogglingId(vehicle._id);
    setError("");
    try {
      const data = await api.patch<{ isActive: boolean }>(`/api/admin/vehicles/${vehicle._id}/toggle`);
      setVehicles((prev) =>
        prev.map((v) => (v._id === vehicle._id ? { ...v, isActive: data.isActive } : v))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating vehicle status");
    } finally {
      setTogglingId(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
  };

  // Handle Delete Confirmation Submit
  const handleDeleteSubmit = async () => {
    if (!deletingVehicle) return;
    setSubmittingDelete(true);
    setDeleteError("");

    try {
      await api.delete(`/api/admin/vehicles/${deletingVehicle._id}`);
      setVehicles((prev) => prev.filter((v) => v._id !== deletingVehicle._id));
      setDeletingVehicle(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete vehicle");
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // 1. Search Query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = v.name?.toLowerCase().includes(query);
        const matchesPlate = v.plateNumber?.toLowerCase().includes(query);
        const matchesOwner = v.ownerIds?.some((o) =>
          typeof o === "object" && o?.username
            ? o.username.toLowerCase().includes(query)
            : false
        );

        if (!matchesName && !matchesPlate && !matchesOwner) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === "active" && !v.isActive) return false;
      if (statusFilter === "inactive" && v.isActive) return false;

      // 3. Ownership Filter
      if (ownershipFilter === "assigned" && (!v.ownerIds || v.ownerIds.length === 0)) return false;
      if (ownershipFilter === "unassigned" && v.ownerIds && v.ownerIds.length > 0) return false;

      // 4. Fuel Filter
      if (fuelFilter !== "all") {
        if (!v.fuelType || v.fuelType.toLowerCase() !== fuelFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [vehicles, search, statusFilter, ownershipFilter, fuelFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredVehicles.length / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }
  const paginatedVehicles = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, safePage, pageSize]);

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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
              Vehicle Fleet
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Admin Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Monitor real-time availability, manage co-owners, and configure fleet operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={() => {
              setRefreshing(true);
              setError("");
              fetchVehicles();
            }}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh fleet data"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <Link
            href="/admin/vehicles/add"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-200 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Vehicle</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Strip: 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Fleet */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">vehicles</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <span className="truncate">All registered fleet</span>
          </div>
        </div>

        {/* Active Fleet */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Power className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.active}</span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
              ({stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-xs text-emerald-600">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Available to book</span>
          </div>
        </div>

        {/* Inactive / Maintenance */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Inactive
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold text-rose-600">{stats.inactive}</span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">vehicles</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span className="truncate">Grounded / maintenance</span>
          </div>
        </div>

        {/* Assigned Vehicles */}
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2.5 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold text-violet-700">{stats.assigned}</span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">assigned</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
            <span className="truncate">{stats.unassigned} unassigned</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vehicle name, plate number, or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
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
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
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
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
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
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
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
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Vehicles Container Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* MOBILE CARD VIEW (< md screens) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))
          ) : error && vehicles.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">Failed to load vehicles</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  fetchVehicles();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
              >
                Retry
              </button>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No vehicles found</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {hasActiveFilters
                  ? "No vehicles match your active search or filters."
                  : "You have not registered any vehicles yet."}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearAllFilters}
                  className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-xl"
                >
                  Clear Filters
                </button>
              ) : (
                <Link
                  href="/admin/vehicles/add"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
                >
                  + Add First Vehicle
                </Link>
              )}
            </div>
          ) : (
            paginatedVehicles.map((vehicle) => {
              const isToggling = togglingId === vehicle._id;
              const isCopied = copiedPlate === vehicle.plateNumber;
              const owners = vehicle.ownerIds || [];

              return (
                <div key={vehicle._id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden relative border border-slate-200 shrink-0 flex items-center justify-center">
                        {vehicle.imageUrl ? (
                          <Image
                            src={vehicle.imageUrl}
                            alt={vehicle.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <Car className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/vehicles/${vehicle._id}`}
                          className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors block truncate"
                        >
                          {vehicle.name}
                        </Link>

                        {/* HSRP Plate */}
                        <div className="inline-flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-[11px] tracking-wider text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {vehicle.plateNumber}
                          </span>
                          <button
                            onClick={() => handleCopyPlate(vehicle.plateNumber)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                            title="Copy plate"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Active Toggle Switch */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleActive(vehicle)}
                        disabled={isToggling}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 cursor-pointer ${
                          vehicle.isActive ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={vehicle.isActive ? "Deactivate" : "Activate"}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                            vehicle.isActive ? "translate-x-4.5" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span
                        className={`text-[10px] font-bold ${
                          vehicle.isActive ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        {isToggling ? "..." : vehicle.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* Specs & Owners Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {vehicle.fuelType && (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {vehicle.fuelType}
                        </span>
                      )}
                      {vehicle.transmission && (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {vehicle.transmission}
                        </span>
                      )}
                      {vehicle.seatingCapacity && (
                        <span className="text-[10px] text-slate-400">
                          {vehicle.seatingCapacity} seats
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {owners.length > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          <Users className="w-3 h-3" />
                          {owners.length} {owners.length === 1 ? "Owner" : "Owners"}
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-[10px] font-medium">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Link
                      href={`/admin/vehicles/${vehicle._id}`}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors border border-indigo-100"
                    >
                      Dashboard & Details
                    </Link>

                    <button
                      onClick={() => openEditModal(vehicle)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setDeletingVehicle(vehicle)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP / TABLET DATA TABLE (>= md screens) */}
        <div className="hidden md:block overflow-x-auto">
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
              ) : error && vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 px-4 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">Failed to load vehicles</h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setLoading(true);
                          setError("");
                          fetchVehicles();
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Loading
                      </button>
                    </div>
                  </td>
                </tr>
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
                          className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <Link
                          href="/admin/vehicles/add"
                          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer"
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
                              <Link
                                href={`/admin/vehicles/${vehicle._id}`}
                                className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors"
                              >
                                {vehicle.name}
                              </Link>
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
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 cursor-pointer"
                            title="View Vehicle Dashboard & Metrics"
                          >
                            <span>Details</span>
                          </Link>

                          {/* Quick Edit */}
                          <button
                            onClick={() => openEditModal(vehicle)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Quick Edit Vehicle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete Vehicle */}
                          <button
                            onClick={() => setDeletingVehicle(vehicle)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

        {/* Pagination Bar: Responsive */}
        {!loading && filteredVehicles.length > 0 && (
          <div className="py-3 px-4 sm:px-5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="hidden sm:inline-block text-slate-300">|</span>
              <span className="text-[11px] sm:text-xs">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredVehicles.length)} of {filteredVehicles.length} vehicles
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1 order-1 sm:order-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2.5 font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700 cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* UNIFIED EDIT VEHICLE MODAL */}
      <EditVehicleModal
        isOpen={!!editingVehicle}
        onClose={() => setEditingVehicle(null)}
        vehicle={editingVehicle}
        onSuccess={async () => {
          setEditingVehicle(null);
          await fetchVehicles();
        }}
      />

      {/* DELETE VEHICLE CONFIRMATION MODAL */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Delete Vehicle</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
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
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submittingDelete}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition-all shadow-sm shadow-rose-200 cursor-pointer"
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
