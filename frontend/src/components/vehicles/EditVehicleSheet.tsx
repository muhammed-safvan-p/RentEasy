"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Car,
  Save,
  Loader2,
  Search,
  Sliders,
  FileText,
  Gauge,
  Plus,
  Minus,
  Users,
  Lock,
  AlertTriangle,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { mutate } from "swr";
import { api } from "@/lib/api";
import { Vehicle } from "@/types";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { VehicleImageUploader } from "@/components/common/VehicleImageUploader";

interface UserListItem {
  _id: string;
  username: string;
}

interface CurrentUser {
  _id: string;
  username: string;
  role?: string;
}

export type TabType = "specs" | "access" | "notes";

interface EditVehicleSheetProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  currentUser: CurrentUser | null;
  onSuccess: (updatedVehicle: Vehicle) => void;
  initialTab?: TabType;
}

const FUEL_TYPES = [
  { value: "Diesel", label: "Diesel", icon: "🛢️" },
  { value: "Petrol", label: "Petrol", icon: "⛽" },
  { value: "Electric", label: "Electric", icon: "⚡" },
  { value: "Hybrid", label: "Hybrid", icon: "🔋" },
  { value: "CNG", label: "CNG", icon: "💨" },
];

const TRANSMISSION_TYPES = [
  { value: "Manual", label: "Manual", icon: "🕹️" },
  { value: "Automatic", label: "Automatic", icon: "⚡" },
];

const SEATING_PRESETS = [4, 5, 7, 8];

export function EditVehicleSheet({
  isOpen,
  onClose,
  vehicle,
  currentUser,
  onSuccess,
  initialTab = "specs",
}: EditVehicleSheetProps) {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Form fields
  const [name, setName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [fuelType, setFuelType] = useState("Diesel");
  const [transmission, setTransmission] = useState("Manual");
  const [seatingCapacity, setSeatingCapacity] = useState<number>(5);
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Co-owners / access control
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Unsaved changes confirmation dialog
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [prevVehicleKey, setPrevVehicleKey] = useState<string | null>(null);
  const currentKey = isOpen && vehicle ? `${vehicle._id}-${initialTab || "specs"}` : null;

  if (isOpen && vehicle && currentKey !== prevVehicleKey) {
    setPrevVehicleKey(currentKey);
    setName(vehicle.name || "");
    setPlateNumber(vehicle.plateNumber || "");
    setFuelType((vehicle.fuelType as string) || "Diesel");
    setTransmission((vehicle.transmission as string) || "Manual");
    setSeatingCapacity(
      vehicle.seatingCapacity !== undefined ? vehicle.seatingCapacity : 5
    );
    setImageUrl(vehicle.imageUrl || "");
    setNotes(vehicle.notes || "");
    setError("");
    setActiveTab(initialTab || "specs");
    setShowDiscardConfirm(false);

    const extractedOwners = vehicle.ownerIds
      ? vehicle.ownerIds.map((o) =>
          typeof o === "object" && o?._id ? o._id : String(o)
        )
      : [];

    if (currentUser?._id && !extractedOwners.includes(currentUser._id)) {
      setSelectedUserIds([currentUser._id, ...extractedOwners]);
    } else {
      setSelectedUserIds(extractedOwners);
    }
  } else if (!isOpen && prevVehicleKey !== null) {
    setPrevVehicleKey(null);
  }

  // Fetch users list for access control
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const data = await api.get<UserListItem[]>("/api/user/users/list");
        if (isMounted) {
          setUsersList(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) setUsersList([]);
      } finally {
        if (isMounted) setUsersLoading(false);
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Calculate dirty state & change count
  const dirtyFieldsCount = useMemo(() => {
    if (!vehicle) return 0;
    let count = 0;

    if (name.trim() !== (vehicle.name || "").trim()) count++;
    if (plateNumber.trim().toUpperCase() !== (vehicle.plateNumber || "").trim().toUpperCase()) count++;
    if (fuelType !== (vehicle.fuelType || "Diesel")) count++;
    if (transmission !== (vehicle.transmission || "Manual")) count++;
    if (seatingCapacity !== (vehicle.seatingCapacity ?? 5)) count++;
    if (imageUrl.trim() !== (vehicle.imageUrl || "").trim()) count++;
    if (notes.trim() !== (vehicle.notes || "").trim()) count++;

    const initialOwners = vehicle.ownerIds
      ? vehicle.ownerIds.map((o) => (typeof o === "object" && o?._id ? o._id : String(o)))
      : [];

    const currentSorted = [...selectedUserIds].sort().join(",");
    const initialSorted = [...initialOwners].sort().join(",");
    if (currentSorted !== initialSorted) count++;

    return count;
  }, [
    vehicle,
    name,
    plateNumber,
    fuelType,
    transmission,
    seatingCapacity,
    imageUrl,
    notes,
    selectedUserIds,
  ]);

  const isDirty = dirtyFieldsCount > 0;

  // Safe close handler with unsaved changes protection
  const handleRequestClose = useCallback(() => {
    if (submitting) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, submitting, onClose]);

  // Filtered users for search (excluding current user)
  const otherUsers = useMemo(() => {
    if (!currentUser) return usersList;
    return usersList.filter((u) => u._id !== currentUser._id);
  }, [usersList, currentUser]);

  const filteredOtherUsers = useMemo(() => {
    if (!userSearch.trim()) return otherUsers;
    const q = userSearch.toLowerCase().trim();
    return otherUsers.filter((u) => u.username.toLowerCase().includes(q));
  }, [otherUsers, userSearch]);

  const toggleUserAccess = (userId: string) => {
    if (currentUser && userId === currentUser._id) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const removeCoOwner = (userId: string) => {
    if (currentUser && userId === currentUser._id) return;
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleClearOthers = () => {
    if (currentUser) {
      setSelectedUserIds([currentUser._id]);
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleReset = () => {
    if (!vehicle) return;
    setName(vehicle.name || "");
    setPlateNumber(vehicle.plateNumber || "");
    setFuelType(vehicle.fuelType || "Diesel");
    setTransmission(vehicle.transmission || "Manual");
    setSeatingCapacity(vehicle.seatingCapacity ?? 5);
    setImageUrl(vehicle.imageUrl || "");
    setNotes(vehicle.notes || "");
    setError("");

    const extracted = vehicle.ownerIds
      ? vehicle.ownerIds.map((o) =>
          typeof o === "object" && o?._id ? o._id : String(o)
        )
      : [];
    if (currentUser?._id && !extracted.includes(currentUser._id)) {
      setSelectedUserIds([currentUser._id, ...extracted]);
    } else {
      setSelectedUserIds(extracted);
    }
    setShowDiscardConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle?._id) return;

    const trimmedName = name.trim();
    const trimmedPlate = plateNumber.trim().toUpperCase();

    if (!trimmedName || trimmedName.length < 2) {
      setError("Vehicle name must be at least 2 characters long.");
      setActiveTab("specs");
      return;
    }

    if (!trimmedPlate || trimmedPlate.length < 2) {
      setError("Registration plate number is required (min 2 characters).");
      setActiveTab("specs");
      return;
    }

    const trimmedImage = imageUrl.trim();
    if (trimmedImage) {
      const isHttp = /^https?:\/\//i.test(trimmedImage);
      if (!isHttp) {
        setError("Image URL must begin with http:// or https://");
        setActiveTab("notes");
        return;
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const finalOwners = currentUser
        ? Array.from(new Set([currentUser._id, ...selectedUserIds]))
        : selectedUserIds;

      const payload = {
        name: trimmedName,
        plateNumber: trimmedPlate,
        fuelType,
        transmission,
        seatingCapacity: Number(seatingCapacity) || 5,
        imageUrl: trimmedImage || null,
        notes: notes.trim(),
        ownerIds: finalOwners,
      };

      const updated = await api.patch<Vehicle>(
        `/api/user/vehicles/${vehicle._id}`,
        payload
      );

      // Invalidate relevant SWR caches
      await Promise.all([
        mutate("/api/user/vehicles"),
        mutate(`/api/vehicles/${vehicle._id}`),
      ]).catch(() => null);

      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to update vehicle."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg h-[92vh] sm:h-[86vh] bg-[#1a1a2e] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-vehicle-title"
      >
        {/* Mobile Pull Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* 1. Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#16162a]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="edit-vehicle-title"
                className="text-base font-bold text-white tracking-wide truncate"
              >
                {name || vehicle?.name || "Edit Vehicle"}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono text-slate-300 font-semibold uppercase">
                  {plateNumber || vehicle?.plateNumber || "—"}
                </span>
                {isDirty && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-medium">
                      {dirtyFieldsCount} {dirtyFieldsCount === 1 ? "change" : "changes"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                title="Reset all changes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={submitting}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Segmented Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-white/5 bg-[#141426] shrink-0">
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#0f0f1d] rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "specs"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Specs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("access")}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                activeTab === "access"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Access</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/15 font-semibold">
                {selectedUserIds.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "notes"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Media</span>
            </button>
          </div>
        </div>

        {/* 3. Form Body (Tabbed Content) */}
        <form
          id="edit-vehicle-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4"
        >
          {error && (
            <ErrorBanner
              message={error}
              onDismiss={() => setError("")}
              className="shadow-lg"
            />
          )}

          {/* TAB 1: DETAILS & SPECIFICATIONS */}
          {activeTab === "specs" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Vehicle Name & Plate Inputs */}
              <div className="bg-[#121224] rounded-2xl border border-white/5 p-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vehicle Model / Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Toyota Innova Crysta"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#181830] hover:border-white/20 focus:border-indigo-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Registration Plate Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. KL 10 AZ 4500"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#181830] hover:border-white/20 focus:border-indigo-500 focus:outline-none text-white font-mono font-bold tracking-wider uppercase placeholder-slate-500 transition-colors"
                  />
                </div>
              </div>

              {/* Specifications: Fuel, Transmission, Seats */}
              <div className="bg-[#121224] rounded-2xl border border-white/5 p-4 space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Drive Specifications
                  </span>
                </div>

                {/* Fuel Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Fuel Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {FUEL_TYPES.slice(0, 3).map((f) => {
                      const isSelected =
                        fuelType.toLowerCase() === f.value.toLowerCase();
                      return (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setFuelType(f.value)}
                          className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                              : "bg-[#181830] text-slate-300 border-white/10 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <span>{f.icon}</span>
                          <span>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {FUEL_TYPES.slice(3).map((f) => {
                      const isSelected =
                        fuelType.toLowerCase() === f.value.toLowerCase();
                      return (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setFuelType(f.value)}
                          className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                              : "bg-[#181830] text-slate-300 border-white/10 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <span>{f.icon}</span>
                          <span>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Transmission */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Transmission
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-[#181830] p-1 rounded-xl border border-white/5">
                    {TRANSMISSION_TYPES.map((t) => {
                      const isSelected =
                        transmission.toLowerCase() === t.value.toLowerCase();
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setTransmission(t.value)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seating Capacity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Seating Capacity ({seatingCapacity} seats)
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center border border-white/10 rounded-xl bg-[#181830] p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setSeatingCapacity((prev) => Math.max(1, prev - 1))
                        }
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                        aria-label="Decrease seats"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-bold text-sm text-white">
                        {seatingCapacity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSeatingCapacity((prev) => Math.min(50, prev + 1))
                        }
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                        aria-label="Increase seats"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {SEATING_PRESETS.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setSeatingCapacity(count)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            seatingCapacity === count
                              ? "bg-indigo-500/25 border-indigo-500/50 text-indigo-300"
                              : "bg-[#181830] border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACCESS & CO-OWNERS */}
          {activeTab === "access" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Active Co-owners Chip Tray */}
              <div className="bg-[#121224] rounded-2xl border border-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Authorized Team ({selectedUserIds.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleClearOthers}
                    className="text-[11px] text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                  >
                    Reset to self
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Current User Pill */}
                  {currentUser && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-semibold">
                      <Lock className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span>{currentUser.username} (You)</span>
                    </div>
                  )}

                  {/* Selected Other Users Pills */}
                  {selectedUserIds
                    .filter((id) => !currentUser || id !== currentUser._id)
                    .map((id) => {
                      const userObj = usersList.find((u) => u._id === id);
                      const displayName = userObj?.username || "Authorized User";
                      return (
                        <div
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold group hover:border-rose-500/40 transition-colors"
                        >
                          <span>{displayName}</span>
                          <button
                            type="button"
                            onClick={() => removeCoOwner(id)}
                            className="w-4 h-4 rounded-full hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                            title={`Revoke access for ${displayName}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* User Selection & Search */}
              <div className="bg-[#121224] rounded-2xl border border-white/5 p-4 space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Authorized people can view vehicle bookings, transactions, and calendar status.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name..."
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-[#181830] hover:border-white/20 focus:border-indigo-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
                  />
                </div>

                {/* Users List Box */}
                <div className="border border-white/10 rounded-xl overflow-hidden bg-[#181830] divide-y divide-white/5 max-h-48 overflow-y-auto">
                  {usersLoading ? (
                    <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span>Loading team members...</span>
                    </div>
                  ) : filteredOtherUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      {userSearch
                        ? `No users matching "${userSearch}"`
                        : "No other registered accounts found"}
                    </div>
                  ) : (
                    filteredOtherUsers.map((u) => {
                      const isChecked = selectedUserIds.includes(u._id);
                      return (
                        <label
                          key={u._id}
                          className={`flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors cursor-pointer hover:bg-white/5 ${
                            isChecked ? "bg-indigo-500/10" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-[#121224] border border-white/10 text-slate-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-200 truncate">
                              {u.username}
                            </span>
                          </div>

                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleUserAccess(u._id)}
                            className="w-4 h-4 text-indigo-600 rounded bg-[#121224] border-white/20 focus:ring-indigo-500 cursor-pointer shrink-0 ml-2"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MEDIA & OVERVIEW NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-4 animate-in fade-in-50 duration-150">
              {/* Vehicle Photo Upload */}
              <VehicleImageUploader
                currentImageUrl={imageUrl}
                onUploadComplete={(url) => setImageUrl(url)}
                onClear={() => setImageUrl("")}
                disabled={submitting}
                variant="dark"
              />

              {/* Handover & Maintenance Notes */}
              <div className="bg-[#121224] rounded-2xl border border-white/5 p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Overview Instructions & Notes
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Spare tire in trunk; maintenance due at 50,000 km; Fastag account info..."
                  className="w-full bg-[#181830] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </form>

        {/* 4. STICKY ACTION BAR (Always visible at bottom) */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#16162a] shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestClose}
            disabled={submitting}
            className="w-1/3 py-2.5 rounded-xl border border-white/10 bg-[#121224] text-center text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="edit-vehicle-form"
            disabled={submitting || !isDirty}
            className={`w-2/3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isDirty
                ? "btn-primary text-white shadow-lg shadow-indigo-600/30 active:scale-[0.99]"
                : "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : isDirty ? (
              <>
                <Save className="w-4 h-4" />
                <span>
                  Save Changes {dirtyFieldsCount > 0 ? `(${dirtyFieldsCount})` : ""}
                </span>
              </>
            ) : (
              <span>No Changes Made</span>
            )}
          </button>
        </div>

        {/* 5. Unsaved Changes Discard Confirmation Dialog */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#1c1c36] border border-white/15 rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Discard Unsaved Changes?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You have {dirtyFieldsCount} unsaved {dirtyFieldsCount === 1 ? "modification" : "modifications"}. Exiting now will lose all changes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="py-2 px-3 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors shadow-md shadow-rose-600/30"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
