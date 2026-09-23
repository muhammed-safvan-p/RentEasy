"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  X,
  Car,
  Fuel,
  Users,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  ShieldCheck,
  Check,
  Sliders,
  FileText,
  Image as ImageIcon,
  Gauge,
  Plus,
  Minus,
} from "lucide-react";
import { api } from "@/lib/api";
import { Vehicle } from "@/types";

interface UserItem {
  _id: string;
  username: string;
}

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSuccess: (updatedVehicle: Vehicle) => void;
  isStandalone?: boolean;
}

const FUEL_TYPES = [
  { value: "Diesel", label: "Diesel", icon: "🛢️", color: "amber" },
  { value: "Petrol", label: "Petrol", icon: "⛽", color: "rose" },
  { value: "Electric", label: "Electric", icon: "⚡", color: "emerald" },
  { value: "Hybrid", label: "Hybrid", icon: "🔋", color: "blue" },
  { value: "CNG", label: "CNG", icon: "💨", color: "teal" },
];

const TRANSMISSION_TYPES = [
  { value: "Manual", label: "Manual", icon: "🕹️" },
  { value: "Automatic", label: "Automatic", icon: "⚡" },
];

const SEATING_PRESETS = [4, 5, 7, 8];

export const EditVehicleModal: React.FC<EditVehicleModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
  isStandalone = false,
}) => {
  const [name, setName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [fuelType, setFuelType] = useState("Diesel");
  const [transmission, setTransmission] = useState("Manual");
  const [seatingCapacity, setSeatingCapacity] = useState<number>(5);
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [ownerIds, setOwnerIds] = useState<string[]>([]);

  // Users data for owner assignment
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");

  // Form submission state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);

  // Initialize form when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setName(vehicle.name || "");
      setPlateNumber(vehicle.plateNumber || "");
      setFuelType(vehicle.fuelType || "Diesel");
      setTransmission(vehicle.transmission || "Manual");
      setSeatingCapacity(vehicle.seatingCapacity !== undefined ? vehicle.seatingCapacity : 5);
      setImageUrl(vehicle.imageUrl || "");
      setIsActive(vehicle.isActive !== undefined ? vehicle.isActive : true);
      setNotes(vehicle.notes || "");

      const extractedOwners = vehicle.ownerIds
        ? vehicle.ownerIds.map((o) => (typeof o === "object" && o?._id ? o._id : String(o)))
        : [];
      setOwnerIds(extractedOwners);
      setImageError(false);
      setError("");
    }
  }, [vehicle]);

  // Load system users for ownership assignment
  useEffect(() => {
    if (!isOpen && !isStandalone) return;
    let isMounted = true;
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const data = await api.get<UserItem[]>("/api/admin/users/list").catch(() => [] as UserItem[]);
        if (isMounted) setUsers(data || []);
      } catch {
        // ignore
      } finally {
        if (isMounted) setUsersLoading(false);
      }
    };
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [isOpen, isStandalone]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen || isStandalone) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isStandalone]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle?._id) return;

    if (!name.trim()) {
      setError("Vehicle name cannot be blank.");
      return;
    }

    if (!plateNumber.trim()) {
      setError("License plate number cannot be blank.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        plateNumber: plateNumber.trim().toUpperCase(),
        fuelType,
        transmission,
        seatingCapacity: Number(seatingCapacity) || 5,
        imageUrl: imageUrl.trim() || null,
        isActive,
        notes: notes.trim(),
        ownerIds,
      };

      const updated = await api.put<Vehicle>(`/api/admin/vehicles/${vehicle._id}`, payload);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update vehicle.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen && !isStandalone) return null;

  const content = (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Modal / Card Header */}
      <div className="px-6 py-5 border-b border-slate-200/80 bg-slate-50/75 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Edit Vehicle Information</span>
            </h2>
            <p className="text-xs text-slate-500">
              Update fleet profile, specifications, and assigned owners
            </p>
          </div>
        </div>

        {!isStandalone && (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Modal Scrollable Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-7">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Identity & Plate Section with Live HSRP Preview */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Primary Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vehicle Name */}
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
            </div>

            {/* License Plate Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Plate Registration Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                placeholder="e.g. KL 10 AZ 4500"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-mono font-bold uppercase tracking-wider text-slate-900"
              />
            </div>
          </div>

          {/* Live Indian HSRP License Plate Preview Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/50 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              {/* Realistic HSRP Plate */}
              <div className="inline-flex items-center bg-slate-100 rounded-lg border-2 border-slate-300 shadow-sm overflow-hidden">
                <div className="bg-[#002244] px-2 py-1 flex flex-col items-center justify-center text-white border-r border-blue-900">
                  <div className="w-2 h-2 rounded-full border border-yellow-400 mb-0.5 flex items-center justify-center">
                    <div className="w-0.5 h-0.5 bg-yellow-400 rounded-full" />
                  </div>
                  <span className="text-[8px] font-black tracking-tighter leading-none text-blue-100">
                    IND
                  </span>
                </div>
                <div className="px-3.5 py-1 font-mono font-black text-slate-900 text-sm tracking-widest uppercase">
                  {plateNumber.trim() || "ENTER PLATE"}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-200">
                  {name.trim() || "Vehicle Preview"}
                </p>
                <p className="text-[10px] text-slate-400">Live Indian HSRP Standard View</p>
              </div>
            </div>

            {/* Quick Active Badge Preview */}
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                }`}
              >
                {isActive ? "Active Fleet" : "Inactive Fleet"}
              </span>
            </div>
          </div>
        </section>

        {/* 2. Fleet Active/Inactive Status Toggle */}
        <section className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Operational Fleet Status
          </label>
          <div
            onClick={() => setIsActive(!isActive)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
              isActive
                ? "bg-emerald-50/60 border-emerald-200 hover:border-emerald-300"
                : "bg-slate-50 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isActive ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {isActive ? "Vehicle is Active in Fleet" : "Vehicle is Inactive (Grounded)"}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isActive ? "Bookable" : "Hidden"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isActive
                    ? "Vehicle is available for new bookings and appears in user garage."
                    : "Vehicle cannot be booked by users and is marked unavailable."}
                </p>
              </div>
            </div>

            {/* Toggle Pill */}
            <div
              className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                isActive ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  isActive ? "translate-x-5.5" : "translate-x-0"
                }`}
              />
            </div>
          </div>
        </section>

        {/* 3. Specifications (Fuel, Transmission, Seating) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Gauge className="w-3.5 h-3.5 text-indigo-600" />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Transmission Segmented Pill */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Transmission</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
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

            {/* Seating Capacity with Presets & Stepper */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Seating Capacity ({seatingCapacity} seats)
              </label>
              <div className="flex items-center gap-2">
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
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Vehicle Imagery with Live Card Preview */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Vehicle Photo & Imagery</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Direct Image URL
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
                  onClick={() => setImageUrl("")}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Live Image Thumbnail Preview */}
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
                  ? "Image will be rendered in customer booking and public garage."
                  : "Provide a valid HTTP/HTTPS image URL to show the vehicle photo."}
              </p>
            </div>
          </div>
        </section>

        {/* 5. Assigned Owners (Searchable Multi-Select) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Assigned Owners ({ownerIds.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllOwners}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Select all
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={handleClearAllOwners}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Selected Owners Badges */}
          {ownerIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/80">
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
              placeholder="Search user by username..."
              className="w-full text-xs pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800"
            />
          </div>

          {/* Scrollable User Checkbox List */}
          <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-slate-100 bg-white">
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
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800">{u.username}</span>
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
        </section>

        {/* 6. Administrative Notes */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Administrative Remarks & Notes</span>
          </div>

          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal vehicle documentation, service notes, or tracking info..."
            className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800"
            maxLength={2000}
          />
          <div className="flex justify-end">
            <span className="text-[10px] text-slate-400">{notes.length}/2000 characters</span>
          </div>
        </section>

        {/* Modal Action Buttons */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm py-3 -mx-6 px-6 shadow-t">
          {!isStandalone && (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Vehicle Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
};
