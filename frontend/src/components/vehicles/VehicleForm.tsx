"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Car,
  ArrowLeft,
  Sliders,
  Gauge,
  ImageIcon,
  Users,
  FileText,
  Wallet,
  Plus,
  Minus,
  Check,
  X,
  Search,
  Save,
  Loader2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Building2,
  Banknote,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useVehicleData";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { VehicleImageUploader } from "@/components/common/VehicleImageUploader";
import { FUEL_TYPES, TRANSMISSION_TYPES, SEATING_PRESETS } from "./constants";

export interface VehicleFormData {
  name: string;
  plateNumber: string;
  fuelType: string;
  transmission: string;
  seatingCapacity: number;
  imageUrl?: string;
  initialCashBalance: number;
  initialBankBalance: number;
  ownerIds: string[];
  notes?: string;
}

interface UserListItem {
  _id: string;
  username: string;
  email?: string;
}

export interface VehicleFormProps {
  mode: "admin" | "user";
  onSubmit: (data: VehicleFormData) => Promise<void>;
  submitting: boolean;
  successNotice: boolean;
  error?: string;
  onErrorDismiss?: () => void;
  onCancel?: () => void;
}

export function VehicleForm({
  mode,
  onSubmit,
  submitting,
  successNotice,
  error = "",
  onErrorDismiss,
  onCancel,
}: VehicleFormProps) {
  const { user: currentUser } = useCurrentUser();

  // Core Form Fields
  const [name, setName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [fuelType, setFuelType] = useState("Diesel");
  const [transmission, setTransmission] = useState("Manual");
  const [seatingCapacity, setSeatingCapacity] = useState<number>(5);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [initialCashBalance, setInitialCashBalance] = useState("");
  const [initialBankBalance, setInitialBankBalance] = useState("");
  const [notes, setNotes] = useState("");

  // Owners / Access List State
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  // Admin selected owners vs User additional owners
  const [adminOwnerIds, setAdminOwnerIds] = useState<string[]>([]);
  const [additionalUserIds, setAdditionalUserIds] = useState<string[]>([]);

  // Computed selected users for User mode
  const userModeSelectedIds = useMemo(
    () => (currentUser?._id ? [currentUser._id, ...additionalUserIds] : additionalUserIds),
    [currentUser, additionalUserIds]
  );

  // Fetch users list depending on mode
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const endpoint = mode === "admin" ? "/api/admin/users/list" : "/api/user/users/list";
        const data = await api.get<UserListItem[]>(endpoint);
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
  }, [mode]);

  // Search filtered users
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (mode === "admin") {
      if (!q) return usersList;
      return usersList.filter((u) => u.username.toLowerCase().includes(q));
    } else {
      const others = currentUser ? usersList.filter((u) => u._id !== currentUser._id) : usersList;
      if (!q) return others;
      return others.filter((u) => u.username.toLowerCase().includes(q));
    }
  }, [mode, usersList, userSearch, currentUser]);

  const toggleOwner = (userId: string) => {
    if (mode === "admin") {
      setAdminOwnerIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    } else {
      if (currentUser && userId === currentUser._id) return;
      setAdditionalUserIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleSelectAllAdmin = () => {
    setAdminOwnerIds(usersList.map((u) => u._id));
  };

  const handleClearAll = () => {
    if (mode === "admin") {
      setAdminOwnerIds([]);
    } else {
      setAdditionalUserIds([]);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all vehicle fields?")) {
      setName("");
      setPlateNumber("");
      setFuelType("Diesel");
      setTransmission("Manual");
      setSeatingCapacity(5);
      setImageUrl("");
      setImageError(false);
      setInitialCashBalance("");
      setInitialBankBalance("");
      setAdminOwnerIds([]);
      setAdditionalUserIds([]);
      setUserSearch("");
      setNotes("");
      if (onErrorDismiss) onErrorDismiss();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedPlate = plateNumber.trim().toUpperCase();

    if (!trimmedName || trimmedName.length < 2) {
      alert("Vehicle name must be at least 2 characters long.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!trimmedPlate || trimmedPlate.length < 2) {
      alert("Registration plate number is required (min 2 characters).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const trimmedImage = imageUrl.trim();
    if (trimmedImage) {
      const isHttp = /^https?:\/\//i.test(trimmedImage);
      if (!isHttp) {
        alert("Image URL must begin with http:// or https://");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    let cashNum = 0;
    if (initialCashBalance.trim() !== "") {
      const parsed = Number(initialCashBalance);
      if (isNaN(parsed)) {
        alert("Initial cash balance must be a valid number.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      cashNum = parsed;
    }

    let bankNum = 0;
    if (initialBankBalance.trim() !== "") {
      const parsed = Number(initialBankBalance);
      if (isNaN(parsed)) {
        alert("Initial bank balance must be a valid number.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      bankNum = parsed;
    }

    const finalOwners =
      mode === "admin"
        ? adminOwnerIds
        : currentUser
        ? Array.from(new Set([currentUser._id, ...userModeSelectedIds]))
        : userModeSelectedIds;

    const payload: VehicleFormData = {
      name: trimmedName,
      plateNumber: trimmedPlate,
      fuelType,
      transmission,
      seatingCapacity: Number(seatingCapacity) || 5,
      imageUrl: trimmedImage || undefined,
      initialCashBalance: cashNum,
      initialBankBalance: bankNum,
      ownerIds: finalOwners,
      notes: mode === "admin" && notes.trim() ? notes.trim() : undefined,
    };

    await onSubmit(payload);
  };

  // -------------------------------------------------------------
  // ADMIN VARIANT (Light slate back-office theme with 2-column showcase)
  // -------------------------------------------------------------
  if (mode === "admin") {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Top Breadcrumb & Page Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
              <Link
                href="/admin/vehicles"
                className="hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Vehicles Fleet</span>
              </Link>
              <span>/</span>
              <span className="text-slate-600">Add Vehicle</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 shadow-sm">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Add New Vehicle</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    New Fleet Entry
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Register vehicle specifications, license plate, initial opening balances, and owner assignments
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Reset form"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <Link
                href="/admin/vehicles"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </Link>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Vehicle...</span>
                </>
              ) : successNotice ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Created! Redirecting...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Vehicle</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global Alerts */}
        {error && onErrorDismiss && (
          <ErrorBanner message={error} onDismiss={onErrorDismiss} className="shadow-sm" />
        )}

        {successNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Vehicle registered successfully! Redirecting to fleet manager...</span>
          </div>
        )}

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Card 1: Primary Identity & License Plate */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Primary Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Vehicle Name / Model <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Toyota Innova Crysta ZX"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-medium text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Make, model, and trim name</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Registration Plate Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. KL 10 AZ 4500"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-mono font-bold uppercase tracking-wider text-slate-900"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Official state registration format</p>
                </div>
              </div>

              {/* Live Indian HSRP License Plate Preview Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="inline-flex items-center bg-slate-100 rounded-lg border-2 border-slate-300 shadow-md overflow-hidden">
                    <div className="bg-[#002244] px-2.5 py-1.5 flex flex-col items-center justify-center text-white border-r border-blue-900">
                      <div className="w-2.5 h-2.5 rounded-full border border-yellow-400 mb-0.5 flex items-center justify-center">
                        <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                      </div>
                      <span className="text-[8px] font-black tracking-tighter leading-none text-blue-100">
                        IND
                      </span>
                    </div>
                    <div className="px-4 py-1.5 font-mono font-black text-slate-900 text-sm tracking-widest uppercase">
                      {plateNumber.trim() || "ENTER PLATE"}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      {name.trim() || "New Vehicle Preview"}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>Live Indian HSRP Standard View</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Ready to Register
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Specifications & Performance */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                <Gauge className="w-4 h-4 text-indigo-600" />
                <span>Specifications & Performance</span>
              </div>

              {/* Fuel Type Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Fuel Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {FUEL_TYPES.map((f) => {
                    const isSelected = fuelType.toLowerCase() === f.value.toLowerCase();
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setFuelType(f.value)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/25 ring-2 ring-indigo-500/20"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                {/* Transmission */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Transmission</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80">
                    {TRANSMISSION_TYPES.map((t) => {
                      const isSelected = transmission.toLowerCase() === t.value.toLowerCase();
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setTransmission(t.value)}
                          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seating Stepper */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Seating Capacity ({seatingCapacity} seats)
                  </label>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center border border-slate-200 rounded-xl bg-white p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSeatingCapacity((prev) => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                        aria-label="Decrease seats"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-bold text-sm text-slate-900">
                        {seatingCapacity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSeatingCapacity((prev) => Math.min(50, prev + 1))}
                        className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                        aria-label="Increase seats"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {SEATING_PRESETS.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setSeatingCapacity(count)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            seatingCapacity === count
                              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {count} seats
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Opening Balances */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Opening Accounting Balances</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Ledger Setup
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Initial Cash in Hand</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                      ₹
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={initialCashBalance}
                      onChange={(e) => setInitialCashBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Initial Bank Account Balance</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                      ₹
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={initialBankBalance}
                      onChange={(e) => setInitialBankBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-slate-800 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Vehicle Imagery */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>Vehicle Photo &amp; Imagery</span>
              </div>
              <VehicleImageUploader
                currentImageUrl={imageUrl}
                onUploadComplete={(url) => setImageUrl(url)}
                onClear={() => setImageUrl("")}
                disabled={submitting}
                variant="light"
              />
            </div>

            {/* Card 5: Assigned Owners */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Assigned Owners ({adminOwnerIds.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllAdmin}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    Select all
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {adminOwnerIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  {adminOwnerIds.map((id) => {
                    const userObj = usersList.find((u) => u._id === id);
                    const displayName = userObj?.username || `ID: ${id.slice(0, 6)}...`;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold"
                      >
                        <span>{displayName}</span>
                        <button
                          type="button"
                          onClick={() => toggleOwner(id)}
                          className="hover:text-rose-600 text-indigo-400 transition-colors cursor-pointer"
                          aria-label={`Remove owner ${displayName}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search registered users by username..."
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800"
                />
              </div>

              <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                {usersLoading ? (
                  <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Loading users...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No users found matching &ldquo;{userSearch}&rdquo;
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isChecked = adminOwnerIds.includes(u._id);
                    return (
                      <label
                        key={u._id}
                        className={`flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                          isChecked ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px]">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 block">{u.username}</span>
                            {u.email && <span className="text-[10px] text-slate-400">{u.email}</span>}
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOwner(u._id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Card 6: Administrative Notes */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Administrative Remarks & Notes</span>
              </div>

              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal vehicle documentation, insurance policy numbers, fleet location, or maintenance notes..."
                className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800"
                maxLength={2000}
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Optional internal remarks visible to administrators</span>
                <span>{notes.length}/2000 characters</span>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 flex items-center justify-between shadow-sm">
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Reset Form
              </button>

              <div className="flex items-center gap-3">
                {onCancel ? (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                ) : (
                  <Link
                    href="/admin/vehicles"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </Link>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-7 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Vehicle...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Register Vehicle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Right Column: Sticky Live Showcase Card */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6 space-y-5">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden">
              <div className="p-5 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Live Fleet Showcase
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Active Upon Creation
                  </span>
                </div>

                <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/80 overflow-hidden relative shadow-inner flex items-center justify-center">
                  {imageUrl && !imageError ? (
                    <Image
                      src={imageUrl}
                      alt={name || "Vehicle Preview"}
                      fill
                      className="object-cover"
                      onError={() => setImageError(true)}
                      unoptimized
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-500">
                        <Car className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        {name.trim() || "Vehicle Showcase Photo"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Enter an image URL on the left to preview here
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                    {name.trim() || "Vehicle Name & Model"}
                  </h3>

                  <div className="inline-flex items-center bg-slate-50 rounded-lg border-2 border-slate-300 shadow-sm overflow-hidden">
                    <div className="bg-[#002244] px-2 py-1 flex flex-col items-center justify-center text-white border-r border-blue-900">
                      <span className="text-[7px] font-black tracking-tighter leading-none text-blue-100">
                        IND
                      </span>
                    </div>
                    <div className="px-3 py-1 font-mono font-black text-slate-900 text-xs tracking-wider uppercase">
                      {plateNumber.trim() || "KL 00 AA 0000"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Fuel</span>
                    <span className="text-xs font-bold text-slate-800">{fuelType}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Gearbox</span>
                    <span className="text-xs font-bold text-slate-800">{transmission}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Seats</span>
                    <span className="text-xs font-bold text-slate-800">{seatingCapacity} Seater</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                    Opening Ledger Summary
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Cash in Hand:</span>
                    <span className="font-bold text-emerald-700">
                      ₹{initialCashBalance ? Number(initialCashBalance).toLocaleString("en-IN") : "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Bank Balance:</span>
                    <span className="font-bold text-blue-700">
                      ₹{initialBankBalance ? Number(initialBankBalance).toLocaleString("en-IN") : "0.00"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Assigned Owners:</span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {adminOwnerIds.length} {adminOwnerIds.length === 1 ? "Owner" : "Owners"}
                    </span>
                  </div>
                  {adminOwnerIds.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No owners selected yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {adminOwnerIds.slice(0, 5).map((id) => {
                        const userObj = usersList.find((u) => u._id === id);
                        return (
                          <span
                            key={id}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {userObj?.username || id.slice(0, 6)}
                          </span>
                        );
                      })}
                      {adminOwnerIds.length > 5 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                          +{adminOwnerIds.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // USER VARIANT (Modern dark garage theme for mobile/user dashboard)
  // -------------------------------------------------------------
  return (
    <div className="max-w-xl mx-auto space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div>
            <h1 className="text-lg font-bold text-white">Add Vehicle</h1>
            <p className="text-xs text-slate-400">Register a new vehicle to your garage</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={submitting}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Global Alerts */}
      {error && onErrorDismiss && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onErrorDismiss}
            className="text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successNotice && (
        <div className="p-4 mb-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-3 animate-in fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Vehicle added to garage! Redirecting...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Vehicle Identity */}
        <div className="bg-[#1a1a2e] rounded-3xl border border-white/5 p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/5">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-wide uppercase">
                Vehicle Identity
              </h2>
              <p className="text-[10px] text-slate-400">Make, model, registration plate &amp; photo</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Vehicle Name / Model <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Toyota Innova Crysta"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#121222] hover:border-white/20 focus:border-indigo-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
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
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#121222] hover:border-white/20 focus:border-indigo-500 focus:outline-none text-white font-mono font-bold tracking-wider uppercase placeholder-slate-500 transition-colors"
              />
            </div>
          </div>

          <VehicleImageUploader
            currentImageUrl={imageUrl}
            onUploadComplete={(url) => setImageUrl(url)}
            onClear={() => setImageUrl("")}
            disabled={submitting}
            variant="dark"
          />
        </div>

        {/* Section 2: Specifications */}
        <div className="bg-[#1a1a2e] rounded-3xl border border-white/5 p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/5">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Gauge className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-wide uppercase">Specifications</h2>
              <p className="text-[10px] text-slate-400">Fuel type, transmission &amp; seating capacity</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Fuel Type</label>
            <div className="grid grid-cols-3 gap-2">
              {FUEL_TYPES.slice(0, 3).map((f) => {
                const isSelected = fuelType.toLowerCase() === f.value.toLowerCase();
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFuelType(f.value)}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                        : "bg-[#121222] text-slate-300 border-white/10 hover:border-white/20 hover:text-white"
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
                const isSelected = fuelType.toLowerCase() === f.value.toLowerCase();
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFuelType(f.value)}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                        : "bg-[#121222] text-slate-300 border-white/10 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Transmission</label>
            <div className="grid grid-cols-2 gap-2 bg-[#121222] p-1 rounded-xl border border-white/5">
              {TRANSMISSION_TYPES.map((t) => {
                const isSelected = transmission.toLowerCase() === t.value.toLowerCase();
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Seating Capacity ({seatingCapacity} seats)
            </label>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center border border-white/10 rounded-xl bg-[#121222] p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSeatingCapacity((prev) => Math.max(1, prev - 1))}
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
                  onClick={() => setSeatingCapacity((prev) => Math.min(50, prev + 1))}
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
                        : "bg-[#121222] border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Access Control */}
        <div className="bg-[#1a1a2e] rounded-3xl border border-white/5 p-4 sm:p-5 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white tracking-wide uppercase">Access Control</h2>
                <p className="text-[10px] text-slate-400">Select who can manage this vehicle</p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              {userModeSelectedIds.length} Selected
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-200/90 leading-relaxed">
              <span className="font-bold text-amber-300 block mb-0.5">Full Control Notice</span>
              Selected people have complete control over this vehicle — creating bookings, managing wallet balances, and recording transactions.
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-[#121222] hover:border-white/20 focus:border-indigo-500 focus:outline-none text-white placeholder-slate-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
              <span>users list</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="hover:text-slate-200 font-medium cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#121222] divide-y divide-white/5">
            {currentUser && (
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-indigo-500/10 border-b border-indigo-500/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {currentUser.username}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 shrink-0">
                        You
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Creator always has full access</span>
                    </p>
                  </div>
                </div>

                <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 cursor-not-allowed">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
              {usersLoading ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Loading users...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {userSearch ? `No users matching "${userSearch}"` : "No other users found"}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isChecked = userModeSelectedIds.includes(u._id);
                  return (
                    <label
                      key={u._id}
                      className={`flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors cursor-pointer hover:bg-white/5 ${
                        isChecked ? "bg-indigo-500/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#1a1a2e] border border-white/10 text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-200 truncate">{u.username}</span>
                      </div>

                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOwner(u._id)}
                        className="w-4 h-4 text-indigo-600 rounded bg-[#1a1a2e] border-white/20 focus:ring-indigo-500 cursor-pointer shrink-0 ml-2"
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Opening Balances */}
        <div className="bg-[#1a1a2e] rounded-3xl border border-white/5 p-4 sm:p-5 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white tracking-wide uppercase">Opening Balances</h2>
                <p className="text-[10px] text-slate-400">Initial cash &amp; bank ledger balances</p>
              </div>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 shrink-0">
              Wallet Setup
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-[#121222] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>Initial Cash Balance</span>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                  ₹
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={initialCashBalance}
                  onChange={(e) => setInitialCashBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-white/10 bg-[#1a1a2e] text-white text-xs font-semibold focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Negative balance allowed if starting with existing deficit.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#121222] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Initial Bank Balance</span>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                  ₹
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={initialBankBalance}
                  onChange={(e) => setInitialBankBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-white/10 bg-[#1a1a2e] text-white text-xs font-semibold focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Allocated bank balance. Negative values allowed.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 flex items-center gap-3">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-3 rounded-xl border border-white/10 bg-[#1a1a2e] text-center text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="w-1/3 py-3 rounded-xl border border-white/10 bg-[#1a1a2e] text-center text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </Link>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-2/3 btn-primary py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Register Vehicle</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
