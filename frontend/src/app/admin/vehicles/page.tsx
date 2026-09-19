"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Car, ChevronRight, Search, RefreshCw, Plus } from "lucide-react";
import { API_BASE_URL as baseUrl } from "@/lib/api";

interface Owner {
  _id: string;
  username: string;
}

interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
  isActive: boolean;
  ownerIds: Owner[];
  createdAt: string;
}

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null); // vehicle id being toggled

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/admin/vehicles`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      const data = await res.json();
      setVehicles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleToggle = async (vehicle: Vehicle) => {
    setToggling(vehicle._id);
    try {
      const res = await fetch(`${baseUrl}/api/admin/vehicles/${vehicle._id}/toggle`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      const data = await res.json();
      setVehicles((prev) =>
        prev.map((v) => (v._id === vehicle._id ? { ...v, isActive: data.isActive } : v))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  };

  const filtered = vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.plateNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Vehicles</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchVehicles}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/admin/vehicles/add"
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or plate number..."
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
                  Vehicle
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Plate Number
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Owner(s)
                </th>
                <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100" />
                        <div className="h-4 w-32 bg-slate-100 rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-6 w-12 bg-slate-100 rounded-full mx-auto" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-8 w-20 bg-slate-100 rounded-lg mx-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <Car className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="font-medium text-slate-500">No vehicles found</p>
                    <p className="text-sm mt-1">
                      {search ? "Try a different search term." : "No vehicles are registered yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((vehicle) => (
                  <tr
                    key={vehicle._id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-800">{vehicle.name}</span>
                      </div>
                    </td>

                    {/* Plate Number */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs tracking-widest">
                        {vehicle.plateNumber}
                      </span>
                    </td>

                    {/* Owners */}
                    <td className="px-6 py-4 text-slate-600">
                      {vehicle.ownerIds && vehicle.ownerIds.length > 0
                        ? vehicle.ownerIds.map((o) => o.username).join(", ")
                        : <span className="text-slate-400 italic">Unassigned</span>}
                    </td>

                    {/* Toggle */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleToggle(vehicle)}
                          disabled={toggling === vehicle._id}
                          title={vehicle.isActive ? "Click to deactivate" : "Click to activate"}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-wait ${
                            vehicle.isActive ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              vehicle.isActive ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span
                          className={`ml-2.5 text-xs font-medium ${
                            vehicle.isActive ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          {vehicle.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>

                    {/* Details Button */}
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/vehicles/${vehicle._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        Details
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
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
            Showing {filtered.length} of {vehicles.length} vehicles
          </div>
        )}
      </div>
    </div>
  );
}
