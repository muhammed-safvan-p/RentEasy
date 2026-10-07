"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Car,
  ArrowLeft,
  Sliders,
  Gauge,
  ImageIcon,
  Users,
  FileText,
  Wallet,
  IndianRupee,
  Plus,
  Minus,
  Check,
  X,
  Search,
  Save,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Building2,
  Banknote,
} from "lucide-react";
import { api } from "@/lib/api";
import { ErrorBanner } from "@/components/common/ErrorBanner";

interface UserItem {
  _id: string;
  username: string;
  email?: string;
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

export default function AddVehiclePage() {
  const router = useRouter();

  // Form fields
  const [name, setName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [fuelType, setFuelType] = useState("Diesel");
  const [transmission, setTransmission] = useState("Manual");
  const [seatingCapacity, setSeatingCapacity] = useState<number>(5);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [initialCashBalance, setInitialCashBalance] = useState("");
  const [initialBankBalance, setInitialBankBalance] = useState("");
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Users data
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [ownerSearch, setOwnerSearch] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState(false);

  // Fetch users for owner assignment
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const data = await api.get<UserItem[]>("/api/admin/users/list");
        if (isMounted) {
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setUsers([]);
        }
      } finally {
        if (isMounted) setUsersLoading(false);
      }
    };
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered users for owner assignment search
  const filteredUsers = useMemo(() => {
    if (!ownerSearch.trim()) return users;
    const q = ownerSearch.toLowerCase();
    return users.filter((u) => u.username.toLowerCase().includes(q));
  }, [users, ownerSearch]);

  const toggleOwner = (userId: string) => {
    setOwnerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllOwners = () => {
    setOwnerIds(users.map((u) => u._id));
  };

  const handleClearAllOwners = () => {
    setOwnerIds([]);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all fields?")) {
      setName("");
      setPlateNumber("");
      setFuelType("Diesel");
      setTransmission("Manual");
      setSeatingCapacity(5);
      setImageUrl("");
      setImageError(false);
      setInitialCashBalance("");
      setInitialBankBalance("");
      setOwnerIds([]);
      setNotes("");
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Vehicle name cannot be blank.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!plateNumber.trim()) {
      setError("Registration plate number is required.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        plateNumber: plateNumber.trim().toUpperCase(),
        fuelType,
        transmission,
        seatingCapacity: Number(seatingCapacity) || 5,
        imageUrl: imageUrl.trim() || undefined,
        initialCashBalance: initialCashBalance ? Number(initialCashBalance) : 0,
        initialBankBalance: initialBankBalance ? Number(initialBankBalance) : 0,
        ownerIds,
        notes: notes.trim() || undefined,
      };

      await api.post("/api/admin/vehicles", payload);
      setSuccessNotice(true);

      setTimeout(() => {
        router.push("/admin/vehicles");
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create vehicle.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSubmitting(false);
    }
  };

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
            <span className="text-slate-600">Register New Vehicle</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
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

          <Link
            href="/admin/vehicles"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </Link>

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
      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => setError("")}
          className="shadow-sm"
        />
      )}

      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Vehicle registered successfully! Redirecting to fleet manager...</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Comprehensive Form */}
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
                {/* Authentic HSRP Badge */}
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
              {/* Transmission Segmented Pill */}
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

              {/* Seating Capacity Stepper with Presets */}
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

                  {/* Quick Presets */}
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

          {/* Card 3: Opening Accounting & Financial Balances */}
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

            <p className="text-xs text-slate-500">
              Set starting opening balances for this vehicle&apos;s ledger accounts. These will automatically seed
              cash and bank transaction entries upon creation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Initial Cash Balance */}
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
                <p className="text-[10px] text-slate-400">Cash stored in vehicle glovebox / fleet depot</p>
              </div>

              {/* Initial Bank Balance */}
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
                <p className="text-[10px] text-slate-400">Dedicated bank balance associated with vehicle</p>
              </div>
            </div>
          </div>

          {/* Card 4: Vehicle Imagery */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>Vehicle Photo & Imagery</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Direct Web Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImageError(false);
                  }}
                  placeholder="https://images.unsplash.com/... or cloud image URL"
                  className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800"
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl("");
                      setImageError(false);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Thumbnail Preview Banner */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-4">
              <div className="w-24 h-16 rounded-xl bg-slate-200 overflow-hidden relative border border-slate-300/80 shrink-0 flex items-center justify-center">
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
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Car className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {imageUrl && !imageError ? "Photo Loaded Successfully" : "No Photo Preview"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {imageError
                    ? "Failed to load image from given URL. Check URL validity."
                    : imageUrl
                    ? "Image will be rendered in customer booking and public fleet garage."
                    : "Provide a valid image URL to display the vehicle in listings."}
                </p>
              </div>
            </div>
          </div>

          {/* Card 5: Assigned Owners (Modern Searchable Multi-Select) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Assigned Owners ({ownerIds.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllOwners}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  Select all
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={handleClearAllOwners}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Selected Owner Badges */}
            {ownerIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                {ownerIds.map((id) => {
                  const userObj = users.find((u) => u._id === id);
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

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
                placeholder="Search registered users by username..."
                className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800"
              />
            </div>

            {/* Scrollable User Checkbox List */}
            <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
              {usersLoading ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Loading users...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No users found matching &ldquo;{ownerSearch}&rdquo;
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isChecked = ownerIds.includes(u._id);
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
                          <span className="font-semibold text-slate-800 block">
                            {u.username}
                          </span>
                          {u.email && (
                            <span className="text-[10px] text-slate-400">{u.email}</span>
                          )}
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

          {/* Bottom Action Footer Bar */}
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
              <Link
                href="/admin/vehicles"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </Link>

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
            {/* Live Vehicle Showcase Card */}
            <div className="p-5 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Live Fleet Showcase
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Active Upon Creation
                </span>
              </div>

              {/* Vehicle Photo Banner */}
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

              {/* Title & Plate in Showcase */}
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                  {name.trim() || "Vehicle Name & Model"}
                </h3>

                {/* HSRP Preview in Showcase */}
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

            {/* Showcase Quick Specs */}
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

              {/* Balances Summary */}
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

              {/* Assigned Owners Summary */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Assigned Owners:</span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {ownerIds.length} {ownerIds.length === 1 ? "Owner" : "Owners"}
                  </span>
                </div>
                {ownerIds.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No owners selected yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {ownerIds.slice(0, 5).map((id) => {
                      const userObj = users.find((u) => u._id === id);
                      return (
                        <span
                          key={id}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {userObj?.username || id.slice(0, 6)}
                        </span>
                      );
                    })}
                    {ownerIds.length > 5 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                        +{ownerIds.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Registration Readiness Checklist */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Readiness Checklist
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    {name.trim() ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    )}
                    <span className={name.trim() ? "text-slate-700 font-medium" : "text-slate-400"}>
                      Vehicle Name
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {plateNumber.trim() ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    )}
                    <span className={plateNumber.trim() ? "text-slate-700 font-medium" : "text-slate-400"}>
                      Registration Plate Number
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
